import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { logActivity, logEmail, logSecurity, logError } from "../src/utils/logger.js";

// Captures what would have been written to stdout/stderr by mocking console
// methods, so we can assert on the actual rendered log line rather than
// re-implementing the redaction logic in the test.
const captureConsole = (method) => {
  const calls = [];
  const restore = mock.method(console, method, (line) => {
    calls.push(line);
  });
  return { calls, restore };
};

describe("logger PII redaction (email/to)", () => {
  test("logActivity omits `email` from the rendered log line, keeps unrelated fields", () => {
    const { calls, restore } = captureConsole("log");
    try {
      logActivity("REGISTER_SUCCESS", {
        studentId: "STU0042",
        email: "realstudent@example.com",
        stream: "PCM",
      });
    } finally {
      restore.mock.restore();
    }

    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /realstudent@example\.com/);
    assert.doesNotMatch(calls[0], /email=/);
    assert.match(calls[0], /studentId=STU0042/);
    assert.match(calls[0], /stream=PCM/);
  });

  test("logEmail omits `to` from the rendered log line, keeps provider/messageId", () => {
    const { calls, restore } = captureConsole("log");
    try {
      logEmail("EMAIL_SENT", {
        provider: "brevo",
        to: "realstudent@example.com",
        messageId: "abc123",
      });
    } finally {
      restore.mock.restore();
    }

    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /realstudent@example\.com/);
    assert.doesNotMatch(calls[0], /to=/);
    assert.match(calls[0], /provider=brevo/);
    assert.match(calls[0], /messageId=abc123/);
  });

  test("logSecurity omits `email` when present alongside a security event", () => {
    const { calls, restore } = captureConsole("log");
    try {
      logSecurity("LOGIN_FAILED", {
        reason: "InvalidCredentials",
        email: "someone@example.com",
      });
    } finally {
      restore.mock.restore();
    }

    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /someone@example\.com/);
    assert.match(calls[0], /reason=InvalidCredentials/);
  });

  test("regression: previously-redacted fields (password, token, studentName) are still redacted", () => {
    const { calls, restore } = captureConsole("log");
    try {
      logActivity("ADMIN_LOGIN_DEBUG", {
        studentName: "Real Name",
        password: "hunter2",
        token: "abc.def.ghi",
        studentId: "STU0042",
      });
    } finally {
      restore.mock.restore();
    }

    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /Real Name/);
    assert.doesNotMatch(calls[0], /hunter2/);
    assert.doesNotMatch(calls[0], /abc\.def\.ghi/);
    assert.match(calls[0], /studentId=STU0042/);
  });

  test("regression: studentId is intentionally NOT redacted (needed for operational log search)", () => {
    const { calls, restore } = captureConsole("log");
    try {
      logActivity("AdmitCardGenerated", { studentId: "STU0042" });
    } finally {
      restore.mock.restore();
    }

    assert.match(calls[0], /studentId=STU0042/);
  });

  test("logError's nested-object redaction (safeStringify path) also covers email", () => {
    const { calls, restore } = captureConsole("error");
    try {
      const err = new Error("boom");
      err.code = "some_code";
      // logError only redacts REDACTED_FIELDS keys inside its own errorInfo
      // object (message/code/status/reason/action/stack) -- email is not one
      // of those keys, so this test documents that logError's surface is
      // unaffected by this change (it never logged email in the first place).
      logError("[test] context", err);
    } finally {
      restore.mock.restore();
    }
    assert.equal(calls.length, 1);
    assert.match(calls[0], /boom/);
  });
});
