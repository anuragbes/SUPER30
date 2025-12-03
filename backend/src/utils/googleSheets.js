import { google } from "googleapis";
import Student from "../models/student.models.js";

// function to format date as DD/MM/YYYY
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

// Auth setup for Google Sheets
const authClient = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth: authClient });

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
// Allow configuring the sheet/tab name (defaults to the common "Sheet1")
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1";

// HEADER COLUMNS

const headers = [
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


// Called during student registration  (Adds ONE ROW into Google Sheet without rewriting everything)
 
export const appendToGoogleSheet = async (student) => {
  try {
    // Check if sheet is empty
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:A1`,
    });

    const isEmpty = !existing.data.values || existing.data.values.length === 0;

    // Prepare student row
    const row = [
      student.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      student.rollNo || "",
      student.studentId || "",
      student.studentName || "",
      student.email || "",
      student.gender || "",
      student.classMoving || "",
      student.dateOfBirth?.toISOString().split("T")[0] || "",
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

    // If sheet empty → write headers + first student
    if (isEmpty) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers, row],
        },
      });
      console.log("✅ Sheet was empty — headers + first student added.");
    } else {
      // Otherwise, just append the new student row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [row],
        },
      });
      console.log("✅ Added new student to existing sheet.");
    }
  } catch (error) {
    console.error("❌ appendToGoogleSheet ERROR:", error.message);
  }
};

// Called during roll number generation  -- Rewrites the entire sheet (header + all students)

export const updateSheetWithAllStudents = async () => {
  try {
    const students = await Student.find().sort({ rollNo: 1 });

    const rows = students.map((s) => [
      s.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      s.rollNo || "",
      s.studentId || "",
      s.studentName || "",
      s.email || "",
      s.gender || "",
      s.classMoving || "",
      s.dateOfBirth?.toISOString().split("T")[0] || "",
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
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers, ...rows],
      },
    });

    console.log("Sheet fully updated with new Roll Numbers");
  } catch (error) {
    console.error("updateSheetWithAllStudents ERROR:", error.message);
  }
};

// Update sheet with PCM first, then three blank rows, then PCB
export const updateSheetWithStreamSeparation = async () => {
  try {
    const pcm = await Student.find({ stream: "PCM" }).sort({ rollNo: 1 });
    const pcb = await Student.find({ stream: "PCB" }).sort({ rollNo: 1 });

    const pcmRows = pcm.map((s) => [
      s.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      s.rollNo || "",
      s.studentId || "",
      s.studentName || "",
      s.email || "",
      s.gender || "",
      s.classMoving || "",
      s.dateOfBirth?.toISOString().split("T")[0] || "",
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
    ]);

    const pcbRows = pcb.map((s) => [
      s.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      s.rollNo || "",
      s.studentId || "",
      s.studentName || "",
      s.email || "",
      s.gender || "",
      s.classMoving || "",
      s.dateOfBirth?.toISOString().split("T")[0] || "",
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
    ]);

    const emptyRow = new Array(headers.length).fill("");

    const values = [headers, ...pcmRows, emptyRow, emptyRow, emptyRow, ...pcbRows];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    console.log("Sheet updated: PCM then blank rows then PCB");
  } catch (error) {
    console.error("updateSheetWithStreamSeparation ERROR:", error.message);
  }
};
