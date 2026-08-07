import "dotenv/config";
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// registerStudent fires-and-forgets appendToGoogleSheet on every successful
// save, so it must be replaced before studentController.js is ever imported
// -- same mock.module() pattern as studentController.duplicateRegistration.
// test.js (requires --experimental-test-module-mocks).
const appendToGoogleSheetMock = mock.fn();

mock.module("../src/utils/googleSheets.js", {
  namedExports: {
    appendToGoogleSheet: (...args) => appendToGoogleSheetMock(...args),
  },
});

const { registerStudent } = await import("../src/controllers/studentController.js");
const { default: Student } = await import("../src/models/student.models.js");
const { default: Settings } = await import("../src/models/settings.models.js");
const { getSubmissionMode } = await import("../src/constants/registrationMode.js");

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

// Both findOne mocks must expose .lean(), matching the real chainable-Query
// shape registerStudent actually calls (Settings.findOne().lean() and
// Student.findOne().lean() for the duplicate check).
const mockActiveMode = (t, formMode) =>
  t.mock.method(Settings, "findOne", () => ({
    lean: () => Promise.resolve(formMode === undefined ? null : { formMode }),
  }));

const mockNoDuplicate = (t) =>
  t.mock.method(Student, "findOne", () => ({ lean: () => Promise.resolve(null) }));

const mockSaveSucceeds = (t, studentId = "STU0001") =>
  t.mock.method(Student.prototype, "save", async function () {
    this.studentId = studentId;
    return this;
  });

const juniorBody = {
  studentName: "Aarav Kumar",
  fatherName: "Ramesh Kumar",
  dateOfBirth: "2013-05-14",
  gender: "Male",
  classMoving: "Class 8",
  target: "NEET",
  motherName: "Sita Kumar",
  email: "aarav@example.com",
  permanentAddress: "123 Main Road, Gaya",
  presentAddress: "123 Main Road, Gaya",
  parentMobile: "9876543210",
  studentMobile: "9876543211",
  previousSchool: "British School Gurukul",
  previousResultPercentage: "88",
  testCentre: "Gaya Centre",
  studyCentre: "Gaya Study Centre",
};

const seniorBody = {
  studentName: "Aarav Kumar",
  fatherName: "Ramesh Kumar",
  dateOfBirth: "2010-05-14",
  gender: "Male",
  classMoving: "10th to 11th",
  stream: "PCM",
  target: "JEE",
  motherName: "Sita Kumar",
  email: "aarav@example.com",
  permanentAddress: "123 Main Road, Gaya",
  presentAddress: "123 Main Road, Gaya",
  parentMobile: "9876543210",
  studentMobile: "9876543211",
  previousSchool: "British School Gurukul",
  previousResultPercentage: "88",
  testCentre: "Gaya Centre",
};

const makeReq = (body, overrides = {}) => ({
  requestId: "test-req-id",
  method: "POST",
  originalUrl: "/api/students/register",
  clerkUserId: "user_test123",
  body,
  ...overrides,
});

describe("registerStudent registration-mode gate (backend enforcement)", () => {
  test("Junior mode + Junior payload -> registration proceeds (201)", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "junior");
    mockNoDuplicate(t);
    mockSaveSucceeds(t, "STU0100");

    const res = makeRes();
    await registerStudent(makeReq(juniorBody), res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { message: "Registration successful", studentId: "STU0100" });
  });

  test("Junior mode + Senior payload -> rejected 400, no DB write, no Sheets sync", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "junior");
    const findOneMock = mockNoDuplicate(t);
    const saveMock = mockSaveSucceeds(t);

    const res = makeRes();
    await registerStudent(makeReq(seniorBody), res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Junior registrations are currently open." });
    assert.equal(findOneMock.mock.callCount(), 0, "must fail before the duplicate-registration check ever runs");
    assert.equal(saveMock.mock.callCount(), 0, "must never attempt to save a mode-mismatched submission");
    assert.equal(appendToGoogleSheetMock.mock.callCount(), 0, "must never sync a rejected registration to Sheets");
  });

  test("Senior mode + Senior payload -> registration proceeds (201)", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "senior");
    mockNoDuplicate(t);
    mockSaveSucceeds(t, "STU0200");

    const res = makeRes();
    await registerStudent(makeReq(seniorBody), res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { message: "Registration successful", studentId: "STU0200" });
  });

  test("Senior mode + Junior payload -> rejected 400, no DB write, no Sheets sync", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "senior");
    const findOneMock = mockNoDuplicate(t);
    const saveMock = mockSaveSucceeds(t);

    const res = makeRes();
    await registerStudent(makeReq(juniorBody), res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Senior registrations are currently open." });
    assert.equal(findOneMock.mock.callCount(), 0, "must fail before the duplicate-registration check ever runs");
    assert.equal(saveMock.mock.callCount(), 0, "must never attempt to save a mode-mismatched submission");
    assert.equal(appendToGoogleSheetMock.mock.callCount(), 0, "must never sync a rejected registration to Sheets");
  });

  test("missing Settings document -> fails closed (500), never falls back to allowing the submission", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, undefined); // Settings.findOne() resolves to null
    const findOneMock = mockNoDuplicate(t);
    const saveMock = mockSaveSucceeds(t);

    const res = makeRes();
    await registerStudent(makeReq(juniorBody), res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Registration is temporarily unavailable. Please try again shortly." });
    assert.equal(findOneMock.mock.callCount(), 0);
    assert.equal(saveMock.mock.callCount(), 0);
  });

  test("invalid/corrupted formMode value -> fails closed (500), never falls back to allowing the submission", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "both"); // not "junior" or "senior" -- e.g. legacy/manual DB edit
    const saveMock = mockSaveSucceeds(t);

    const res = makeRes();
    await registerStudent(makeReq(seniorBody), res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Registration is temporarily unavailable. Please try again shortly." });
    assert.equal(saveMock.mock.callCount(), 0);
  });

  test("unrecognized classMoving value -> not this check's concern, gate does not block it (existing schema validation handles it downstream)", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "junior");
    mockNoDuplicate(t);
    // Simulates the existing, unrelated Mongoose enum-validation failure that
    // already happens today for a bad classMoving -- unchanged by this gate.
    t.mock.method(Student.prototype, "save", async function () {
      const err = new Error("Student validation failed: classMoving: `Class 99` is not a valid enum value");
      err.name = "ValidationError";
      throw err;
    });

    const res = makeRes();
    const req = makeReq({ ...juniorBody, classMoving: "Class 99" });
    await registerStudent(req, res);

    // Falls through to the existing generic error handler (unchanged
    // behavior), not the mode-mismatch response.
    assert.equal(res.statusCode, 500);
    assert.notEqual(res.body?.error, "Junior registrations are currently open.");
    assert.notEqual(res.body?.error, "Senior registrations are currently open.");
  });

  test("Junior mode + payload with no classMoving at all -> gate does not block it (missing-field validation is unrelated to this check)", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t, "junior");
    mockNoDuplicate(t);
    mockSaveSucceeds(t, "STU0300");

    const { classMoving, ...bodyWithoutClassMoving } = juniorBody;
    const res = makeRes();
    await registerStudent(makeReq(bodyWithoutClassMoving), res);

    assert.equal(res.statusCode, 201, "getSubmissionMode(undefined) returns null, so the gate lets it through unchanged");
  });
});

describe("getSubmissionMode (pure classification helper)", () => {
  test("recognizes all three Junior classMoving values", () => {
    assert.equal(getSubmissionMode("Class 8"), "junior");
    assert.equal(getSubmissionMode("Class 9"), "junior");
    assert.equal(getSubmissionMode("Class 10"), "junior");
  });

  test("recognizes both Senior classMoving values", () => {
    assert.equal(getSubmissionMode("10th to 11th"), "senior");
    assert.equal(getSubmissionMode("11th to 12th"), "senior");
  });

  test("returns null for anything else", () => {
    assert.equal(getSubmissionMode("Class 99"), null);
    assert.equal(getSubmissionMode(""), null);
    assert.equal(getSubmissionMode(undefined), null);
    assert.equal(getSubmissionMode(null), null);
  });
});
