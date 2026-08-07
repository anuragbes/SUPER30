import "dotenv/config";
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// Importing adminRoutes.js (for the route-permissions check below) pulls in
// every controller, and several of them import googleSheets.js -- replaced
// here in full (same mock.module() pattern as
// studentController.duplicateRegistration.test.js) so nothing in this file
// risks a real Google Sheets API call, and every named export any
// transitively-imported controller needs is still present.
const appendToGoogleSheetMock = mock.fn();
mock.module("../src/utils/googleSheets.js", {
  namedExports: {
    formatDateDDMMYYYY: () => "01/01/2026",
    getSheetIdByName: async () => 0,
    headers: [],
    getTargetSheet: () => "PCM",
    ensureSheetExists: async () => {},
    appendToGoogleSheet: (...args) => appendToGoogleSheetMock(...args),
    updatePCMAndPCB: async () => {},
    deleteStudentFromSheet: async () => {},
    clearRollNumbersFromSheet: async () => {},
    clearRollNumbersFromClassSheet: async () => {},
  },
});

const { recordAuditLog } = await import("../src/utils/auditLog.js");
const { getAuditLogs } = await import("../src/controllers/auditLogController.js");
const { resetStudentIdCounter } = await import("../src/controllers/studentController.js");
const { default: AuditLog } = await import("../src/models/auditLog.models.js");
const { default: Admin } = await import("../src/models/admin.models.js");
const { default: Counter } = await import("../src/models/counter.models.js");
const { default: adminRoutes } = await import("../src/routes/adminRoutes.js");

const makeReq = (overrides = {}) => ({
  requestId: "test-req-id",
  method: "POST",
  originalUrl: "/api/admin/x",
  ip: "203.0.113.5",
  headers: { "user-agent": "TestAgent/1.0" },
  admin: { adminId: "admin-id-123" },
  query: {},
  ...overrides,
});

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

describe("recordAuditLog (Step 3 -- audit record creation)", () => {
  test("creates exactly one AuditLog document with the expected fields", async (t) => {
    const createMock = t.mock.method(AuditLog, "create", async (doc) => doc);
    t.mock.method(Admin, "findById", () => ({
      select: () => ({ lean: async () => ({ username: "root_admin" }) }),
    }));

    await recordAuditLog({
      req: makeReq(),
      action: "TEST_ACTION",
      resourceType: "Test",
      resourceId: "abc123",
      summary: "Did a test thing",
      success: true,
      metadata: { foo: "bar" },
    });

    assert.equal(createMock.mock.callCount(), 1, "exactly one audit record per audited action");
    const doc = createMock.mock.calls[0].arguments[0];
    assert.equal(doc.adminId, "admin-id-123");
    assert.equal(doc.adminUsername, "root_admin");
    assert.equal(doc.action, "TEST_ACTION");
    assert.equal(doc.resourceType, "Test");
    assert.equal(doc.resourceId, "abc123");
    assert.equal(doc.summary, "Did a test thing");
    assert.equal(doc.ip, "203.0.113.5");
    assert.equal(doc.userAgent, "TestAgent/1.0");
    assert.equal(doc.success, true);
    assert.deepEqual(doc.metadata, { foo: "bar" });
  });

  test("resourceId is stringified", async (t) => {
    const createMock = t.mock.method(AuditLog, "create", async (doc) => doc);
    t.mock.method(Admin, "findById", () => ({ select: () => ({ lean: async () => ({ username: "a" }) }) }));

    await recordAuditLog({
      req: makeReq(),
      action: "X",
      resourceId: { toString: () => "507f1f77bcf86cd799439011" },
      summary: "y",
      success: true,
    });

    assert.equal(createMock.mock.calls[0].arguments[0].resourceId, "507f1f77bcf86cd799439011");
  });

  test("explicit adminId/adminUsername overrides skip the Admin lookup (failed-login case)", async (t) => {
    const createMock = t.mock.method(AuditLog, "create", async (doc) => doc);
    const findByIdMock = t.mock.method(Admin, "findById", () => {
      throw new Error("must not be called when adminUsername is explicitly provided");
    });

    await recordAuditLog({
      req: makeReq({ admin: undefined }),
      action: "ADMIN_LOGIN",
      summary: "Failed login attempt",
      success: false,
      adminId: null,
      adminUsername: "someone_who_doesnt_exist",
    });

    assert.equal(findByIdMock.mock.callCount(), 0);
    const doc = createMock.mock.calls[0].arguments[0];
    assert.equal(doc.adminId, null);
    assert.equal(doc.adminUsername, "someone_who_doesnt_exist");
    assert.equal(doc.success, false);
  });

  test("never throws or rejects when AuditLog.create fails -- error is logged, not propagated", async (t) => {
    t.mock.method(AuditLog, "create", async () => { throw new Error("Mongo write failed"); });
    t.mock.method(Admin, "findById", () => ({ select: () => ({ lean: async () => null }) }));

    await assert.doesNotReject(() =>
      recordAuditLog({ req: makeReq(), action: "X", summary: "y", success: true }),
    );
  });

  test("truncates an overlong summary to the storage cap", async (t) => {
    const createMock = t.mock.method(AuditLog, "create", async (doc) => doc);
    t.mock.method(Admin, "findById", () => ({ select: () => ({ lean: async () => ({ username: "a" }) }) }));

    await recordAuditLog({ req: makeReq(), action: "X", summary: "x".repeat(1000), success: true });

    assert.equal(createMock.mock.calls[0].arguments[0].summary.length, 300);
  });

  test("bounds an unexpectedly oversized metadata object instead of storing it whole", async (t) => {
    const createMock = t.mock.method(AuditLog, "create", async (doc) => doc);
    t.mock.method(Admin, "findById", () => ({ select: () => ({ lean: async () => ({ username: "a" }) }) }));

    await recordAuditLog({
      req: makeReq(),
      action: "X",
      summary: "y",
      success: true,
      metadata: { data: "x".repeat(5000) },
    });

    const doc = createMock.mock.calls[0].arguments[0];
    assert.equal(doc.metadata.truncated, true);
  });
});

describe("audit logging is awaited but never blocks/fails the primary operation (Step 3 requirement)", () => {
  test("resetStudentIdCounter still succeeds (200) when AuditLog.create rejects", async (t) => {
    t.mock.method(Counter, "updateOne", async () => ({ acknowledged: true }));
    const createMock = t.mock.method(AuditLog, "create", async () => { throw new Error("DB unavailable"); });
    t.mock.method(Admin, "findById", () => ({ select: () => ({ lean: async () => ({ username: "a" }) }) }));

    const req = makeReq({ method: "POST", originalUrl: "/api/students/reset-id-counter" });
    const res = makeRes();
    // resetStudentIdCounter awaits recordAuditLog() internally, so by the
    // time this resolves, the (failed) audit write has already been
    // attempted -- no artificial flush needed to observe it.
    await resetStudentIdCounter(req, res);

    assert.equal(res.statusCode, 200, "the primary operation's response must be unaffected by an audit-log failure");
    assert.deepEqual(res.body, { message: "Student ID counter has been reset to STU0001" });
    assert.equal(createMock.mock.callCount(), 1, "an audit write must still have been attempted");
  });

  test("resetStudentIdCounter still succeeds (200) when the Admin username lookup itself throws", async (t) => {
    t.mock.method(Counter, "updateOne", async () => ({ acknowledged: true }));
    t.mock.method(AuditLog, "create", async (doc) => doc);
    t.mock.method(Admin, "findById", () => { throw new Error("Mongo read failed"); });

    const req = makeReq({ method: "POST", originalUrl: "/api/students/reset-id-counter" });
    const res = makeRes();
    await resetStudentIdCounter(req, res);

    assert.equal(res.statusCode, 200);
  });
});

describe("getAuditLogs (Step 4 -- query API)", () => {
  const mockFind = (t, { total, page = [] }) => {
    t.mock.method(AuditLog, "countDocuments", async () => total);
    t.mock.method(AuditLog, "find", (query) => ({
      sort: (sortSpec) => ({
        skip: (skipCount) => ({
          limit: (limitCount) => ({
            lean: async () => page,
          }),
        }),
      }),
    }));
  };

  test("returns paginated results with the expected envelope shape, newest first by default", async (t) => {
    const fakeLogs = [{ action: "STUDENT_DELETED" }];
    mockFind(t, { total: 120, page: fakeLogs });

    const req = makeReq({ method: "GET", query: { page: "2" } });
    const res = makeRes();
    await getAuditLogs(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, fakeLogs);
    assert.equal(res.body.totalRecords, 120);
    assert.equal(res.body.totalPages, 3); // ceil(120 / 50)
    assert.equal(res.body.currentPage, 2);
  });

  test("action filter is applied as an exact match", async (t) => {
    let capturedQuery;
    t.mock.method(AuditLog, "countDocuments", async (query) => { capturedQuery = query; return 0; });
    t.mock.method(AuditLog, "find", (query) => ({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    }));

    await getAuditLogs(makeReq({ method: "GET", query: { action: "STUDENT_DELETED" } }), makeRes());

    assert.equal(capturedQuery.action, "STUDENT_DELETED");
  });

  test("search is regex-escaped before being applied (ReDoS/injection-safe, same pattern as getAllStudents)", async (t) => {
    let capturedQuery;
    t.mock.method(AuditLog, "countDocuments", async (query) => { capturedQuery = query; return 0; });
    t.mock.method(AuditLog, "find", () => ({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    }));

    await getAuditLogs(makeReq({ method: "GET", query: { search: "(a+)+$" } }), makeRes());

    const orConditions = capturedQuery.$or;
    assert.ok(Array.isArray(orConditions) && orConditions.length === 3);
    for (const cond of orConditions) {
      const [field] = Object.keys(cond);
      assert.doesNotMatch(cond[field].$regex, /\(a\+\)\+\$/, "the raw metacharacter pattern must not reach MongoDB unescaped");
    }
  });

  test("date range filter builds an inclusive $gte/$lte on timestamp", async (t) => {
    let capturedQuery;
    t.mock.method(AuditLog, "countDocuments", async (query) => { capturedQuery = query; return 0; });
    t.mock.method(AuditLog, "find", () => ({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    }));

    await getAuditLogs(
      makeReq({ method: "GET", query: { from: "2026-01-01", to: "2026-01-31" } }),
      makeRes(),
    );

    assert.ok(capturedQuery.timestamp.$gte instanceof Date);
    assert.ok(capturedQuery.timestamp.$lte instanceof Date);
  });

  test("an invalid date string is silently ignored rather than corrupting the query", async (t) => {
    let capturedQuery;
    t.mock.method(AuditLog, "countDocuments", async (query) => { capturedQuery = query; return 0; });
    t.mock.method(AuditLog, "find", () => ({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    }));

    await getAuditLogs(makeReq({ method: "GET", query: { from: "not-a-date" } }), makeRes());

    assert.equal(capturedQuery.timestamp, undefined);
  });

  test("sort=oldest reverses to ascending timestamp order", async (t) => {
    let capturedSortSpec;
    t.mock.method(AuditLog, "countDocuments", async () => 0);
    t.mock.method(AuditLog, "find", () => ({
      sort: (spec) => { capturedSortSpec = spec; return { skip: () => ({ limit: () => ({ lean: async () => [] }) }) }; },
    }));

    await getAuditLogs(makeReq({ method: "GET", query: { sort: "oldest" } }), makeRes());
    assert.deepEqual(capturedSortSpec, { timestamp: 1 });
  });

  test("defaults to newest-first when sort is omitted", async (t) => {
    let capturedSortSpec;
    t.mock.method(AuditLog, "countDocuments", async () => 0);
    t.mock.method(AuditLog, "find", () => ({
      sort: (spec) => { capturedSortSpec = spec; return { skip: () => ({ limit: () => ({ lean: async () => [] }) }) }; },
    }));

    await getAuditLogs(makeReq({ method: "GET", query: {} }), makeRes());
    assert.deepEqual(capturedSortSpec, { timestamp: -1 });
  });
});

describe("audit-logs route permissions (Step 4 -- read-only, admin-only)", () => {
  test("GET /audit-logs is registered behind the adminAuth middleware", () => {
    const layer = adminRoutes.stack.find((l) => l.route?.path === "/audit-logs");
    assert.ok(layer, "route must be registered");
    assert.ok(layer.route.methods.get, "route must be a GET (read-only)");
    assert.ok(!layer.route.methods.post && !layer.route.methods.patch && !layer.route.methods.delete,
      "route must not accept any write method");

    const handlerNames = layer.route.stack.map((s) => s.name);
    assert.ok(handlerNames.includes("adminAuth"), "must be protected by adminAuth");
    assert.ok(
      handlerNames.indexOf("adminAuth") < handlerNames.indexOf("getAuditLogs"),
      "adminAuth must run before the handler",
    );
  });
});
