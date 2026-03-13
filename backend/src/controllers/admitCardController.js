// admitCardController.js
import PDFDocument from "pdfkit";
import Student from "../models/student.models.js";
import Settings from "../models/settings.models.js";
import { formatDateDDMMYYYY } from "../utils/googleSheets.js";
import path from "path";

const bannerPath = path.resolve("assets/banner.png"); // backend/assets/banner.png
const addTextWatermark = (doc, text = "SBTSE - 2026") => {
  const { width, height } = doc.page;

  doc.save(); // save current state

  doc
    .rotate(-45, { origin: [width / 2, height / 2] }) // diagonal
    .fontSize(60)
    .font("Helvetica-Bold")
    .fillColor("gray")
    .opacity(0.2) 
    .text(text, width / 2 - 300, height / 2 - 30, {
      width: 600,
      align: "center",
    });

  doc.restore(); // restore state
};

// 🔹 Helper: create PDF buffer in memory
export const createAdmitCardBuffer = (student, examDate) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

      addTextWatermark(doc, "SBTSE - 2026");

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

    const drawRow = (label, value, y, options = {}) => {
    const width = options.width || 280;
    const gapAfter = options.gapAfter ?? 8;
    const maxLines = options.maxLines ?? 1;

    doc.text(label, leftX, y);
    doc.text(":", leftX + labelWidth, y);

    doc.text(value || "-", valueX, y, {
      width,
      height: doc.currentLineHeight() * maxLines,
      ellipsis: true,
    });

    return doc.y + gapAfter;
  };

  let y = startY;

  y = drawRow("Roll No.", student.rollNo || "-", y);
  y = drawRow("Candidate's Name", student.studentName, y);
  y = drawRow("Father's Name", student.fatherName || "-", y);
  y = drawRow("Stream", student.stream, y);
  y = drawRow("Class", student.classMoving, y);
  y = drawRow("Gender", student.gender || "-", y);
  y = drawRow("Address", student.permanentAddress, y, { maxLines: 2 });
  y = drawRow(
    "Test Venue",
    "British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)",
    y, { maxLines: 3 }
  );
  y = drawRow("Exam Date", examDate || "-", y);
  y = drawRow("Exam Time", "10:00 AM", y);
  y = drawRow("Reporting Time", "09:00 AM", y);

    doc.rect(470, startY, 100, 130).stroke();
    doc.fontSize(8).font("Helvetica").text("Affix", 460, startY + 50, { align: "center" });
    doc.text("Photograph", 460, startY + 62, { align: "center" });
    doc.text("Here", 460, startY + 74, { align: "center" });

    doc.fontSize(9).font("Helvetica");
    doc.text("Invigilator's Sign", leftX, candBoxTop + candBoxHeight - 15, {width: 565, align: "center"});
    doc.text("Candidate's Sign", leftX, candBoxTop + candBoxHeight - 15, {width: 540, align: "right"});

    doc.moveDown(2);

    doc.fontSize(10).font("Helvetica-Bold").text("NOTE:", leftX);
    doc.moveDown(0.3);

    doc.fontSize(9.5).font("Helvetica");
    const instructions = [
      "100% Free Education, Fooding and Lodging facilities will be provided to the selected candidates after final stages subject to verification.",
      "Affix two recent Passport Sized Photographs as mentioned in the Admit Card before coming to the examination centre.",
      "Candidates are required to carry original Photo ID proof (Aadhar Card/SchooI ID) during exam along with admit card.",
      "Result will be notified through SMS and School Website - www.britishenglishschool.in",
      "LOCATION OF TEST CENTRE: British School Gurukul, Gaya, Bihar.",
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

    let invY = invStartY;

    invY = drawRow("Roll No.", student.rollNo || "-", invY);
    invY = drawRow("Candidate's Name", student.studentName, invY);
    invY = drawRow("Father's Name", student.fatherName || "-", invY);
    invY = drawRow("Stream", student.stream, invY);
    invY = drawRow("Address", student.permanentAddress, invY, { maxLines: 2 });
    invY = drawRow("Target", student.target, invY);
    invY = drawRow("Date", examDate || "-", invY);

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
