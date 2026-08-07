import { test, describe } from "node:test";
import assert from "node:assert/strict";

// This file deliberately does NOT set/require GOOGLE_PRIVATE_KEY,
// GOOGLE_SERVICE_ACCOUNT_EMAIL, or GOOGLE_SHEET_ID -- the whole point is to
// prove that importing and partially using googleSheets.js does not depend
// on them being present. Any accidental reintroduction of eager
// (module-load-time) Google client construction would make this file's
// very first `await import(...)` throw and fail every test below.
delete process.env.GOOGLE_PRIVATE_KEY;
delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
delete process.env.GOOGLE_SHEET_ID;

describe("googleSheets.js lazy Google client initialization", () => {
  test("importing the module succeeds without any Google credentials in the environment", async () => {
    await assert.doesNotReject(() => import("../src/utils/googleSheets.js"));
  });

  test("credential-independent exports work normally with no Google credentials set", async () => {
    const { formatDateDDMMYYYY, getTargetSheet, headers } = await import("../src/utils/googleSheets.js");

    assert.equal(formatDateDDMMYYYY("2026-01-15"), "15/01/2026");
    assert.equal(formatDateDDMMYYYY(""), "Not Set");
    assert.equal(getTargetSheet({ stream: "PCM" }), "PCM");
    assert.equal(getTargetSheet({ stream: "PCB" }), "PCB");
    assert.equal(getTargetSheet({ classMoving: "Class 9" }), "Class 9");
    assert.ok(Array.isArray(headers) && headers.length > 0);
  });

  test("a Google-dependent export fails at CALL time, not import time, once credentials are genuinely required", async () => {
    const { getSheetIdByName } = await import("../src/utils/googleSheets.js");

    // The module imported cleanly (proven by the two tests above); only
    // *invoking* a function that actually talks to Google Sheets should
    // surface the missing-credentials failure -- and it should fail with
    // the same underlying error the old eager initialization would have
    // thrown at import time (a TypeError from calling .replace() on the
    // missing private key), not a different, newly-invented error shape.
    await assert.rejects(
      () => getSheetIdByName("PCM"),
      (err) => err instanceof TypeError && /replace/.test(err.message),
    );
  });
});
