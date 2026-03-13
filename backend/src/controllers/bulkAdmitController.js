import Student from "../models/student.models.js";
import Settings from "../models/settings.models.js";
import { createAdmitCardBuffer } from "./admitCardController.js";
import { formatDateDDMMYYYY } from "../utils/googleSheets.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ------------------------------------------------------
//  BULK GENERATE ADMIT CARDS (SAME AS BEFORE)
// ------------------------------------------------------
export const bulkGenerateAdmitCards = async (req, res) => {
  const { selectedStudents } = req.body;

  if (!selectedStudents?.length) {
    return res.status(400).json({ success: false, message: "No students selected" });
  }

  const settings = await Settings.findOne();
  if (!settings?.examDate) {
    return res.status(400).json({ success: false, message: "Please set the exam date." });
  }
  const examDate = formatDateDDMMYYYY(settings.examDate);

  try {
    const students = await Student.find({ studentId: { $in: selectedStudents } });

    const missingRoll = students.filter((s) => !s.rollNo);
    if (missingRoll.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot generate admit cards. Please generate roll numbers first.",
      });
    }

    const generatedStudents = [];

    for (const student of students) {
      if (student.admitCardGenerated) continue;

      await createAdmitCardBuffer(student, examDate);

      student.admitCardGenerated = true;
      await student.save();
      generatedStudents.push(student.studentId);
    }

    return res.status(200).json({
      success: true,
      message:
        generatedStudents.length > 0
          ? `Admit cards generated for ${generatedStudents.length} student(s).`
          : "All selected students already have admit cards.",
      generatedStudents,
    });
  } catch (error) {
    console.error("❌ Error in bulkGenerateAdmitCards:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while generating admit cards.",
      error: error.message,
    });
  }
};

// ------------------------------------------------------
//  OPTIMIZED BULK SEND ADMIT CARDS
// ------------------------------------------------------
export const bulkSendAdmitCards = async (req, res) => {
  const { selectedStudents } = req.body;
  
  if (!selectedStudents?.length) {
    return res.status(400).json({ success: false, message: "No students selected" });
  }

  try {
    const settings = await Settings.findOne();
    const examDate = formatDateDDMMYYYY(settings?.examDate || "Not Set");

    const students = await Student.find({ studentId: { $in: selectedStudents } });

    if (!students.length) {
      return res.status(404).json({ success: false, message: "No matching students found." });
    }

    const sentList = [];
    const skippedList = [];
    const currentYear = new Date().getFullYear();

    // ✅ Process in batches to avoid rate limits and improve speed
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
            name: student.studentName,
            email: student.email,
            reason: "Admit card already sent"
          });
          return null;
        }

        try {
          // Generate PDF buffer
          const pdfBuffer = await createAdmitCardBuffer(student, examDate);

          // Send email with timeout protection
          const emailPromise = await resend.emails.send({
            from: `British School - Gurukul <noreply@bsgurukul.com>`,
            to: student.email,
            subject: `Admit Card for Super 30 South Bihar Talent Search Examination ${currentYear} - PHASE II`,
            html: `
              <p>Dear <b>${student.studentName}</b>,</p>
              <p>1. Please download and print your Admit Card attached below for the exam.</p>
              <p>2. <b>Exam Date:</b> ${examDate}</p>
              <p>3. <b>Venue:</b> British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)</p>
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
                type: "application/pdf",
                disposition: "attachment",
              },
            ],
          });


          // Mark as sent in database
          student.admitCardSent = true;
          await student.save();
          
          sentList.push(student.studentId);
          console.log(`Email sent to ${student.studentName} (${student.email})`);
          
          return { success: true, studentId: student.studentId };
        } catch (mailError) {
          console.error(`Failed to send email to ${student.studentName}:`, mailError.message);
          skippedList.push({ 
            id: student.studentId, 
            name: student.studentName,
            email: student.email,
            reason: mailError.message 
          });
          return { success: false, studentId: student.studentId };
        }
      });

      // Wait for current batch to complete
      await Promise.allSettled(batchPromises);

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < students.length) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    res.status(200).json({
      success: true,
      message: `Emails sent successfully to ${sentList.length} out of ${students.length} students.`,
      sentList,
      skippedList,
      stats: {
        total: students.length,
        sent: sentList.length,
        skipped: skippedList.length,
      }
    });
  } catch (error) {
    console.error("❌ Error in bulkSendAdmitCards:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while sending admit cards.",
      error: error.message,
    });
  }
};