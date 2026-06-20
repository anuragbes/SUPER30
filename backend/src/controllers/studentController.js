import "dotenv/config";
import Student from "../models/student.models.js";
import Counter from "../models/counter.models.js";
import { appendToGoogleSheet } from "../utils/googleSheets.js";
import { logError, logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;


export const registerStudent = async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;

    if (!clerkUserId) {
      return rejectRequest(req, res, 401, "missing_clerk_user_id", "Unauthorized");
    }

    const duplicateConditions = [];

    if (req.body?.studentName && req.body?.fatherName && req.body?.dateOfBirth) {
      duplicateConditions.push({
        studentName: { $regex: new RegExp(`^${req.body.studentName.trim()}$`, "i") },
        fatherName: { $regex: new RegExp(`^${req.body.fatherName.trim()}$`, "i") },
        dateOfBirth: new Date(req.body.dateOfBirth)
      });
    }

    if (duplicateConditions.length > 0) {
      const existingStudent = await Student.findOne({ $or: duplicateConditions });
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
      ...req.body,
      clerkUserId,
    });

    if (req.body.previousSchool === "Other" && req.body.customSchool) {
      newStudent.previousSchool = req.body.customSchool;
    }

    if (req.files?.passportPhoto?.[0]?.path) {
      newStudent.passportPhotoURL = req.files.passportPhoto[0].path;
    }

    if (req.files?.identityPhoto?.[0]?.path) {
      newStudent.identityPhotoURL = req.files.identityPhoto[0].path;
    }

    await newStudent.save();
    await appendToGoogleSheet(newStudent);

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

    const limit = 100;
    const skip = (page - 1) * limit;

    const query = {};

    // Search
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
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
      .limit(limit);

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

    const students = await Student.find({ clerkUserId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    logError("[StudentController] getMyRegistrations", error, req);
    res.status(500).json({ success: false, message: "Failed to load your registrations." });
  }
};