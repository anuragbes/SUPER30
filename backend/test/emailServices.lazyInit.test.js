import { test, describe } from "node:test";
import assert from "node:assert/strict";

// This file deliberately does NOT set/require RESEND_API_KEY or
// BREVO_API_KEY -- the whole point is to prove that importing these service
// modules (and anything that transitively imports them) does not depend on
// either being present. This is a direct regression test for the CI crash
// where importing adminRoutes.js (-> bulkAdmitController.js ->
// emailService.js -> resendService.js) threw "Missing API key" at import
// time, because `new Resend(undefined)` was constructed eagerly at module
// scope. Any reintroduction of eager provider-client construction here
// would make this file's very first `await import(...)` throw.
delete process.env.RESEND_API_KEY;
delete process.env.BREVO_API_KEY;
delete process.env.GOOGLE_PRIVATE_KEY;
delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

describe("resendService.js / brevoService.js lazy client initialization", () => {
  test("importing resendService.js succeeds without RESEND_API_KEY", async () => {
    await assert.doesNotReject(() => import("../src/services/resendService.js"));
  });

  test("importing brevoService.js succeeds without BREVO_API_KEY", async () => {
    await assert.doesNotReject(() => import("../src/services/brevoService.js"));
  });

  test("importing emailService.js (which re-exports both providers) succeeds with neither key set", async () => {
    await assert.doesNotReject(() => import("../src/services/emailService.js"));
  });

  test("a Resend client actually constructed without an API key still fails the same way it always did -- at call time, not import time", async () => {
    // Isolates the exact failure the eager top-level `new Resend(...)` used
    // to produce, independent of sendWithResend's own DB-dependent quota
    // logic (which is unrelated to this regression and already covered by
    // emailQuota.reservation.test.js).
    const { Resend } = await import("resend");
    assert.throws(
      () => new Resend(process.env.RESEND_API_KEY),
      (err) => /Missing API key/.test(err.message),
    );
  });

  test("regression: importing adminRoutes.js (the exact chain from the reported CI crash) succeeds with zero Resend/Brevo/Google credentials", async () => {
    // adminRoutes.js -> bulkAdmitController.js -> emailService.js ->
    // resendService.js/brevoService.js, and separately -> adminController.js
    // /admitCardController.js/studentController.js -> googleSheets.js. This
    // is the actual import graph that broke in CI.
    await assert.doesNotReject(() => import("../src/routes/adminRoutes.js"));
  });
});
