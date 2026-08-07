import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { retryWithBackoff, isRetryableError } from "../src/utils/retryWithBackoff.js";

// A no-op sleep so tests run instantly instead of waiting through real
// exponential backoff delays.
const instantSleep = async () => {};

const axiosError = (status) => {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status };
  return err;
};

const networkError = () => {
  const err = new Error("Network Error");
  err.code = "ERR_NETWORK";
  return err;
};

const cancelledError = () => {
  const err = new Error("canceled");
  err.code = "ERR_CANCELED";
  err.name = "CanceledError";
  return err;
};

describe("isRetryableError (frontend classification)", () => {
  test("429/500/502/503/504 are retryable", () => {
    for (const status of [429, 500, 502, 503, 504]) {
      assert.equal(isRetryableError(axiosError(status)), true, `status ${status} should be retryable`);
    }
  });

  test("400/401/403/404 are NOT retryable", () => {
    for (const status of [400, 401, 403, 404]) {
      assert.equal(isRetryableError(axiosError(status)), false, `status ${status} should not be retryable`);
    }
  });

  test("a network error with no response (offline, CORS, DNS) is retryable", () => {
    assert.equal(isRetryableError(networkError()), true);
  });

  test("an explicit cancellation (AbortController) is NOT retryable", () => {
    assert.equal(isRetryableError(cancelledError()), false);
  });
});

describe("retryWithBackoff (bounded exponential backoff)", () => {
  test("succeeds on the first attempt -- fn called exactly once", async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls += 1;
      return "ok";
    }, { sleep: instantSleep });

    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  test("fails once with a transient error, then succeeds -- fn called exactly twice", async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls += 1;
      if (calls === 1) throw axiosError(503);
      return "ok";
    }, { sleep: instantSleep });

    assert.equal(result, "ok");
    assert.equal(calls, 2);
  });

  test("exhausts all 3 attempts on persistent transient failures, then throws the last error", async () => {
    let calls = 0;
    await assert.rejects(
      () => retryWithBackoff(async () => {
        calls += 1;
        throw axiosError(500);
      }, { sleep: instantSleep }),
      (err) => err.response.status === 500,
    );
    assert.equal(calls, 3, "must attempt exactly maxAttempts (3) times, never more");
  });

  test("a non-retryable error (404) is thrown immediately -- fn called exactly once, never retried", async () => {
    let calls = 0;
    await assert.rejects(
      () => retryWithBackoff(async () => {
        calls += 1;
        throw axiosError(404);
      }, { sleep: instantSleep }),
      (err) => err.response.status === 404,
    );
    assert.equal(calls, 1, "a non-transient error must not be retried at all");
  });

  test("respects a custom maxAttempts", async () => {
    let calls = 0;
    await assert.rejects(
      () => retryWithBackoff(async () => {
        calls += 1;
        throw axiosError(500);
      }, { sleep: instantSleep, maxAttempts: 1 }),
    );
    assert.equal(calls, 1, "maxAttempts: 1 means a single attempt, no retries");
  });

  test("uses exponential backoff delays (baseDelayMs * 2^(attempt-1)) between attempts", async () => {
    const delays = [];
    const sleep = async (ms) => { delays.push(ms); };

    await assert.rejects(() =>
      retryWithBackoff(async () => { throw axiosError(500); }, { sleep, baseDelayMs: 500 }),
    );

    assert.deepEqual(delays, [500, 1000], "2 waits between 3 attempts: 500ms then 1000ms");
  });

  test("cancellation stops the loop before the next attempt runs", async () => {
    let calls = 0;
    let cancelled = false;
    const sleep = async () => { cancelled = true; }; // simulate cancellation happening during the wait

    await assert.rejects(
      () => retryWithBackoff(async () => {
        calls += 1;
        throw axiosError(500);
      }, { sleep, isCancelled: () => cancelled }),
      (err) => err.name === "RetryCancelledError",
    );

    assert.equal(calls, 1, "must not attempt again once cancelled, even though attempts remained");
  });

  test("cancellation before the first attempt never calls fn at all", async () => {
    let calls = 0;
    await assert.rejects(
      () => retryWithBackoff(async () => { calls += 1; return "ok"; }, {
        sleep: instantSleep,
        isCancelled: () => true,
      }),
      (err) => err.name === "RetryCancelledError",
    );
    assert.equal(calls, 0);
  });

  test("an explicit cancellation error (AbortController) from fn itself is never retried", async () => {
    let calls = 0;
    await assert.rejects(
      () => retryWithBackoff(async () => {
        calls += 1;
        throw cancelledError();
      }, { sleep: instantSleep }),
      (err) => err.code === "ERR_CANCELED",
    );
    assert.equal(calls, 1);
  });
});
