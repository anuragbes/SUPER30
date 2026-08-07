import "dotenv/config";
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// registerStudent fires-and-forgets appendToGoogleSheet (Performance Audit
// optimization) and, if req.files were populated, would call Cloudinary --
// neither is exercised by these tests (no req.files set), but
// appendToGoogleSheet is still *called* on every successful save, so it must
// be replaced before studentController.js is ever imported, or these tests
// would fire real Google Sheets API requests. Same mock.module() pattern as
// emailQuota.reservation.test.js (requires --experimental-test-module-mocks).
const appendToGoogleSheetMock = mock.fn();

mock.module("../src/utils/googleSheets.js", {
  namedExports: {
    appendToGoogleSheet: (...args) => appendToGoogleSheetMock(...args),
  },
});

const { registerStudent } = await import("../src/controllers/studentController.js");
const { default: Student } = await import("../src/models/student.models.js");
const { default: Settings } = await import("../src/models/settings.models.js");

// Minimal fake Express req/res -- matches the makeReq/makeRes pattern already
// used in adminController.dashboardStats.test.js.
const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

// registerStudent's duplicate check chains .lean() onto findOne() (Module P
// -- lean() audit), so the mock must expose a .lean() that resolves to the
// value, matching the real chainable-Query shape being called.
const mockFindOne = (t, resolveValue) =>
  t.mock.method(Student, "findOne", () => ({ lean: () => Promise.resolve(resolveValue) }));

// registerStudent now gates on Settings.formMode before anything else
// (registration-mode enforcement). makeReq()'s body is senior-shaped
// (classMoving: "10th to 11th"), so every test here mocks the active mode as
// "senior" to keep exercising the exact same duplicate-registration behavior
// as before this gate existed, without the new check interfering.
const mockActiveMode = (t, formMode = "senior") =>
  t.mock.method(Settings, "findOne", () => ({ lean: () => Promise.resolve({ formMode }) }));

const makeReq = (overrides = {}) => ({
  requestId: "test-req-id",
  method: "POST",
  originalUrl: "/api/students/register",
  clerkUserId: "user_test123",
  body: {
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
  },
  ...overrides,
});

describe("registerStudent duplicate-registration protection (Module 1.1 / Module 8)", () => {
  test("happy path: no existing student, save succeeds -> 201 with studentId (existing behavior unchanged)", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t);
    mockFindOne(t, null);
    t.mock.method(Student.prototype, "save", async function () {
      this.studentId = "STU0042";
      return this;
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { message: "Registration successful", studentId: "STU0042" });
  });

  test("identical registration (same studentName+fatherName+dateOfBirth) is rejected before any write", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t);
    mockFindOne(t, { _id: "existing-doc-id", studentId: "STU0001" });
    const saveMock = t.mock.method(Student.prototype, "save", async function () {
      this.studentId = "STU9999";
      return this;
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "You have already registered for this exam" });
    assert.equal(saveMock.mock.callCount(), 0, "must never attempt to save once a duplicate is found");
    assert.equal(appendToGoogleSheetMock.mock.callCount(), 0, "must never sync a rejected registration to Sheets");
  });

  test("concurrent duplicate: findOne pre-check misses the race, but the unique index (E11000) still catches it at write time", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    // Simulates two near-simultaneous identical submissions: this request's
    // findOne runs before the other one has committed, so it sees no
    // duplicate yet -- exactly the race the partial unique index (1.1) exists
    // to close.
    mockActiveMode(t);
    mockFindOne(t, null);
    t.mock.method(Student.prototype, "save", async function () {
      const err = new Error("E11000 duplicate key error collection: test.students index: studentName_1_fatherName_1_dateOfBirth_1");
      err.code = 11000;
      throw err;
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      error: "You have already registered for this exam. Multiple submissions are not allowed.",
    });
    assert.equal(appendToGoogleSheetMock.mock.callCount(), 0, "a failed save must never reach the Sheets sync");
  });

  test("regression: missing dateOfBirth skips the duplicate check entirely (pre-existing behavior, unchanged)", async (t) => {
    appendToGoogleSheetMock.mock.resetCalls();
    mockActiveMode(t);
    const findOneMock = t.mock.method(Student, "findOne", async () => null);
    t.mock.method(Student.prototype, "save", async function () {
      this.studentId = "STU0043";
      return this;
    });

    const { dateOfBirth, ...bodyWithoutDob } = makeReq().body;
    const req = makeReq({ body: bodyWithoutDob });
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(findOneMock.mock.callCount(), 0, "duplicate check must be skipped when dateOfBirth is absent, exactly as before this hardening");
    assert.equal(res.statusCode, 201);
  });
});
