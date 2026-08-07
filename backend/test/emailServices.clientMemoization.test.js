import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// Fake-but-present credentials: the lazy getters must actually succeed in
// constructing a client (not merely avoid throwing) for this file to prove
// anything about memoization -- emailServices.lazyInit.test.js already
// covers the "no credentials at all" import-safety case separately.
process.env.RESEND_API_KEY = "fake-resend-key";
process.env.BREVO_API_KEY = "fake-brevo-key";

let resendConstructCount = 0;
let brevoConstructCount = 0;
const resendSendMock = mock.fn(async () => ({ data: { id: "msg-1" }, error: null }));
const brevoSendMock = mock.fn(async () => ({ body: { messageId: "msg-1" } }));

// mock.module() must run before the first import of resendService.js /
// brevoService.js anywhere in this process -- always a separate node:test
// worker process from emailServices.lazyInit.test.js, so neither file's
// mocks leak into the other.
mock.module("resend", {
  namedExports: {
    Resend: class {
      constructor() {
        resendConstructCount++;
      }
      emails = { send: (...args) => resendSendMock(...args) };
    },
  },
});

mock.module("@getbrevo/brevo", {
  namedExports: {
    BrevoClient: class {
      constructor() {
        brevoConstructCount++;
      }
      transactionalEmails = { sendTransacEmail: (...args) => brevoSendMock(...args) };
    },
  },
});

const { sendWithResend } = await import("../src/services/resendService.js");
const { sendWithBrevo } = await import("../src/services/brevoService.js");
const { default: Settings } = await import("../src/models/settings.models.js");

const baseEmail = {
  from: "British School - Gurukul <noreply@bsgurukul.com>",
  to: "student@example.com",
  subject: "Admit Card",
  html: "<p>hi</p>",
};

describe("resendService.js getResendClient() memoization", () => {
  test("initialization occurs exactly once across sequential sends, and repeated calls reuse the same client", async (t) => {
    const ws = new Date().toISOString();
    t.mock.method(Settings, "findOne", async () => ({ resend: { count: 50, windowStart: ws } }));
    t.mock.method(Settings, "findOneAndUpdate", async () => ({ resend: { count: 51, windowStart: ws } }));
    t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await sendWithResend(baseEmail);
    await sendWithResend(baseEmail);
    await sendWithResend(baseEmail);

    assert.equal(resendSendMock.mock.callCount(), 3, "sanity check: all three sends actually reached the provider");
    assert.equal(resendConstructCount, 1, "Resend must be constructed exactly once, not once per send");
  });
});

describe("brevoService.js getBrevoClient() memoization", () => {
  test("initialization occurs exactly once across sequential sends, and repeated calls reuse the same client", async (t) => {
    const today = new Date().toISOString().split("T")[0];
    // sendWithBrevo makes TWO findOneAndUpdate calls per invocation (the
    // seed upsert, then the atomic reservation increment) -- a fixed
    // response array indexed by call count would need to track that exactly
    // and silently go out-of-bounds (-> undefined -> spurious "Daily Brevo
    // limit reached") if it ever changed. Always returning a valid,
    // already-today response is correct for both call sites: it keeps
    // `settings.brevo.date === today` (skips the reset branch) and keeps
    // `reserved` truthy (skips the quota-exceeded branch), regardless of
    // which of the two call sites is asking.
    t.mock.method(Settings, "findOneAndUpdate", async () => ({ brevo: { count: 50, date: today } }));
    t.mock.method(Settings, "updateOne", async () => ({ matchedCount: 1, modifiedCount: 1 }));

    await sendWithBrevo(baseEmail);
    await sendWithBrevo(baseEmail);
    await sendWithBrevo(baseEmail);

    assert.equal(brevoSendMock.mock.callCount(), 3, "sanity check: all three sends actually reached the provider");
    assert.equal(brevoConstructCount, 1, "BrevoClient must be constructed exactly once, not once per send");
  });
});
