import { logError } from "./logger.js";

/**
 * Builds a SIGTERM/SIGINT handler that stops accepting new HTTP connections,
 * lets in-flight requests finish, closes the database connection, then
 * exits -- with a hard timeout so shutdown can never hang forever.
 *
 * Dependencies are injected (server/closeDb/log/onError/exit) so this
 * sequence is testable without a real HTTP server, a real MongoDB
 * connection, or ever calling the process's real exit.
 */
export const createGracefulShutdown = ({
  server,
  closeDb,
  timeoutMs = 30000,
  log = console.log,
  onError = logError,
  exit = process.exit,
}) => {
  let isShuttingDown = false;

  return (signal) => {
    if (isShuttingDown) {
      // A second signal arrived mid-shutdown -- ignore it and let the first
      // shutdown sequence continue rather than re-entering close()/exit()
      // from two places at once.
      return;
    }
    isShuttingDown = true;

    log(`[SHUTDOWN] ${signal} received. Closing server gracefully...`);

    // Deliberately not unref()'d: every path below calls exit() explicitly
    // and clears this timer first, so unref'ing would provide no benefit --
    // but it would risk exiting "naturally" without this diagnostic ever
    // firing, in the one edge case where server.close()'s callback never
    // fires at all.
    const forceExitTimer = setTimeout(() => {
      onError("SHUTDOWN_TIMEOUT", new Error(`Graceful shutdown did not complete within ${timeoutMs}ms; forcing exit.`));
      exit(1);
    }, timeoutMs);

    server.close(async (err) => {
      if (err) {
        onError("SHUTDOWN_SERVER_CLOSE_FAILED", err);
      } else {
        log("[SHUTDOWN] HTTP server closed (in-flight requests finished).");
      }

      try {
        await closeDb();
        log("[SHUTDOWN] MongoDB connection closed.");
      } catch (closeError) {
        onError("SHUTDOWN_MONGO_CLOSE_FAILED", closeError);
        clearTimeout(forceExitTimer);
        exit(1);
        return;
      }

      clearTimeout(forceExitTimer);
      log("[SHUTDOWN] Complete.");
      exit(0);
    });
  };
};
