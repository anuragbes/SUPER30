import { google } from "googleapis";
import Student from "../models/student.models.js";

// Format DD/MM/YYYY
export const formatDateDDMMYYYY = (dateString) => {
  if (!dateString || dateString === "Not Set") return "Not Set";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

// Google Auth
const authClient = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth: authClient });

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// SHEET HEADERS
export const headers = [
  "Submission Timestamp",
  "Roll No",
  "Student ID",
  "Student Name",
  "Email",
  "Gender",
  "Class Moving",
  "Date of Birth",
  "Stream",
  "Target",
  "Father Name",
  "Mother Name",
  "Permanent Address",
  "Present Address",
  "Parent Mobile",
  "Student Mobile",
  "Whatsapp Mobile",
  "Previous School",
  "Previous Percentage",
  "Scholarship Offered",
  "Scholarship Details",
  "Passport Photo URL",
  "Identity Photo URL",
];

/* ---------------------------------------------------------
   1️⃣ AUTO-CREATE SHEET TAB IF MISSING
--------------------------------------------------------- */
export const ensureSheetExists = async (sheetName) => {
  try {
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    const exists = sheetInfo.data.sheets?.some(
      (sh) => sh.properties.title === sheetName
    );

    if (exists) return; // already exists

    // Create new sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          { addSheet: { properties: { title: sheetName } } }
        ],
      },
    });

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });

    console.log(`🆕 Created sheet: ${sheetName}`);
  } catch (err) {
    console.error("❌ ensureSheetExists ERROR:", err.message);
  }
};

/* ---------------------------------------------------------
   2️⃣ APPEND STUDENT TO GOOGLE SHEET (PCM / PCB TAB)
--------------------------------------------------------- */
export const appendToGoogleSheet = async (student) => {
  try {
    const targetSheet = student.stream === "PCM" ? "PCM" : "PCB";

    // Ensure tab exists
    await ensureSheetExists(targetSheet);

    const row = [
      student.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      student.rollNo || "",
      student.studentId || "",
      student.studentName || "",
      student.email || "",
      student.gender || "",
      student.classMoving || "",
      student.dateOfBirth ? formatDateDDMMYYYY(student.dateOfBirth) : "",
      student.stream || "",
      student.target || "",
      student.fatherName || "",
      student.motherName || "",
      student.permanentAddress || "",
      student.presentAddress || "",
      student.parentMobile || "",
      student.studentMobile || "",
      student.whatsappMobile || "",
      student.previousSchool || "",
      student.previousResultPercentage || "",
      student.scholarshipOffered ? "Yes" : "No",
      student.scholarshipDetails || "",
      student.passportPhotoURL || "",
      student.identityPhotoURL || "",
    ];

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${targetSheet}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    console.log(`🟢 Appended student to ${targetSheet}`);
  } catch (error) {
    console.error("❌ appendToGoogleSheet ERROR:", error.message);
  }
};

/* ---------------------------------------------------------
   3️⃣ UPDATE BOTH PCM AND PCB SHEETS AFTER ROLL NO. GENERATION
--------------------------------------------------------- */
export const updatePCMAndPCB = async () => {
  try {
    await ensureSheetExists("PCM");
    await ensureSheetExists("PCB");

    const pcm = await Student.find({ stream: "PCM" }).sort({ rollNo: 1 });
    const pcb = await Student.find({ stream: "PCB" }).sort({ rollNo: 1 });

    const convert = (s) => [
      s.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      s.rollNo || "",
      s.studentId || "",
      s.studentName || "",
      s.email || "",
      s.gender || "",
      s.classMoving || "",
      s.dateOfBirth ? formatDateDDMMYYYY(s.dateOfBirth) : "",
      s.stream || "",
      s.target || "",
      s.fatherName || "",
      s.motherName || "",
      s.permanentAddress || "",
      s.presentAddress || "",
      s.parentMobile || "",
      s.studentMobile || "",
      s.whatsappMobile || "",
      s.previousSchool || "",
      s.previousResultPercentage || "",
      s.scholarshipOffered ? "Yes" : "No",
      s.scholarshipDetails || "",
      s.passportPhotoURL || "",
      s.identityPhotoURL || "",
    ];

    // PCM update
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `PCM!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...pcm.map(convert)] },
    });

    // PCB update
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `PCB!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...pcb.map(convert)] },
    });

    console.log("🟢 PCM & PCB sheets updated");
  } catch (error) {
    console.error("❌ updatePCMAndPCB ERROR:", error.message);
  }
};
