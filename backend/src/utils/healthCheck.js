// Mongoose connection readyState values (verified against the installed
// mongoose package's own lib/connectionstate.js):
//   0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting,
//   99 = uninitialized (connect() never called).
//
// Only "connected" (1) is treated as healthy. This is a readiness check --
// "connecting"/"disconnecting"/"uninitialized" all mean a DB-backed request
// arriving right now would be queued or fail, not served immediately, so
// none of them should be reported as healthy. Any value other than 1
// (including states not yet listed above) defaults to unhealthy, rather
// than requiring an exhaustive allow-list of "known bad" values.
const CONNECTED = 1;

/**
 * Maps a mongoose connection readyState to a health-check HTTP response.
 * Pure function -- no mongoose/DB access -- so it's testable with plain
 * numbers and can't accidentally run a query or open a connection.
 */
export const getHealthStatus = (readyState) => {
  if (readyState === CONNECTED) {
    return { httpStatus: 200, body: { status: "OK" } };
  }
  return { httpStatus: 503, body: { status: "unavailable" } };
};
