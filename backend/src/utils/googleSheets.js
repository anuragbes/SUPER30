import { google } from "googleapis";
import Student from "../models/student.models.js";
import { logError } from "./logger.js";

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

// Get Sheet ID by Sheet Name
export const getSheetIdByName = async (sheetName) => {
  const sheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
  });

  const sheet = sheetInfo.data.sheets.find(
    (sh) => sh.properties.title === sheetName
  );

  return sheet?.properties?.sheetId;
};

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
  "Class",
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
  "Test Centre",
  "Study Centre",
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
    logError("[GoogleSheets] ensureSheetExists", err);
  }
};

/* ---------------------------------------------------------
   2️⃣ APPEND STUDENT TO GOOGLE SHEET
   Senior → PCM / PCB tabs
   Junior → Class 8 / Class 9 / Class 10 tabs
--------------------------------------------------------- */
export const getTargetSheet = (student) => {
  if (student.stream) {
    return student.stream === "PCM" ? "PCM" : "PCB";
  }
  // Junior mode: use classMoving as tab name
  return student.classMoving || "Class 8";
};

export const appendToGoogleSheet = async (student) => {
  try {
    const targetSheet = getTargetSheet(student);

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
      student.testCentre || "",
      student.studyCentre || "",
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
    logError("[GoogleSheets] appendToGoogleSheet", error);
  }
};

/* ---------------------------------------------------------
   3️⃣ UPDATE SHEETS AFTER ROLL NO. GENERATION
   Senior → PCM / PCB tabs
   Junior → Class 8 / Class 9 / Class 10 tabs
--------------------------------------------------------- */
const convertStudentToRow = (s) => [
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
  s.testCentre || "",
  s.studyCentre || "",
  s.scholarshipOffered ? "Yes" : "No",
  s.scholarshipDetails || "",
  s.passportPhotoURL || "",
  s.identityPhotoURL || "",
];

const updateSheetForGroup = async (sheetName, query) => {
  await ensureSheetExists(sheetName);
  const students = await Student.find(query).sort({ rollNo: 1 });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers, ...students.map(convertStudentToRow)] },
  });
};

export const updatePCMAndPCB = async () => {
  try {
    // Senior mode: PCM & PCB
    await updateSheetForGroup("PCM", { stream: "PCM" });
    await updateSheetForGroup("PCB", { stream: "PCB" });

    // Junior mode: Class 8, Class 9, Class 10
    for (const cls of ["Class 8", "Class 9", "Class 10"]) {
      const count = await Student.countDocuments({ classMoving: cls, stream: null });
      if (count > 0) {
        await updateSheetForGroup(cls, { classMoving: cls, stream: null });
      }
    }

    console.log("🟢 All sheets updated");
  } catch (error) {
    logError("[GoogleSheets] updatePCMAndPCB", error);
  }
};


/* ---------------------------------------------------------
   4️⃣ DELETE STUDENT FROM GOOGLE SHEET
   Uses stream for senior, classMoving for junior
--------------------------------------------------------- */
export const deleteStudentFromSheet = async (studentId, stream, classMoving) => {
  try {
    const sheetName = stream ? (stream === "PCM" ? "PCM" : "PCB") : (classMoving || "Class 8");

    // Ensure sheet exists
    await ensureSheetExists(sheetName);

    // Read all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      console.log(`⚠ No data found in sheet: ${sheetName}`);
      return;
    }

    // Student ID is column C → index 2
    const rowIndex = rows.findIndex((row) => row[2] === studentId);

    if (rowIndex === -1) {
      console.log(`⚠ Student ID ${studentId} not found in ${sheetName}`);
      return;
    }

    // Get the actual sheetId
    const sheetId = await getSheetIdByName(sheetName);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    console.log(`🗑️ Deleted student ${studentId} from sheet ${sheetName}`);

  } catch (error) {
    logError("[GoogleSheets] deleteStudentFromSheet", error);
  }
};

/* ---------------------------------------------------------
   5️⃣ CLEAR ROLL NUMBERS FROM SHEET
   Supports both stream-based (PCM/PCB) and class-based tabs
--------------------------------------------------------- */
export const clearRollNumbersFromSheet = async (stream) => {
  try {
    const sheetName = stream === "PCM" ? "PCM" : "PCB";

    // Ensure sheet exists
    await ensureSheetExists(sheetName);

    // Fetch all students from that stream
    const students = await Student.find({ stream }).sort({ studentName: 1 });

    if (students.length === 0) {
      console.log(`⚠️ No students found for stream: ${stream}`);
      return;
    }

    // Create rows with rollNo cleared (empty string)
    const convertCleared = (s) => [
      s.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      "", // Roll No - CLEARED
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
      s.testCentre || "",
      s.studyCentre || "",
      s.scholarshipOffered ? "Yes" : "No",
      s.scholarshipDetails || "",
      s.passportPhotoURL || "",
      s.identityPhotoURL || "",
    ];

    // Update the sheet with cleared roll numbers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...students.map(convertCleared)] },
    });

    console.log(`🟢 Cleared roll numbers for ${stream} stream in Google Sheet`);
  } catch (error) {
    logError("[GoogleSheets] clearRollNumbersFromSheet", error);
  }
};

/* ---------------------------------------------------------
   6️⃣ CLEAR ROLL NUMBERS FROM CLASS-BASED SHEET (Junior mode)
--------------------------------------------------------- */
export const clearRollNumbersFromClassSheet = async (classGroup) => {
  try {
    await ensureSheetExists(classGroup);

    const students = await Student.find({ classMoving: classGroup, stream: null }).sort({ studentName: 1 });

    if (students.length === 0) {
      console.log(`⚠️ No students found for class: ${classGroup}`);
      return;
    }

    const convertCleared = (s) => [
      s.submittedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) || "",
      "", // Roll No - CLEARED
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
      s.testCentre || "",
      s.studyCentre || "",
      s.scholarshipOffered ? "Yes" : "No",
      s.scholarshipDetails || "",
      s.passportPhotoURL || "",
      s.identityPhotoURL || "",
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${classGroup}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers, ...students.map(convertCleared)] },
    });

    console.log(`🟢 Cleared roll numbers for ${classGroup} in Google Sheet`);
  } catch (error) {
    logError("[GoogleSheets] clearRollNumbersFromClassSheet", error);
  }
};