import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { createGracefulShutdown } from "../src/utils/gracefulShutdown.js";

// A fake http.Server whose close() only resolves once resolveClose() is
// called, so tests can control exactly when "in-flight requests finished"
// happens relative to other assertions.
const makeFakeServer = () => {
  let capturedCallback;
  return {
    close: mock.fn((cb) => {
      capturedCallback = cb;
    }),
    triggerCloseCallback: (err) => capturedCallback(err),
  };
};

const makeHarness = (overrides = {}) => {
  const server = overrides.server || makeFakeServer();
  const closeDb = overrides.closeDb || mock.fn(async () => {});
  const log = mock.fn();
  const onError = mock.fn();
  const exit = mock.fn();

  const shutdown = createGracefulShutdown({
    server,
    closeDb,
    timeoutMs: overrides.timeoutMs ?? 30000,
    log,
    onError,
    exit,
  });

  return { server, closeDb, log, onError, exit, shutdown };
};

describe("createGracefulShutdown (Module 3.2)", () => {
  test("happy path: closes server, then DB, then exits 0 -- in that order", async () => {
    const { server, closeDb, log, exit, shutdown } = makeHarness();

    shutdown("SIGTERM");
    assert.equal(server.close.mock.callCount(), 1, "server.close() must be called immediately");
    assert.equal(closeDb.mock.callCount(), 0, "DB must NOT be closed before the server finishes closing");

    server.triggerCloseCallback(null);
    // closeDb() is awaited internally -- flush microtasks so it resolves.
    await new Promise((r) => setImmediate(r));

    assert.equal(closeDb.mock.callCount(), 1, "DB close must happen only after server.close()'s callback fires");
    assert.equal(exit.mock.callCount(), 1);
    assert.deepEqual(exit.mock.calls[0].arguments, [0], "clean shutdown must exit 0");
    assert.ok(log.mock.calls.some((c) => c.arguments[0].includes("SIGTERM")), "must log which signal triggered shutdown");
  });

  test("guard: a second signal mid-shutdown is a no-op, does not double-close or double-exit", async () => {
    const { server, exit, shutdown } = makeHarness();

    shutdown("SIGTERM");
    shutdown("SIGINT"); // arrives while the first shutdown is still in progress
    shutdown("SIGTERM"); // and a third, for good measure

    assert.equal(server.close.mock.callCount(), 1, "close() must only ever be invoked once");

    server.triggerCloseCallback(null);
    await new Promise((r) => setImmediate(r));

    assert.equal(exit.mock.callCount(), 1, "exit() must only ever be called once, no matter how many signals arrive");
  });

  test("server.close() error: logged, but shutdown still proceeds to close the DB and exit", async () => {
    const { server, closeDb, onError, exit, shutdown } = makeHarness();
    const closeError = new Error("server was not listening");

    shutdown("SIGTERM");
    server.triggerCloseCallback(closeError);
    await new Promise((r) => setImmediate(r));

    assert.ok(
      onError.mock.calls.some((c) => c.arguments[0] === "SHUTDOWN_SERVER_CLOSE_FAILED"),
      "the server-close failure must be logged"
    );
    assert.equal(closeDb.mock.callCount(), 1, "DB close must still be attempted despite the server-close error");
    assert.deepEqual(exit.mock.calls[0].arguments, [0], "still exits 0 -- a close() callback error doesn't put any in-flight request at risk");
  });

  test("DB close throws: logged, exits 1, and does NOT also run the success path", async () => {
    const dbError = new Error("Mongo connection reset");
    const closeDb = mock.fn(async () => {
      throw dbError;
    });
    const { server, onError, exit, log, shutdown } = makeHarness({ closeDb });

    shutdown("SIGTERM");
    server.triggerCloseCallback(null);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    assert.ok(onError.mock.calls.some((c) => c.arguments[0] === "SHUTDOWN_MONGO_CLOSE_FAILED" && c.arguments[1] === dbError));
    assert.equal(exit.mock.callCount(), 1, "exit must be called exactly once");
    assert.deepEqual(exit.mock.calls[0].arguments, [1], "a DB close failure must exit with a non-zero code");
    assert.ok(!log.mock.calls.some((c) => c.arguments[0] === "[SHUTDOWN] Complete."), "the success 'Complete' log must NOT appear on this path");
  });

  test("timeout: if server.close() never calls back, the safety timer forces exit(1)", async () => {
    const server = { close: mock.fn(() => {}) }; // never invokes its callback -- simulates a hang
    const { onError, exit, shutdown } = makeHarness({ server, timeoutMs: 20 });

    shutdown("SIGTERM");
    await new Promise((r) => setTimeout(r, 60));

    assert.ok(onError.mock.calls.some((c) => c.arguments[0] === "SHUTDOWN_TIMEOUT"));
    assert.equal(exit.mock.callCount(), 1);
    assert.deepEqual(exit.mock.calls[0].arguments, [1]);
  });

  test("no timeout firing on the happy path: exit is called exactly once even after the timeout window would have elapsed", async () => {
    const { server, exit, shutdown } = makeHarness({ timeoutMs: 20 });

    shutdown("SIGTERM");
    server.triggerCloseCallback(null);
    await new Promise((r) => setImmediate(r));

    // Wait past the timeout window to prove it was correctly cleared, not
    // just "hasn't fired yet".
    await new Promise((r) => setTimeout(r, 60));

    assert.equal(exit.mock.callCount(), 1, "the (already-cleared) timeout must not cause a second exit call");
  });
});
