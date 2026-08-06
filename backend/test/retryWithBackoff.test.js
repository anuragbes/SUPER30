import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { retryWithBackoff, isRetryableError } from "../src/utils/retryWithBackoff.js";

const makeError = (props) => Object.assign(new Error("simulated failure"), props);

describe("isRetryableError -- classifies real Cloudinary/Google error shapes", () => {
  test("Cloudinary-shaped transient errors are retryable", () => {
    assert.equal(isRetryableError({ http_code: 429 }), true, "rate limited");
    assert.equal(isRetryableError({ http_code: 500 }), true);
    assert.equal(isRetryableError({ http_code: 503 }), true);
    assert.equal(isRetryableError({ http_code: 499, name: "TimeoutError" }), true, "Cloudinary's own timeout sentinel");
  });

  test("Cloudinary-shaped permanent errors are NOT retryable", () => {
    assert.equal(isRetryableError({ http_code: 400 }), false, "bad request");
    assert.equal(isRetryableError({ http_code: 401 }), false, "auth failure");
    assert.equal(isRetryableError({ http_code: 403 }), false, "forbidden");
    assert.equal(isRetryableError({ http_code: 404 }), false, "not found");
  });

  test("gaxios/Google-shaped transient errors are retryable (via .status)", () => {
    assert.equal(isRetryableError({ status: 429 }), true);
    assert.equal(isRetryableError({ status: 502 }), true);
    assert.equal(isRetryableError({ status: 504 }), true);
  });

  test("gaxios/Google-shaped permanent errors are NOT retryable", () => {
    assert.equal(isRetryableError({ status: 400 }), false);
    assert.equal(isRetryableError({ status: 401 }), false);
    assert.equal(isRetryableError({ status: 422 }), false, "validation error");
  });

  test("network-level errno codes (no HTTP response at all) are retryable", () => {
    for (const code of ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EPIPE"]) {
      assert.equal(isRetryableError({ code }), true, code);
    }
  });

  test("DOMException-style names (gaxios .code = cause.name) are retryable", () => {
    assert.equal(isRetryableError({ code: "TimeoutError" }), true);
    assert.equal(isRetryableError({ code: "AbortError" }), true);
  });

  test("unrecognized errors default to NOT retryable (fail-safe)", () => {
    assert.equal(isRetryableError({}), false);
    assert.equal(isRetryableError(new Error("some validation message")), false);
    assert.equal(isRetryableError({ code: "SOME_UNKNOWN_CODE" }), false);
    assert.equal(isRetryableError(undefined), false);
  });
});

describe("retryWithBackoff", () => {
  test("success on first attempt: fn called once, no delay", async () => {
    const fn = mock.fn(async () => "ok");
    const sleep = mock.fn(async () => {});

    const result = await retryWithBackoff(fn, { sleep });

    assert.equal(result, "ok");
    assert.equal(fn.mock.callCount(), 1);
    assert.equal(sleep.mock.callCount(), 0);
  });

  test("success after one retry: fn called twice, one delay", async () => {
    let calls = 0;
    const fn = mock.fn(async () => {
      calls += 1;
      if (calls === 1) throw makeError({ http_code: 503 });
      return "ok";
    });
    const sleep = mock.fn(async () => {});

    const result = await retryWithBackoff(fn, { sleep });

    assert.equal(result, "ok");
    assert.equal(fn.mock.callCount(), 2);
    assert.equal(sleep.mock.callCount(), 1);
  });

  test("success after two retries (the maximum budget): fn called three times, two delays", async () => {
    let calls = 0;
    const fn = mock.fn(async () => {
      calls += 1;
      if (calls < 3) throw makeError({ http_code: 503 });
      return "ok";
    });
    const sleep = mock.fn(async () => {});

    const result = await retryWithBackoff(fn, { sleep });

    assert.equal(result, "ok");
    assert.equal(fn.mock.callCount(), 3);
    assert.equal(sleep.mock.callCount(), 2);
  });

  test("retries exhausted: throws the final error after exactly 3 total attempts", async () => {
    const persistentError = makeError({ http_code: 503 });
    const fn = mock.fn(async () => {
      throw persistentError;
    });
    const sleep = mock.fn(async () => {});

    await assert.rejects(() => retryWithBackoff(fn, { sleep }), (err) => err === persistentError);

    assert.equal(fn.mock.callCount(), 3, "1 initial attempt + 2 retries, never a 4th");
    assert.equal(sleep.mock.callCount(), 2);
  });

  test("non-retryable error: fails immediately on the first attempt, no retries, no delay", async () => {
    const authError = makeError({ http_code: 401 });
    const fn = mock.fn(async () => {
      throw authError;
    });
    const sleep = mock.fn(async () => {});

    await assert.rejects(() => retryWithBackoff(fn, { sleep }), (err) => err === authError);

    assert.equal(fn.mock.callCount(), 1, "must not retry an auth failure");
    assert.equal(sleep.mock.callCount(), 0);
  });

  test("bounded exponential delay calculation: 300ms, then 600ms (base=300, factor=2)", async () => {
    let calls = 0;
    const fn = mock.fn(async () => {
      calls += 1;
      throw makeError({ http_code: 503 });
    });
    const sleep = mock.fn(async () => {});

    await assert.rejects(() => retryWithBackoff(fn, { sleep, baseDelayMs: 300 }));

    assert.deepEqual(
      sleep.mock.calls.map((c) => c.arguments[0]),
      [300, 600],
      "delay must double each retry, starting from baseDelayMs"
    );
  });

  test("custom maxRetries and baseDelayMs are respected", async () => {
    const fn = mock.fn(async () => {
      throw makeError({ http_code: 503 });
    });
    const sleep = mock.fn(async () => {});

    await assert.rejects(() => retryWithBackoff(fn, { sleep, maxRetries: 1, baseDelayMs: 50 }));

    assert.equal(fn.mock.callCount(), 2, "1 initial + 1 retry when maxRetries=1");
    assert.deepEqual(sleep.mock.calls.map((c) => c.arguments[0]), [50]);
  });

  test("a custom isRetryable override is honored instead of the default classifier", async () => {
    let calls = 0;
    const fn = mock.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error("anything at all");
      return "ok";
    });
    const sleep = mock.fn(async () => {});

    // Default classifier would NOT retry a bare Error with no known signal --
    // but an injected override can choose to.
    const result = await retryWithBackoff(fn, { sleep, isRetryable: () => true });

    assert.equal(result, "ok");
    assert.equal(fn.mock.callCount(), 2);
  });
});
