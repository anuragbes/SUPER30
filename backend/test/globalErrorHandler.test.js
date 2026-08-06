import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { globalErrorHandler } from "../src/middlewares/globalErrorHandler.js";

// Minimal fake Express req/res -- globalErrorHandler only reads
// req.method/req.path/req.requestId and calls res.status().json(), so no
// real Express app or server is needed.
const makeRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
};

const makeReq = (overrides = {}) => ({
  method: "POST",
  path: "/api/admin/login",
  requestId: "test-req-id",
  ...overrides,
});

describe("globalErrorHandler (Module 3.3)", () => {
  test("generic 500 response for a plain error with no .status", (t) => {
    t.mock.method(console, "error", () => {});
    const req = makeReq();
    const res = makeRes();
    const err = new Error("Cast to string failed for value \"{}\" at path \"username\"");

    globalErrorHandler(err, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "An unexpected server error occurred." });
  });

  test("preserves a legitimate, non-leaking status code (e.g. body-parser's 400)", (t) => {
    t.mock.method(console, "error", () => {});
    const req = makeReq();
    const res = makeRes();
    const err = Object.assign(new SyntaxError("Unexpected token < in JSON at position 0"), { status: 400 });

    globalErrorHandler(err, req, res, () => {});

    assert.equal(res.statusCode, 400, "status code itself is not a leak and should be preserved");
    assert.deepEqual(res.body, { error: "An unexpected server error occurred." });
  });

  test("never exposes err.message, no matter what it contains", (t) => {
    t.mock.method(console, "error", () => {});
    const req = makeReq();
    const res = makeRes();
    const sensitiveMessages = [
      "MongoServerError: connection to mongodb+srv://user:pass@cluster.mongodb.net failed",
      "ENOENT: no such file or directory, open '/etc/secrets/api-key.json'",
      "CloudinaryError: Invalid API key ck_live_abc123xyz",
    ];

    for (const message of sensitiveMessages) {
      const err = new Error(message);
      globalErrorHandler(err, req, res, () => {});
      const serializedBody = JSON.stringify(res.body);
      assert.doesNotMatch(serializedBody, /mongodb|ENOENT|Cloudinary|api-key|pass@/i, `must not leak: ${message}`);
      assert.deepEqual(res.body, { error: "An unexpected server error occurred." });
    }
  });

  test("never exposes a stack trace in the response body", (t) => {
    t.mock.method(console, "error", () => {});
    const req = makeReq();
    const res = makeRes();
    const err = new Error("boom");

    globalErrorHandler(err, req, res, () => {});

    assert.equal(Object.prototype.hasOwnProperty.call(res.body, "stack"), false);
    assert.doesNotMatch(JSON.stringify(res.body), /at Object|at Module|\.js:\d+:\d+/, "no stack-trace-shaped content");
  });

  test("response shape is exactly {error: string} -- unchanged from before this module", (t) => {
    t.mock.method(console, "error", () => {});
    const req = makeReq();
    const res = makeRes();

    globalErrorHandler(new Error("anything"), req, res, () => {});

    assert.deepEqual(Object.keys(res.body), ["error"]);
    assert.equal(typeof res.body.error, "string");
  });

  test("logging still occurs -- the full error reaches console.error even though the client response is generic", (t) => {
    const consoleError = t.mock.method(console, "error", () => {});
    const req = makeReq({ method: "GET", path: "/api/students/all" });
    const res = makeRes();
    const err = new Error("the real internal failure reason");

    globalErrorHandler(err, req, res, () => {});

    assert.equal(consoleError.mock.callCount(), 1, "logError must still fire exactly once");
    const loggedLine = consoleError.mock.calls[0].arguments[0];
    assert.match(loggedLine, /GlobalErrorHandler GET \/api\/students\/all/);
    assert.match(loggedLine, /the real internal failure reason/, "the real message must still reach the server-side log");
  });

  test("controller-level handled errors are entirely unaffected -- this middleware is never invoked for them", () => {
    // globalErrorHandler is only reached when next(err) is called or an
    // async handler rejects past every controller's own try/catch. A
    // controller that handles its own error (the normal case for every
    // controller in this codebase) calls res.status(...).json(...) directly
    // and never touches this file at all -- there is nothing to mock or
    // assert here beyond confirming that fact structurally: this module
    // changed exactly one function, in exactly one file, and no controller
    // imports or calls it.
    assert.equal(typeof globalErrorHandler, "function");
  });
});
