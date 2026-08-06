import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRequest } from "../src/middlewares/sanitizeRequest.js";

// Minimal fake req/res -- this middleware never touches res, and next() is
// just observed for call count, so no Express app or DB is needed at all.
const runMiddleware = (req) => {
  let nextCalled = 0;
  sanitizeRequest(req, {}, () => {
    nextCalled += 1;
  });
  return nextCalled;
};

describe("sanitizeRequest (Module 1.3 -- NoSQL injection guard)", () => {
  test("strips a $-prefixed operator key from req.body", () => {
    const req = { body: { username: { $gt: "" }, password: "x" }, params: {} };
    const nextCalled = runMiddleware(req);

    assert.equal(nextCalled, 1);
    assert.deepEqual(req.body.username, {}, "the $gt operator must be removed");
    assert.equal(req.body.password, "x", "unrelated fields must be untouched");
  });

  test("strips a dotted key from req.body (nested-path injection attempt)", () => {
    const req = { body: { "user.role": "admin" }, params: {} };
    runMiddleware(req);

    assert.equal(Object.prototype.hasOwnProperty.call(req.body, "user.role"), false);
  });

  test("normal, legitimate request bodies pass through completely unchanged", () => {
    const original = {
      studentName: "John Doe",
      email: "john@example.com",
      parentMobile: "9876543210",
      previousResultPercentage: 88,
    };
    const req = { body: { ...original }, params: { studentId: "STU0042" } };
    const nextCalled = runMiddleware(req);

    assert.equal(nextCalled, 1);
    assert.deepEqual(req.body, original, "no legitimate field or value should ever be altered");
    assert.deepEqual(req.params, { studentId: "STU0042" });
  });

  test("strips injection attempts from req.params too", () => {
    const req = { body: {}, params: { id: { $ne: null } } };
    runMiddleware(req);

    assert.deepEqual(req.params.id, {});
  });

  test("gracefully handles a missing body (e.g. a GET request)", () => {
    const req = { params: {} };
    assert.doesNotThrow(() => runMiddleware(req));
    assert.equal(runMiddleware(req), 1);
  });

  test("gracefully handles missing params", () => {
    const req = { body: { foo: "bar" } };
    assert.doesNotThrow(() => runMiddleware(req));
  });

  test("regression guard: this middleware must never read or assign req.query", () => {
    // In Express 5, req.query is a live getter with no setter -- reassigning
    // it throws immediately. This test proves sanitizeRequest never touches
    // it at all, by making any access to `query` throw and confirming the
    // middleware still completes cleanly.
    const req = {
      body: { search: "John" },
      params: {},
      get query() {
        throw new Error("sanitizeRequest must never read req.query");
      },
      set query(_v) {
        throw new Error("sanitizeRequest must never assign req.query");
      },
    };

    assert.doesNotThrow(() => runMiddleware(req));
  });

  test("always calls next() exactly once, even with empty body/params", () => {
    const req = { body: {}, params: {} };
    assert.equal(runMiddleware(req), 1);
  });
});
