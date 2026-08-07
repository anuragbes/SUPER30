import "dotenv/config";
import Student from "../models/student.models.js";
import Counter from "../models/counter.models.js";
import Settings from "../models/settings.models.js";
import { appendToGoogleSheet } from "../utils/googleSheets.js";
import { logError, logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";
import { uploadBufferToCloudinary, cloudinary } from "../middlewares/upload.js";
import { retryWithBackoff } from "../utils/retryWithBackoff.js";
import { getSubmissionMode } from "../constants/registrationMode.js";
import { recordAuditLog } from "../utils/auditLog.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Fields a student is allowed to submit during registration. Anything else on
// the Student schema (rollNo, admitCardGenerated, admitCardSent,
// admitCardProvider, admitCardSentAt, studentId, submittedAt, clerkUserId, ...)
// is system/admin-managed and must never come from client input. New schema
// fields are excluded by default unless explicitly added here.
export const STUDENT_ALLOWED_FIELDS = [
  "studentName",
  "gender",
  "classMoving",
  "dateOfBirth",
  "stream",
  "target",
  "fatherName",
  "motherName",
  "email",
  "permanentAddress",
  "presentAddress",
  "parentMobile",
  "studentMobile",
  "whatsappMobile",
  "previousSchool",
  "previousResultPercentage",
  "testCentre",
  "studyCentre",
  "scholarshipOffered",
  "scholarshipDetails",
];

// Builds a new object containing only the allow-listed keys present on `source`.
// Iterating the allow-list (not `source`'s own keys) means unexpected keys
// (e.g. `rollNo`, `__proto__`) can never end up on the result.
export const pickAllowedFields = (source = {}, allowedFields) => {
  const picked = {};
  for (const field of allowedFields) {
    if (source[field] !== undefined) {
      picked[field] = source[field];
    }
  }
  return picked;
};

// Escapes regex metacharacters so a string can be safely used as a literal
// substring inside a MongoDB $regex query, instead of being interpreted as a
// regex pattern. Used both for the duplicate-registration check below and
// for the admin search in getAllStudents.
export const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const registerStudent = async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;

    if (!clerkUserId) {
      return rejectRequest(req, res, 401, "missing_clerk_user_id", "Unauthorized");
    }

    // Registration-mode gate: the frontend is not trusted to decide which
    // form is allowed. It can be stale (page left open across an admin's
    // mode switch), it can fail to fetch the current mode and fall back to
    // a hardcoded default, or a client could bypass it entirely (Postman,
    // a modified request, a replayed payload). The database's current
    // Settings.formMode is the only source of truth, checked fresh on every
    // submission, before any file upload or write happens.
    const settings = await Settings.findOne().lean();
    const activeMode = settings?.formMode;

    if (activeMode !== "junior" && activeMode !== "senior") {
      // Settings document missing or its formMode is unset/corrupted --
      // fail closed rather than silently allowing an unverifiable
      // submission through, which is the exact failure mode that caused
      // the incident this check exists to prevent.
      logError("[StudentController] registerStudent - registration mode unavailable",
        new Error(`Settings.formMode is not "junior" or "senior" (got: ${JSON.stringify(activeMode)})`), req);
      return res.status(500).json({ error: "Registration is temporarily unavailable. Please try again shortly." });
    }

    const submissionMode = getSubmissionMode(req.body?.classMoving);

    if (submissionMode && submissionMode !== activeMode) {
      logActivity("REGISTRATION_MODE_MISMATCH", {
        requestId: req.requestId,
        activeMode,
        submittedClassMoving: req.body?.classMoving,
        clerkUserId,
      }, req);
      return rejectRequest(req, res, 400, "registration_mode_mismatch",
        activeMode === "junior"
          ? "Junior registrations are currently open."
          : "Senior registrations are currently open.");
    }

    const duplicateConditions = [];

    if (req.body?.studentName && req.body?.fatherName && req.body?.dateOfBirth) {
      duplicateConditions.push({
        studentName: { $regex: new RegExp(`^${escapeRegex(req.body.studentName.trim())}$`, "i") },
        fatherName: { $regex: new RegExp(`^${escapeRegex(req.body.fatherName.trim())}$`, "i") },
        dateOfBirth: new Date(req.body.dateOfBirth)
      });
    }

    if (duplicateConditions.length > 0) {
      const existingStudent = await Student.findOne({ $or: duplicateConditions }).lean();
      if (existingStudent) {
        logActivity("DUPLICATE_REGISTRATION_ATTEMPT", {
          requestId: req.requestId,
          email: req.body?.email,
          clerkUserId
        }, req);
        return rejectRequest(req, res, 400, "duplicate_registration",
          "You have already registered for this exam");
      }
    }
    const newStudent = new Student({
      ...pickAllowedFields(req.body, STUDENT_ALLOWED_FIELDS),
      clerkUserId,
    });

    if (req.body.previousSchool === "Other" && req.body.customSchool) {
      newStudent.previousSchool = req.body.customSchool;
    }

    // The two uploads read different buffers, write different fields, and
    // share no state -- safe to run concurrently instead of one after the
    // other. Promise.allSettled (not Promise.all) is deliberate: it lets us
    // observe BOTH outcomes even when one rejects, so that if one upload
    // succeeded while the other failed, the successful asset can be deleted
    // before the error propagates -- otherwise it would be orphaned on
    // Cloudinary with nothing that will ever reference it.
    const [passportOutcome, identityOutcome] = await Promise.allSettled([
      req.files?.passportPhoto?.[0]?.buffer
        ? uploadBufferToCloudinary(req.files.passportPhoto[0].buffer, "super30/passport")
        : null,
      req.files?.identityPhoto?.[0]?.buffer
        ? uploadBufferToCloudinary(req.files.identityPhoto[0].buffer, "super30/identity")
        : null,
    ]);

    const passportFailed = passportOutcome.status === "rejected";
    const identityFailed = identityOutcome.status === "rejected";

    if (passportFailed || identityFailed) {
      // Delete whichever upload actually succeeded (value is truthy only
      // when a real upload happened, not when no file was provided at all).
      // Deletion failures are logged, not rethrown -- the same
      // best-effort-cleanup contract already used by deletePoster's
      // Cloudinary cleanup -- so the response the client sees is always the
      // original upload failure, never a cleanup failure.
      if (!passportFailed && passportOutcome.value) {
        try {
          await retryWithBackoff(() => cloudinary.uploader.destroy(passportOutcome.value.public_id));
        } catch (cleanupError) {
          logError("[StudentController] registerStudent - Cloudinary cleanup (passport)", cleanupError, req);
        }
      }
      if (!identityFailed && identityOutcome.value) {
        try {
          await retryWithBackoff(() => cloudinary.uploader.destroy(identityOutcome.value.public_id));
        } catch (cleanupError) {
          logError("[StudentController] registerStudent - Cloudinary cleanup (identity)", cleanupError, req);
        }
      }
      // Preserves the original sequential ordering's error priority: passport
      // was always attempted/thrown first, so if both failed, its error wins.
      throw passportFailed ? passportOutcome.reason : identityOutcome.reason;
    }

    const passportUpload = passportOutcome.value;
    const identityUpload = identityOutcome.value;

    if (passportUpload) {
      newStudent.passportPhotoURL = passportUpload.secure_url;
    } else if (req.files?.passportPhoto?.[0]?.path) {
      // Fallback in case memoryStorage wasn't used correctly
      newStudent.passportPhotoURL = req.files.passportPhoto[0].path;
    }

    if (identityUpload) {
      newStudent.identityPhotoURL = identityUpload.secure_url;
    } else if (req.files?.identityPhoto?.[0]?.path) {
      newStudent.identityPhotoURL = req.files.identityPhoto[0].path;
    }

    await newStudent.save();
    // Best-effort background sync: appendToGoogleSheet fully catches and logs
    // its own errors and its result is never used here, so awaiting it only
    // added Google API round-trip latency to every registration response
    // for no observable benefit.
    appendToGoogleSheet(newStudent);

    logActivity("REGISTER_SUCCESS", {
      requestId: req.requestId,
      studentId: newStudent.studentId,
      email: newStudent.email,
      stream: newStudent.stream || null,
      class: newStudent.classMoving || null,
      target: newStudent.target || null,
    }, req);

    res.status(201).json({
      message: "Registration successful",
      studentId: newStudent.studentId,
    });

  } catch (error) {
    logError("[StudentController] registerStudent", error, req);

    if (error.code === 11000) {
      return rejectRequest(req, res, 400, "duplicate_key_violation",
        "You have already registered for this exam. Multiple submissions are not allowed.");
    }
    res.status(500).json({ error: "Registration failed due to a server error. Please try again or contact support." });
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const { search, stream, classMoving, target, status, page = 1 } = req.query;

    const limit = 50;
    const skip = (page - 1) * limit;

    const query = {};

    // Search
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { studentName: { $regex: escapedSearch, $options: "i" } },
        { studentId: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Stream filter
    if (stream) query.stream = stream;

    // Class filter
    if (classMoving) query.classMoving = classMoving;

    // Target filter
    if (target) query.target = target;

    // Status filter
    if (status === "Generated") {
      query.admitCardGenerated = true;
      query.admitCardSent = { $ne: true };
    } else if (status === "Sent") {
      query.admitCardSent = true;
    } else if (status === "Pending") {
      query.admitCardGenerated = { $ne: true };
      query.admitCardSent = { $ne: true };
    }

    // Total students (for pagination)
    const totalStudents = await Student.countDocuments(query);

    // Paginated result
    const students = await Student.find(query)
      .sort({ studentId: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: students,
      totalStudents,
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    logError("[StudentController] getAllStudents", error, req);
    res.status(500).json({ success: false, message: "Failed to load students. Please try again." });
  }
};




export const resetStudentIdCounter = async (req, res) => {
  try {
    await Counter.updateOne(
      { id: "studentId" },
      { $set: { seq: 0 } },
      { upsert: true }
    );

    await recordAuditLog({
      req,
      action: "STUDENT_ID_COUNTER_RESET",
      resourceType: "Counter",
      resourceId: "studentId",
      summary: "Reset student ID counter to STU0001",
      success: true,
    });

    res.status(200).json({ message: "Student ID counter has been reset to STU0001" });
  } catch (error) {
    logError("[StudentController] resetStudentIdCounter", error, req);
    res.status(500).json({ error: "Failed to reset ID counter" });
  }
};

export const getMyRegistrations = async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;
    if (!clerkUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const students = await Student.find({ clerkUserId }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    logError("[StudentController] getMyRegistrations", error, req);
    res.status(500).json({ success: false, message: "Failed to load your registrations." });
  }
};