import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { STUDENT_ALLOWED_FIELDS, pickAllowedFields } from "../src/controllers/studentController.js";

// A realistic, fully-populated legitimate registration payload (senior/PCM mode),
// mirroring exactly what RegisterStudent.jsx sends via FormData.
const legitimatePayload = {
  studentName: "Aarav Kumar",
  gender: "Male",
  classMoving: "10th to 11th",
  dateOfBirth: "2010-05-14",
  stream: "PCM",
  target: "JEE",
  fatherName: "Ramesh Kumar",
  motherName: "Sita Kumar",
  email: "aarav@example.com",
  permanentAddress: "123 Main Road, Gaya",
  presentAddress: "123 Main Road, Gaya",
  parentMobile: "9876543210",
  studentMobile: "9876543211",
  whatsappMobile: "9876543210",
  previousSchool: "British School Gurukul",
  previousResultPercentage: "88",
  testCentre: "Gaya Centre",
  studyCentre: "Gaya Centre",
  scholarshipOffered: "true",
  scholarshipDetails: "50% merit scholarship from XYZ Foundation",
};

// Fields that must never be settable by a student, mirroring the Student
// schema's system/admin-managed fields.
const protectedFields = {
  rollNo: 4001,
  admitCardGenerated: true,
  admitCardSent: true,
  admitCardProvider: "brevo",
  admitCardSentAt: "2026-01-01T00:00:00.000Z",
  studentId: "STU9999",
  clerkUserId: "user_attacker_controlled",
  submittedAt: "1999-01-01T00:00:00.000Z",
  createdAt: "1999-01-01T00:00:00.000Z",
  updatedAt: "1999-01-01T00:00:00.000Z",
  __v: 99,
};

describe("STUDENT_ALLOWED_FIELDS / pickAllowedFields (mass-assignment protection)", () => {
  test("happy path: a legitimate payload passes through unchanged", () => {
    const result = pickAllowedFields(legitimatePayload, STUDENT_ALLOWED_FIELDS);
    assert.deepEqual(result, legitimatePayload);
  });

  test("malicious payload: admin/system fields mixed into a legitimate submission are stripped", () => {
    const maliciousPayload = { ...legitimatePayload, ...protectedFields };
    const result = pickAllowedFields(maliciousPayload, STUDENT_ALLOWED_FIELDS);

    for (const field of Object.keys(protectedFields)) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(result, field),
        false,
        `expected "${field}" to be stripped from the picked result`
      );
    }
    // Legitimate fields must still survive alongside the attack payload.
    assert.deepEqual(result, legitimatePayload);
  });

  test("each individual protected field is rejected on its own", () => {
    for (const [field, value] of Object.entries(protectedFields)) {
      const result = pickAllowedFields({ studentName: "Test Student", [field]: value }, STUDENT_ALLOWED_FIELDS);
      assert.equal(
        Object.prototype.hasOwnProperty.call(result, field),
        false,
        `"${field}" must never be accepted from client input`
      );
      assert.equal(result.studentName, "Test Student");
    }
  });

  test("regression: fields intentionally omitted by the client (e.g. junior-mode has no stream) stay absent, not undefined", () => {
    const { stream, ...juniorPayload } = legitimatePayload;
    const result = pickAllowedFields(juniorPayload, STUDENT_ALLOWED_FIELDS);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "stream"), false);
  });

  test("edge case: empty body produces an empty object", () => {
    const result = pickAllowedFields({}, STUDENT_ALLOWED_FIELDS);
    assert.deepEqual(result, {});
  });

  test("edge case: missing body defaults to an empty object without throwing", () => {
    const result = pickAllowedFields(undefined, STUDENT_ALLOWED_FIELDS);
    assert.deepEqual(result, {});
  });

  test("edge case: prototype-pollution-style keys are never copied, since only allow-listed keys are read", () => {
    const hostileBody = JSON.parse(
      '{"studentName":"Test","__proto__":{"polluted":true},"constructor":{"polluted":true}}'
    );
    const result = pickAllowedFields(hostileBody, STUDENT_ALLOWED_FIELDS);

    assert.deepEqual(Object.keys(result), ["studentName"]);
    assert.equal(({}).polluted, undefined, "global Object.prototype must remain unpolluted");
  });

  test("STUDENT_ALLOWED_FIELDS does not include any system/admin-managed field", () => {
    for (const field of Object.keys(protectedFields)) {
      assert.equal(
        STUDENT_ALLOWED_FIELDS.includes(field),
        false,
        `"${field}" must not be present in the allow-list`
      );
    }
  });
});
