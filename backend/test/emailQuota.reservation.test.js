import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// The Brevo/Resend SDK clients are instantiated at module-load time inside
// brevoService.js/resendService.js and never exported, so the only way to
// control what "the provider" does in a test is to replace the SDK modules
// themselves before those services are first imported. mock.module() must
// run before the dynamic import below (requires --experimental-test-module-
// mocks, wired into the "test" npm script).
const brevoSendMock = mock.fn();
const resendSendMock = mock.fn();

mock.module("@getbrevo/brevo", {
  namedExports: {
    BrevoClient: class {
      transactionalEmails = { sendTransacEmail: (...args) => brevoSendMock(...args) };
    },
  },
});

mock.module("resend", {
  namedExports: {
    Resend: class {
      emails = { send: (...args) => resendSendMock(...args) };
    },
  },
});

const { sendWithBrevo } = await import("../src/services/brevoService.js");
const { sendWithResend } = await import("../src/services/resendService.js");
const { default: Settings } = await import("../src/models/settings.models.js");

const baseEmail = {
  from: "British School - Gurukul <noreply@bsgurukul.com>",
  to: "student@example.com",
  subject: "Admit Card",
  html: "<p>hi</p>",
};

const today = () => new Date().toISOString().split("T")[0];

describe("Brevo quota reservation (Module 1.4)", () => {
  test("reservation succeeds, provider succeeds -> no rollback, response unchanged", async (t) => {
    brevoSendMock.mock.resetCalls();
    brevoSendMock.mock.mockImplementation(async () => ({ body: { messageId: "msg-1" } }));

    let call = 0;
    const responses = [
      { brevo: { count: 50, date: today() } }, // upsert-seed call
      { brevo: { count: 51, date: today() } }, // reservation call succeeds
    ];
    const findOneAndUpdateMock = t.mock.method(Settings, "findOneAndUpdate", async () => responses[call++]);
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    const result = await sendWithBrevo(baseEmail);

    assert.deepEqual(result, { provider: "brevo", messageId: "msg-1", fallback: false });
    assert.equal(brevoSendMock.mock.callCount(), 1, "provider must be called exactly once");
    assert.equal(findOneAndUpdateMock.mock.callCount(), 2, "seed + reservation, no daily reset needed");
    assert.equal(updateOneMock.mock.callCount(), 0, "no rollback should be attempted on success");
  });

  test("reservation rejected (quota full) -> provider never called, no rollback, existing error preserved", async (t) => {
    brevoSendMock.mock.resetCalls();

    let call = 0;
    const responses = [
      { brevo: { count: 300, date: today() } }, // upsert-seed call
      null, // reservation finds no doc matching count < 300
    ];
    t.mock.method(Settings, "findOneAndUpdate", async () => responses[call++]);
    t.mock.method(Settings, "findOne", async () => ({ brevo: { count: 300, date: today() } }));
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await assert.rejects(
      () => sendWithBrevo(baseEmail),
      (err) => {
        // Existing error contract (message + .code) must be byte-for-byte preserved.
        assert.equal(err.message, "Daily Brevo limit reached");
        assert.equal(err.code, "quota_exceeded");
        return true;
      }
    );

    assert.equal(brevoSendMock.mock.callCount(), 0, "provider must never be called when reservation fails");
    assert.equal(updateOneMock.mock.callCount(), 0, "nothing was reserved, so nothing should be rolled back");
  });

  test("reservation succeeds, provider throws -> rollback executed exactly once", async (t) => {
    brevoSendMock.mock.resetCalls();
    brevoSendMock.mock.mockImplementation(async () => {
      throw new Error("simulated network failure");
    });

    let call = 0;
    const responses = [
      { brevo: { count: 50, date: today() } },
      { brevo: { count: 51, date: today() } },
    ];
    t.mock.method(Settings, "findOneAndUpdate", async () => responses[call++]);
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await assert.rejects(() => sendWithBrevo(baseEmail), /simulated network failure/);

    assert.equal(brevoSendMock.mock.callCount(), 1);
    assert.equal(updateOneMock.mock.callCount(), 1, "rollback must execute exactly once");
    const [, rollbackUpdate] = updateOneMock.mock.calls[0].arguments;
    assert.deepEqual(rollbackUpdate, { $inc: { "brevo.count": -1 } });
  });
});

describe("Resend quota reservation (Module 1.4)", () => {
  const freshWindowStart = () => new Date().toISOString();

  test("reservation succeeds, provider succeeds -> no rollback, response unchanged", async (t) => {
    resendSendMock.mock.resetCalls();
    resendSendMock.mock.mockImplementation(async () => ({ data: { id: "msg-1" }, error: null }));

    const ws = freshWindowStart();
    t.mock.method(Settings, "findOne", async () => ({ resend: { count: 50, windowStart: ws } }));
    t.mock.method(Settings, "findOneAndUpdate", async () => ({ resend: { count: 51, windowStart: ws } }));
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    const result = await sendWithResend(baseEmail);

    assert.deepEqual(result, { success: true, provider: "resend", data: { id: "msg-1" } });
    assert.equal(resendSendMock.mock.callCount(), 1);
    assert.equal(updateOneMock.mock.callCount(), 0, "no rollback should be attempted on success");
  });

  test("reservation rejected (quota full) -> provider never called, no rollback, existing error preserved", async (t) => {
    resendSendMock.mock.resetCalls();

    const ws = freshWindowStart();
    t.mock.method(Settings, "findOne", async () => ({ resend: { count: 100, windowStart: ws } }));
    t.mock.method(Settings, "findOneAndUpdate", async () => null);
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await assert.rejects(
      () => sendWithResend(baseEmail),
      (err) => {
        assert.equal(err.message, "Resend daily limit of 100 emails reached");
        assert.equal(err.name, "RateLimitError");
        assert.equal(err.status, 429);
        return true;
      }
    );

    assert.equal(resendSendMock.mock.callCount(), 0, "provider must never be called when reservation fails");
    assert.equal(updateOneMock.mock.callCount(), 0, "nothing was reserved, so nothing should be rolled back");
  });

  test("reservation succeeds, provider returns an error field -> rollback executed exactly once", async (t) => {
    resendSendMock.mock.resetCalls();
    resendSendMock.mock.mockImplementation(async () => ({ data: null, error: new Error("provider rejected") }));

    const ws = freshWindowStart();
    t.mock.method(Settings, "findOne", async () => ({ resend: { count: 50, windowStart: ws } }));
    t.mock.method(Settings, "findOneAndUpdate", async () => ({ resend: { count: 51, windowStart: ws } }));
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await assert.rejects(() => sendWithResend(baseEmail), /provider rejected/);

    assert.equal(updateOneMock.mock.callCount(), 1, "rollback must execute exactly once");
    const [, rollbackUpdate] = updateOneMock.mock.calls[0].arguments;
    assert.deepEqual(rollbackUpdate, { $inc: { "resend.count": -1 } });
  });

  test("reservation succeeds, provider throws an unexpected exception -> rollback still executed exactly once", async (t) => {
    resendSendMock.mock.resetCalls();
    resendSendMock.mock.mockImplementation(async () => {
      throw new Error("simulated network failure");
    });

    const ws = freshWindowStart();
    t.mock.method(Settings, "findOne", async () => ({ resend: { count: 50, windowStart: ws } }));
    t.mock.method(Settings, "findOneAndUpdate", async () => ({ resend: { count: 51, windowStart: ws } }));
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await assert.rejects(() => sendWithResend(baseEmail), /simulated network failure/);

    assert.equal(
      updateOneMock.mock.callCount(),
      1,
      "rollback must execute exactly once even for an exception the reservation logic didn't specifically anticipate"
    );
  });

  test("settings document does not exist -> quota check skipped entirely (pre-existing behavior, unmodified)", async (t) => {
    resendSendMock.mock.resetCalls();
    resendSendMock.mock.mockImplementation(async () => ({ data: { id: "msg-1" }, error: null }));

    t.mock.method(Settings, "findOne", async () => null);
    const findOneAndUpdateMock = t.mock.method(Settings, "findOneAndUpdate", async () => {
      throw new Error("must not be called when there is no settings document");
    });
    const updateOneMock = t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    const result = await sendWithResend(baseEmail);

    assert.deepEqual(result, { success: true, provider: "resend", data: { id: "msg-1" } });
    assert.equal(findOneAndUpdateMock.mock.callCount(), 0, "no reservation attempted -- unchanged pre-existing behavior");
    assert.equal(updateOneMock.mock.callCount(), 0);
  });
});
