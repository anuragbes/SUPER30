import "dotenv/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import Student from "../src/models/student.models.js";
import Settings from "../src/models/settings.models.js";
import { getDashboardStats, getSummaryStats } from "../src/controllers/adminController.js";

// Minimal fake Express req/res -- both controllers only read req and call
// res.status().json(), so no real Express app or server is needed.
const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};
const makeReq = () => ({ requestId: "test-req-id" });

// A mock query function that tracks how many calls are simultaneously
// "in flight" (started but not yet resolved), so tests can prove queries
// actually run concurrently -- not just that the source code says
// Promise.all. If the implementation were still sequential (one await at a
// time), maxConcurrent could never exceed 1.
const makeConcurrencyTrackingMock = (impl, delayMs = 15) => {
  let inFlight = 0;
  let maxConcurrent = 0;
  const fn = async (...args) => {
    inFlight += 1;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise((r) => setTimeout(r, delayMs));
    inFlight -= 1;
    return impl(...args);
  };
  fn.getMaxConcurrent = () => maxConcurrent;
  return fn;
};

describe("getDashboardStats (Module 4.1 -- parallelized aggregations)", () => {
  test("all 7 groupBy aggregations run concurrently, not sequentially", async (t) => {
    const tracked = makeConcurrencyTrackingMock((pipeline) => {
      const field = pipeline[0].$group._id.slice(1); // "$gender" -> "gender"
      return [{ _id: `fake-${field}`, count: 1 }];
    });
    t.mock.method(Student, "aggregate", tracked);

    const req = makeReq();
    const res = makeRes();
    await getDashboardStats(req, res);

    assert.equal(
      tracked.getMaxConcurrent(),
      7,
      "all 7 aggregations must be in-flight simultaneously -- proves Promise.all, not sequential awaits"
    );
  });

  test("response shape and key order are unchanged", async (t) => {
    t.mock.method(Student, "aggregate", async (pipeline) => {
      const field = pipeline[0].$group._id.slice(1);
      return [{ _id: `${field}-value`, count: 5 }];
    });

    const req = makeReq();
    const res = makeRes();
    await getDashboardStats(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
      Object.keys(res.body),
      ["gender", "stream", "target", "classMoving", "testCentre", "studyCentre", "scholarship"],
      "key order must exactly match the pre-existing response contract"
    );
    assert.deepEqual(res.body.gender, [{ name: "gender-value", count: 5 }]);
  });

  test("null/missing group values still map to 'N/A' (pre-existing behavior, unchanged)", async (t) => {
    t.mock.method(Student, "aggregate", async () => [{ _id: null, count: 3 }]);

    const req = makeReq();
    const res = makeRes();
    await getDashboardStats(req, res);

    assert.equal(res.body.gender[0].name, "N/A");
  });

  test("error propagation: one rejected aggregation -> same generic 500, no partial data", async (t) => {
    let callCount = 0;
    t.mock.method(Student, "aggregate", async () => {
      callCount += 1;
      if (callCount === 3) throw new Error("simulated Mongo failure");
      return [{ _id: "x", count: 1 }];
    });

    const req = makeReq();
    const res = makeRes();
    await getDashboardStats(req, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Failed to load dashboard statistics." }, "identical to the pre-existing catch-block response");
    assert.equal(Object.prototype.hasOwnProperty.call(res.body, "gender"), false, "no partial statistics leaked into the error response");
  });
});

describe("getSummaryStats (Module 4.1 -- parallelized counts)", () => {
  const baseSettings = { brevo: { count: 0, date: "" }, resend: { count: 0, windowStart: null } };

  test("all 10 counts + the Settings read run concurrently, not sequentially", async (t) => {
    const trackedCount = makeConcurrencyTrackingMock(() => 1);
    const trackedFindOne = makeConcurrencyTrackingMock(() => baseSettings);
    t.mock.method(Student, "countDocuments", trackedCount);
    t.mock.method(Settings, "findOne", trackedFindOne);

    const req = makeReq();
    const res = makeRes();
    await getSummaryStats(req, res);

    assert.equal(trackedCount.getMaxConcurrent(), 10, "all 10 countDocuments calls must be in-flight simultaneously");
  });

  test("response shape and key order are unchanged", async (t) => {
    t.mock.method(Student, "countDocuments", async () => 42);
    t.mock.method(Settings, "findOne", async () => baseSettings);

    const req = makeReq();
    const res = makeRes();
    await getSummaryStats(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(res.body), [
      "totalStudents", "pcmCount", "pcbCount", "class8Count", "class9Count", "class10Count",
      "admitCardGenerated", "admitCardSent", "sentViaBrevo", "sentViaResend",
      "activeProvider", "brevo", "resend",
    ]);
    assert.equal(res.body.totalStudents, 42);
  });

  test("brevo/resend usage computation still correctly reads the resolved settings value", async (t) => {
    t.mock.method(Student, "countDocuments", async () => 0);
    const today = new Date().toISOString().split("T")[0];
    t.mock.method(Settings, "findOne", async () => ({
      brevo: { count: 150, date: today },
      resend: { count: 20, windowStart: new Date().toISOString() },
    }));

    const req = makeReq();
    const res = makeRes();
    await getSummaryStats(req, res);

    assert.equal(res.body.brevo.used, 150);
    assert.equal(res.body.brevo.remaining, 150);
    assert.equal(res.body.resend.used, 20);
  });

  test("error propagation: Settings.findOne rejecting -> same generic 500, no partial data", async (t) => {
    t.mock.method(Student, "countDocuments", async () => 1);
    t.mock.method(Settings, "findOne", async () => {
      throw new Error("simulated Mongo failure");
    });

    const req = makeReq();
    const res = makeRes();
    await getSummaryStats(req, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Failed to load summary statistics." });
    assert.equal(Object.prototype.hasOwnProperty.call(res.body, "totalStudents"), false);
  });
});
