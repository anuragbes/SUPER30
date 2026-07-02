import Student from "../models/student.models.js";
import Settings from "../models/settings.models.js";
import { createAdmitCardBuffer } from "./admitCardController.js";
import { formatDateDDMMYYYY } from "../utils/googleSheets.js";
import { sendEmail } from "../services/emailService.js";
import { logError, logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";


//  GENERATE ADMIT CARDS

export const bulkGenerateAdmitCards = async (req, res) => {
  const { selectedStudents } = req.body;

  if (!selectedStudents?.length) {
    return rejectRequest(req, res, 400, "no_students_selected", "No students selected");
  }

  const settings = await Settings.findOne();
  if (!settings?.examDate) {
    return rejectRequest(req, res, 400, "exam_date_not_set", "Please set the exam date.");
  }
  const examDate = formatDateDDMMYYYY(settings.examDate);

  try {
    const students = await Student.find({ studentId: { $in: selectedStudents } });

    const missingRoll = students.filter((s) => !s.rollNo);
    if (missingRoll.length > 0) {
      return rejectRequest(req, res, 400, "missing_roll_numbers",
        "Cannot generate admit cards. Please generate roll numbers first.");
    }

    const generatedStudents = [];

    for (const student of students) {
      if (student.admitCardGenerated) continue;

      await createAdmitCardBuffer(student, examDate);

      student.admitCardGenerated = true;
      await student.save();
      generatedStudents.push(student.studentId);
    }

    logActivity("BulkAdmitCardsGenerated", { count: generatedStudents.length, studentIds: generatedStudents }, req);
    return res.status(200).json({
      success: true,
      message:
        generatedStudents.length > 0
          ? `Admit cards generated for ${generatedStudents.length} student(s).`
          : "All selected students already have admit cards.",
      generatedStudents,
    });
  } catch (error) {
    logError("[BulkAdmitController] bulkGenerateAdmitCards", error, req);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while generating admit cards.",
    });
  }
};


//  SEND ADMIT CARDS

export const bulkSendAdmitCards = async (req, res) => {
  const { selectedStudents, provider = "brevo" } = req.body;
  
  if (!selectedStudents?.length) {
    return rejectRequest(req, res, 400, "no_students_selected", "No students selected");
  }

  try {
    const settings = await Settings.findOne();
    const examDate = formatDateDDMMYYYY(settings?.examDate || "Not Set");

    const students = await Student.find({ studentId: { $in: selectedStudents } });

    if (!students.length) {
      return rejectRequest(req, res, 404, "no_matching_students", "No matching students found.");
    }

    // --- Quota Pre-check ---
    let remainingQuota = 0;
    if (provider === "brevo") {
      const today = new Date().toISOString().split('T')[0];
      remainingQuota = settings?.brevo?.date === today ? 300 - (settings?.brevo?.count || 0) : 300;
    } else if (provider === "resend") {
      if (!settings?.resend?.windowStart) {
        remainingQuota = 100;
      } else {
        const windowStartTime = new Date(settings.resend.windowStart).getTime();
        if (Date.now() - windowStartTime >= 24 * 60 * 60 * 1000) {
          remainingQuota = 100;
        } else {
          remainingQuota = 100 - (settings.resend.count || 0);
        }
      }
    }

    // Filter students who actually need an email (has email and not sent yet)
    const studentsToProcess = students.filter(s => s.email && !s.admitCardSent);
    
    if (studentsToProcess.length > remainingQuota) {
      return rejectRequest(
        req, 
        res, 
        429, 
        "quota_exceeded", 
        `Cannot send ${studentsToProcess.length} emails. Only ${remainingQuota} remaining for ${provider} in the current window.`
      );
    }
    // ----------------------

    const sentList = [];
    const skippedList = [];
    const reconciliationList = [];
    const currentYear = new Date().getFullYear();

    // Process in batches to avoid rate limits and improve speed
    const BATCH_SIZE = 5; // Send 5 emails at a time
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (student) => {
        // Skip if no email
        if (!student.email) {
          skippedList.push({ id: student.studentId, reason: "No email" });
          return null;
        }

        if (student.admitCardSent) {
          skippedList.push({
            id: student.studentId,
            reason: "Admit card already sent"
          });
          return null;
        }

        try {
          // Generate PDF buffer
          const pdfBuffer = await createAdmitCardBuffer(student, examDate);

          // Send email
          const emailResult = await sendEmail({
            from: `British School - Gurukul <noreply@bsgurukul.com>`,
            to: student.email,
            subject: `Admit Card for UDAAN ${currentYear}`,
            html: `
              <p>Dear <b>${student.studentName}</b>,</p>
              <p>1. Please download and print your Admit Card attached below for the exam.</p>
              <p>2. <b>Exam Date:</b> ${examDate}</p>
              <p>3. <b>Test Venue:</b> ${student.testCentre}</p>
              <p>4. <b>Exam Time:</b> 10:00 AM</p>
              <p>4. <b>Reporting Time:</b> 09:00 AM</p>
              <br/>
              <p>5. In case of any difficulty, please contact @ 7766994020, 7766994006</p>
              <br/>
              <p>With Best Wishes,<br/>British English School<br/>Manpur, Gere, Gaya (Bihar)<br/> PIN - 823003</p>
            `,
            attachments: [
              {
                filename: `${student.studentId}.pdf`,
                content: pdfBuffer.toString("base64"),
                contentType: "application/pdf",
              },
            ],
          }, student.studentId, provider); // Pass studentId for operational logging and chosen provider

          // Mark as sent in database with failure recovery
          try {
            student.admitCardSent = true;
            student.admitCardGenerated = true;
            student.admitCardProvider = emailResult.provider;
            student.admitCardSentAt = new Date();
            await student.save();
          } catch (dbError) {
            // Email succeeded but DB failed. Do NOT throw error or it will trigger a resend/skip.
            // Log explicitly for manual reconciliation to prevent duplicate emails.
            logError(`[BulkAdmitController] MANUAL RECONCILIATION REQUIRED: Email sent via ${emailResult.provider} for student ${student.studentId}, but database update failed.`, dbError, req);
            
            reconciliationList.push({
              id: student.studentId,
              provider: emailResult.provider
            });
            return { success: false, studentId: student.studentId, reconciliation: true };
          }

          sentList.push(student.studentId);
          logActivity("AdmitCardEmailSent", { 
            studentId: student.studentId,
            provider: emailResult.provider,
            fallback: emailResult.fallback
          }, req);
          
          return { success: true, studentId: student.studentId };
        } catch (mailError) {
          logError(`[BulkAdmitController] sendEmail ${student.studentId}`, mailError, req);
          skippedList.push({
            id: student.studentId,
            reason: mailError.message
          });
          return { success: false, studentId: student.studentId };
        }
      });

      // Wait for current batch to complete
      await Promise.allSettled(batchPromises);

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < students.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    res.status(200).json({
      success: true,
      message: `Batch processed. ${sentList.length} fully successful, ${skippedList.length} skipped, ${reconciliationList.length} need reconciliation.`,
      sentList,
      skippedList,
      reconciliationList,
      stats: {
        total: students.length,
        deliveredAndSaved: sentList.length,
        deliveredNotSaved: reconciliationList.length,
        skipped: skippedList.length,
      }
    });
  } catch (error) {
    logError("[BulkAdmitController] bulkSendAdmitCards", error, req);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while sending admit cards.",
    });
  }
};


//  RESET ADMIT CARDS

export const resetAdmitCards = async (req, res) => {
  const { selectedStudents } = req.body;

  try {
    // Build filter: specific students or all
    const filter = selectedStudents?.length
      ? { studentId: { $in: selectedStudents } }
      : {};

    // Only reset students that actually have admit cards generated or sent
    const resetFilter = {
      ...filter,
      $or: [
        { admitCardGenerated: true },
        { admitCardSent: true },
      ],
    };

    const result = await Student.updateMany(resetFilter, {
      $set: {
        admitCardGenerated: false,
        admitCardSent: false,
        admitCardProvider: null,
        admitCardSentAt: null,
      },
    });

    const scope = selectedStudents?.length
      ? `${selectedStudents.length} selected student(s)`
      : "all students";

    logActivity("AdmitCardsReset", {
      scope,
      updatedCount: result.modifiedCount,
      studentIds: selectedStudents || "all",
    }, req);

    return res.status(200).json({
      success: true,
      message: result.modifiedCount > 0
        ? `Admit card status reset for ${result.modifiedCount} student(s).`
        : "No students required resetting.",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    logError("[BulkAdmitController] resetAdmitCards", error, req);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while resetting admit cards.",
    });
  }
};