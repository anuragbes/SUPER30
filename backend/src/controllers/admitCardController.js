// admitCardController.js
import PDFDocument from "pdfkit";
import Student from "../models/student.models.js";
import Settings from "../models/settings.models.js";
import { formatDateDDMMYYYY } from "../utils/googleSheets.js";
import path from "path";

const bannerPath = path.resolve("assets/banner.png"); // backend/assets/banner.png

// 🔹 Helper: create PDF buffer in memory
export const createAdmitCardBuffer = (student, examDate) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ====== YOUR EXISTING PDF LAYOUT CODE STARTS ======
    doc.image(bannerPath, 20, 20, { width: 555 });
    doc.y = 150;

    doc.fillColor("#000").fontSize(18).font("Helvetica-Bold")
      .text("ADMIT CARD", { align: "center", underline: true });
    doc.moveDown(0.5);

    const candLabelY = doc.y;
    doc.rect(15, candLabelY, 565, 25).fillAndStroke("#E0E0E0", "#000");
    doc.fillColor("#000").fontSize(11).font("Helvetica-Bold")
      .text("Candidate's Copy", 20, candLabelY + 8, { align: "center" });

    doc.moveDown(0.5);

    const candBoxTop = doc.y;
    const candBoxHeight = 260;

    doc.rect(15, candBoxTop, 565, candBoxHeight).stroke();

    const startY = candBoxTop + 15;
    const leftX = 25;
    const labelWidth = 120;
    const valueX = leftX + labelWidth + 15;

    doc.fontSize(10).font("Helvetica");

    const drawRow = (label, value, y) => {
      doc.text(label, leftX, y);
      doc.text(":", leftX + labelWidth, y);
      doc.text(value, valueX, y, { width: 280 });
    };

    drawRow("Roll No.", student.rollNo || "-", startY);
    drawRow("Candidate's Name", student.studentName, startY + 18);
    drawRow("Father's Name", student.fatherName || "-", startY + 36);
    drawRow("Stream", student.stream, startY + 54);
    drawRow("Class", student.classMoving, startY + 72);
    drawRow("Gender", student.gender || "-", startY + 90);
    drawRow("Address", student.permanentAddress, startY + 108);
    drawRow(
      "Test Venue",
      "British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)",
      startY + 135 // 126
    );
    drawRow("Time", "09:00 AM - 11:00 AM", startY + 172); // 153
    drawRow("Date", examDate || "-", startY + 190); // 171
    drawRow("Reporting Time", "08:00 AM", startY + 208); // 189

    doc.rect(470, startY, 100, 130).stroke();
    doc.fontSize(8).font("Helvetica").text("Affix", 460, startY + 50, { align: "center" });
    doc.text("Photograph", 460, startY + 62, { align: "center" });
    doc.text("Here", 460, startY + 74, { align: "center" });

    doc.fontSize(9).font("Helvetica");
    doc.text("Invigilator's Sign", leftX, candBoxTop + candBoxHeight - 15);
    doc.text("Candidate's Sign", 380, candBoxTop + candBoxHeight - 15);

    doc.moveDown(2);

    doc.fontSize(10).font("Helvetica-Bold").text("NOTE:", leftX);
    doc.moveDown(0.3);

    doc.fontSize(9.5).font("Helvetica");
    const instructions = [
      "100% Free Education, Fooding and Lodging facilities will be provided to the selected candidates after final stages subject to verification.",
      "Affix two recent Passport Sized Photographs as mentioned in the Admit Card before coming to the examination Centre.",
      "Candidates are required to carry original Photo ID proof (Aadhar Card/SchooI ID) during exam along with admit card.",
      "Result will be notified through SMS and School Website - www.britishenglishschool.in",
      "LOCATION OF TEST CENTRE: British School Gurukul",
      "You are required to keep the Admit Card in original to avail the final scholarship subject to background clearance",
    ];

    instructions.forEach((text, i) => {
      doc.text(`${i + 1}. ${text}`, leftX, doc.y, { width: 540 });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    const invLabelY = doc.y;
    doc.rect(15, invLabelY, 565, 25).fillAndStroke("#E0E0E0", "#000");
    doc.fillColor("#000").fontSize(11).font("Helvetica-Bold")
      .text("Invigilator's Copy", 20, invLabelY + 8, { align: "center" });

    doc.moveDown(0.5);

    const invBoxTop = doc.y;
    const invBoxHeight = 180;

    doc.rect(15, invBoxTop, 565, invBoxHeight).stroke();

    const invStartY = invBoxTop + 15;

    doc.fontSize(10).font("Helvetica");

    drawRow("Roll No.", student.rollNo || "-", invStartY);
    drawRow("Candidate's Name", student.studentName, invStartY + 18);
    drawRow("Father's Name", student.fatherName || "-", invStartY + 36);
    drawRow("Stream", student.stream, invStartY + 54);
    drawRow("Address", student.permanentAddress, invStartY + 72);
    drawRow("Target", student.target, invStartY + 90);
    drawRow("Date", examDate || "-", invStartY + 108);

    doc.rect(470, invStartY, 100, 130).stroke();
    doc.fontSize(8).text("Affix", 460, invStartY + 50, { align: "center" });
    doc.text("Photograph", 460, invStartY + 62, { align: "center" });
    doc.text("Here", 460, invStartY + 74, { align: "center" });

    doc.fontSize(9).font("Helvetica");
    doc.text("Invigilator's Sign", leftX, invBoxTop + invBoxHeight - 15);
    doc.text("Candidate's Sign", 380, invBoxTop + invBoxHeight - 15);

    // ====== END OF YOUR LAYOUT ======
    doc.end();
  });
};

// HTTP endpoint: download admit card for one student
export const generateAdmitCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const settings = await Settings.findOne();
    const examDate = formatDateDDMMYYYY(settings?.examDate || "Not Set");

    const pdfBuffer = await createAdmitCardBuffer(student, examDate);

    await Student.updateOne({ studentId }, { admitCardGenerated: true });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${student.studentId}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ generateAdmitCard error:", error);
    return res.status(500).json({ error: error.message });
  }
};
