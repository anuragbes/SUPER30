import "dotenv/config";
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// generateRollNumbers unconditionally calls updatePCMAndPCB() at the end of
// every run -- replace the whole googleSheets module before adminController.js
// is imported, same mock.module() pattern as studentController.duplicateRegistration.test.js.
const updatePCMAndPCBMock = mock.fn(async () => {});

mock.module("../src/utils/googleSheets.js", {
  namedExports: {
    updatePCMAndPCB: (...args) => updatePCMAndPCBMock(...args),
    deleteStudentFromSheet: mock.fn(),
    clearRollNumbersFromSheet: mock.fn(),
    clearRollNumbersFromClassSheet: mock.fn(),
  },
});

const { generateRollNumbers } = await import("../src/controllers/adminController.js");
const { default: Student } = await import("../src/models/student.models.js");
const { default: Counter } = await import("../src/models/counter.models.js");
const { default: Settings } = await import("../src/models/settings.models.js");
const { default: AuditLog } = await import("../src/models/auditLog.models.js");

// generateRollNumbers now awaits recordAuditLog() (audit durability), which
// calls AuditLog.create() -- mocked here so it resolves immediately instead
// of hitting Mongoose's real (10s) buffering timeout with no live DB
// connection in this unit-test environment.
const mockAuditLogCreate = (t) => t.mock.method(AuditLog, "create", async () => {});

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

const makeReq = (overrides = {}) => ({ requestId: "test-req-id", body: {}, ...overrides });

// fetchStudents() calls Student.find(query).sort(...).lean() -- a chainable
// Mongoose Query, not a plain Promise -- so the mock must expose .sort()
// returning an object with .lean(), matching the real chain shape being
// called (lean() added by the Module P lean() audit).
const mockFind = (t, resolveBatch) =>
  t.mock.method(Student, "find", (query) => ({
    sort: () => ({
      lean: () => Promise.resolve(resolveBatch(query)),
    }),
  }));

// Simulates MongoDB's atomic findOneAndUpdate($inc, upsert:true): each id
// tracks its own running total, incremented synchronously (no await between
// read and write) so concurrent invocations can never observe or produce an
// overlapping range -- the same property the real atomic operation provides.
const makeAtomicCounterMock = (t) => {
  const totals = {};
  return t.mock.method(Counter, "findOneAndUpdate", async (filter, update) => {
    const current = totals[filter.id] || 0;
    const next = current + update.$inc.seq;
    totals[filter.id] = next;
    return { seq: next };
  });
};

describe("generateRollNumbers (Module 8 -- atomic roll-number counter coverage)", () => {
  test("senior mode: PCM and PCB roll numbers are assigned uniquely and in ascending order from each group's base offset", async (t) => {
    updatePCMAndPCBMock.mock.resetCalls();
    t.mock.method(Settings, "findOne", async () => ({ formMode: "senior" }));
    mockAuditLogCreate(t);
    mockFind(t, (query) => {
      if (query.stream === "PCM") return [{ _id: "pcm-1" }, { _id: "pcm-2" }, { _id: "pcm-3" }];
      if (query.stream === "PCB") return [{ _id: "pcb-1" }, { _id: "pcb-2" }];
      return [];
    });
    makeAtomicCounterMock(t);
    const bulkWriteMock = t.mock.method(Student, "bulkWrite", async () => ({}));

    const req = makeReq({ body: { order: "alphabetical" } });
    const res = makeRes();
    await generateRollNumbers(req, res);

    assert.equal(res.statusCode, null, "no explicit status call on success path -- unchanged from before this test");
    assert.deepEqual(res.body.assigned, { PCM: 3, PCB: 2 });

    const ops = bulkWriteMock.mock.calls[0].arguments[0];
    const rollNumbersByStudent = Object.fromEntries(
      ops.map((op) => [op.updateOne.filter._id, op.updateOne.update.$set.rollNo])
    );

    assert.deepEqual(
      [rollNumbersByStudent["pcm-1"], rollNumbersByStudent["pcm-2"], rollNumbersByStudent["pcm-3"]],
      [4001, 4002, 4003],
      "PCM roll numbers must be assigned in ascending order starting at the 4000 base"
    );
    assert.deepEqual(
      [rollNumbersByStudent["pcb-1"], rollNumbersByStudent["pcb-2"]],
      [6001, 6002],
      "PCB roll numbers must be assigned in ascending order starting at the 6000 base"
    );

    const allRollNumbers = Object.values(rollNumbersByStudent);
    assert.equal(new Set(allRollNumbers).size, allRollNumbers.length, "no two students may receive the same roll number");
    assert.equal(updatePCMAndPCBMock.mock.callCount(), 1);
  });

  test("junior mode: Class 8/9/10 roll numbers are assigned uniquely per class, using each class's own base offset", async (t) => {
    updatePCMAndPCBMock.mock.resetCalls();
    t.mock.method(Settings, "findOne", async () => ({ formMode: "junior" }));
    mockAuditLogCreate(t);
    mockFind(t, (query) => {
      if (query.classMoving === "Class 8") return [{ _id: "c8-1" }, { _id: "c8-2" }];
      if (query.classMoving === "Class 9") return [{ _id: "c9-1" }];
      if (query.classMoving === "Class 10") return [{ _id: "c10-1" }, { _id: "c10-2" }, { _id: "c10-3" }];
      return [];
    });
    makeAtomicCounterMock(t);
    const bulkWriteMock = t.mock.method(Student, "bulkWrite", async () => ({}));

    const req = makeReq({ body: { order: "alphabetical" } });
    const res = makeRes();
    await generateRollNumbers(req, res);

    assert.deepEqual(res.body.assigned, { "Class 8": 2, "Class 9": 1, "Class 10": 3 });

    const ops = bulkWriteMock.mock.calls[0].arguments[0];
    const rollNumbersByStudent = Object.fromEntries(
      ops.map((op) => [op.updateOne.filter._id, op.updateOne.update.$set.rollNo])
    );

    assert.deepEqual([rollNumbersByStudent["c8-1"], rollNumbersByStudent["c8-2"]], [8001, 8002]);
    assert.deepEqual([rollNumbersByStudent["c9-1"]], [9001]);
    assert.deepEqual(
      [rollNumbersByStudent["c10-1"], rollNumbersByStudent["c10-2"], rollNumbersByStudent["c10-3"]],
      [10001, 10002, 10003]
    );

    const allRollNumbers = Object.values(rollNumbersByStudent);
    assert.equal(new Set(allRollNumbers).size, allRollNumbers.length, "no two students, even across different classes, may collide");
  });

  test("concurrent calls to generateRollNumbers never assign overlapping PCM roll numbers", async (t) => {
    updatePCMAndPCBMock.mock.resetCalls();
    t.mock.method(Settings, "findOne", async () => ({ formMode: "senior" }));
    mockAuditLogCreate(t);

    // Two concurrent admin requests, each picking up a different (disjoint)
    // batch of students still missing a roll number -- exactly what the
    // noRollQuery filter guarantees against duplicate assignment in practice.
    // generateRollNumbers makes exactly one Student.find({stream:"PCM"}) call
    // per invocation, so a simple call counter reliably hands out two
    // disjoint batches regardless of exact interleaving order.
    let pcmFindCalls = 0;
    const batches = [
      [{ _id: "pcm-a1" }, { _id: "pcm-a2" }, { _id: "pcm-a3" }],
      [{ _id: "pcm-b1" }, { _id: "pcm-b2" }],
    ];
    mockFind(t, (query) => {
      if (query.stream !== "PCM") return [];
      return batches[pcmFindCalls++];
    });
    makeAtomicCounterMock(t);

    const capturedOps = [];
    t.mock.method(Student, "bulkWrite", async (ops) => {
      capturedOps.push(...ops);
      return {};
    });

    await Promise.all([
      generateRollNumbers(makeReq({ body: { order: "alphabetical" } }), makeRes()),
      generateRollNumbers(makeReq({ body: { order: "alphabetical" } }), makeRes()),
    ]);

    const rollNumbers = capturedOps.map((op) => op.updateOne.update.$set.rollNo);
    assert.equal(rollNumbers.length, 5, "both concurrent requests' students must all be present");
    assert.equal(new Set(rollNumbers).size, 5, "concurrent invocations must never assign the same roll number twice");
  });

  test("regression: a group with zero unassigned students is skipped entirely -- no Counter call, no bulkWrite ops for it", async (t) => {
    updatePCMAndPCBMock.mock.resetCalls();
    t.mock.method(Settings, "findOne", async () => ({ formMode: "senior" }));
    mockAuditLogCreate(t);
    mockFind(t, (query) => {
      if (query.stream === "PCM") return [{ _id: "pcm-1" }];
      return []; // PCB has nobody waiting for a roll number
    });
    const counterMock = makeAtomicCounterMock(t);
    const bulkWriteMock = t.mock.method(Student, "bulkWrite", async () => ({}));

    const req = makeReq({ body: { order: "alphabetical" } });
    const res = makeRes();
    await generateRollNumbers(req, res);

    assert.deepEqual(res.body.assigned, { PCM: 1, PCB: 0 });
    assert.equal(
      counterMock.mock.calls.some((c) => c.arguments[0].id === "pcbRoll"),
      false,
      "an empty group must never reserve a counter range -- pre-existing behavior, unchanged"
    );
    const ops = bulkWriteMock.mock.calls[0].arguments[0];
    assert.equal(ops.length, 1, "only the PCM student should appear in the bulk write");
  });
});
