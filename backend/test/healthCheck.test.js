import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getHealthStatus } from "../src/utils/healthCheck.js";

describe("getHealthStatus (Module 3.1 -- /health MongoDB readiness)", () => {
  test("connected (1) -> 200, unchanged existing body shape", () => {
    const result = getHealthStatus(1);
    assert.deepEqual(result, { httpStatus: 200, body: { status: "OK" } });
  });

  test("disconnected (0) -> 503, unhealthy", () => {
    const result = getHealthStatus(0);
    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.status, "unavailable");
  });

  test("connecting (2) -> 503, treated as not-ready rather than optimistically healthy", () => {
    const result = getHealthStatus(2);
    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.status, "unavailable");
  });

  test("disconnecting (3) -> 503, unhealthy (matches an in-progress graceful shutdown)", () => {
    const result = getHealthStatus(3);
    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.status, "unavailable");
  });

  test("uninitialized (99) -> 503, unhealthy (connect() never called)", () => {
    const result = getHealthStatus(99);
    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.status, "unavailable");
  });

  test("regression guard: any unrecognized future readyState value defaults to unhealthy, not healthy", () => {
    // Proves the implementation checks "=== 1" rather than enumerating
    // known-bad values -- a new state mongoose might introduce later fails
    // safe (unhealthy) instead of silently being treated as ready.
    for (const unknownValue of [4, -1, undefined, null, NaN]) {
      const result = getHealthStatus(unknownValue);
      assert.equal(result.httpStatus, 503, `readyState=${unknownValue} must not be treated as healthy`);
    }
  });

  test("response bodies never leak the raw readyState number or any infrastructure detail", () => {
    for (const state of [0, 1, 2, 3, 99]) {
      const { body } = getHealthStatus(state);
      const serialized = JSON.stringify(body);
      assert.doesNotMatch(serialized, /mongo/i);
      assert.doesNotMatch(serialized, /\b(0|1|2|3|99)\b/, "must not leak the raw readyState value");
    }
  });
});
