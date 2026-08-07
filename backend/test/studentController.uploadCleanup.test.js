import "dotenv/config";
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// registerStudent's upload step now needs both uploadBufferToCloudinary AND
// cloudinary.uploader.destroy under test control, so the whole upload.js
// module is replaced -- same mock.module() pattern used by
// studentController.duplicateRegistration.test.js for googleSheets.js.
const uploadBufferToCloudinaryMock = mock.fn();
const destroyMock = mock.fn(async () => ({ result: "ok" }));
const appendToGoogleSheetMock = mock.fn();

mock.module("../src/middlewares/upload.js", {
  namedExports: {
    uploadBufferToCloudinary: (...args) => uploadBufferToCloudinaryMock(...args),
    cloudinary: { uploader: { destroy: (...args) => destroyMock(...args) } },
  },
});

mock.module("../src/utils/googleSheets.js", {
  namedExports: {
    appendToGoogleSheet: (...args) => appendToGoogleSheetMock(...args),
  },
});

const { registerStudent } = await import("../src/controllers/studentController.js");
const { default: Student } = await import("../src/models/student.models.js");
const { default: Settings } = await import("../src/models/settings.models.js");

// registerStudent now gates on Settings.formMode before anything else
// (registration-mode enforcement). makeReq()'s body is senior-shaped
// (classMoving: "10th to 11th"), so every test here mocks the active mode as
// "senior" to keep exercising the exact same upload-cleanup behavior as
// before this gate existed, without the new check interfering.
const mockActiveMode = (t, formMode = "senior") =>
  t.mock.method(Settings, "findOne", () => ({ lean: () => Promise.resolve({ formMode }) }));

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

const passportBuffer = Buffer.from("fake-passport-bytes");
const identityBuffer = Buffer.from("fake-identity-bytes");

const makeReq = (overrides = {}) => ({
  requestId: "test-req-id",
  method: "POST",
  originalUrl: "/api/students/register",
  clerkUserId: "user_test123",
  body: {
    studentName: "Aarav Kumar",
    fatherName: "Ramesh Kumar",
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
  files: {
    passportPhoto: [{ buffer: passportBuffer }],
    identityPhoto: [{ buffer: identityBuffer }],
  },
  ...overrides,
});

const resetAll = () => {
  uploadBufferToCloudinaryMock.mock.resetCalls();
  destroyMock.mock.resetCalls();
  appendToGoogleSheetMock.mock.resetCalls();
};

describe("registerStudent upload cleanup (Performance Module P4 redesign)", () => {
  test("passport upload fails, identity upload succeeds -> the orphaned identity asset is deleted before the error propagates", async (t) => {
    resetAll();
    mockActiveMode(t);
    t.mock.method(Student, "findOne", async () => null);
    uploadBufferToCloudinaryMock.mock.mockImplementation(async (buffer, folder) => {
      if (folder === "super30/passport") throw new Error("Cloudinary upload failed: passport");
      return { secure_url: "https://cloudinary/identity.jpg", public_id: "super30/identity/abc123" };
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Registration failed due to a server error. Please try again or contact support." });
    assert.equal(destroyMock.mock.callCount(), 1, "the successfully-uploaded identity asset must be cleaned up");
    assert.equal(destroyMock.mock.calls[0].arguments[0], "super30/identity/abc123");
  });

  test("identity upload fails, passport upload succeeds -> the orphaned passport asset is deleted before the error propagates", async (t) => {
    resetAll();
    mockActiveMode(t);
    t.mock.method(Student, "findOne", async () => null);
    uploadBufferToCloudinaryMock.mock.mockImplementation(async (buffer, folder) => {
      if (folder === "super30/identity") throw new Error("Cloudinary upload failed: identity");
      return { secure_url: "https://cloudinary/passport.jpg", public_id: "super30/passport/xyz789" };
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(destroyMock.mock.callCount(), 1, "the successfully-uploaded passport asset must be cleaned up");
    assert.equal(destroyMock.mock.calls[0].arguments[0], "super30/passport/xyz789");
  });

  test("both uploads fail -> nothing to clean up, no destroy call, passport's error wins (matches original sequential ordering)", async (t) => {
    resetAll();
    mockActiveMode(t);
    t.mock.method(Student, "findOne", async () => null);
    uploadBufferToCloudinaryMock.mock.mockImplementation(async (buffer, folder) => {
      throw new Error(`Cloudinary upload failed: ${folder}`);
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(destroyMock.mock.callCount(), 0, "neither upload succeeded, so there is nothing to delete");
  });

  test("both uploads succeed -> no cleanup, registration proceeds exactly as before", async (t) => {
    resetAll();
    mockActiveMode(t);
    t.mock.method(Student, "findOne", async () => null);
    t.mock.method(Student.prototype, "save", async function () {
      this.studentId = "STU0099";
      return this;
    });
    uploadBufferToCloudinaryMock.mock.mockImplementation(async (buffer, folder) => ({
      secure_url: `https://cloudinary/${folder}.jpg`,
      public_id: `${folder}/ok`,
    }));

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { message: "Registration successful", studentId: "STU0099" });
    assert.equal(destroyMock.mock.callCount(), 0, "nothing failed, so nothing should ever be deleted");
  });

  test("cleanup itself failing does not change the response -- the original upload error still wins, not a cleanup error", async (t) => {
    resetAll();
    mockActiveMode(t);
    t.mock.method(Student, "findOne", async () => null);
    uploadBufferToCloudinaryMock.mock.mockImplementation(async (buffer, folder) => {
      if (folder === "super30/passport") throw new Error("Cloudinary upload failed: passport");
      return { secure_url: "https://cloudinary/identity.jpg", public_id: "super30/identity/abc123" };
    });
    destroyMock.mock.mockImplementation(async () => {
      throw new Error("Cloudinary destroy also failed");
    });

    const req = makeReq();
    const res = makeRes();
    await registerStudent(req, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Registration failed due to a server error. Please try again or contact support." });
    assert.equal(destroyMock.mock.callCount(), 1, "cleanup must still be attempted even though it will fail");
  });
});
