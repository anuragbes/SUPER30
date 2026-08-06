import { logError } from "../utils/logger.js";

// Last-resort safety net for errors that bypass every controller's own
// try/catch (all of which already return their own specific, safe
// messages). The full error (message, stack in non-production) is still
// logged server-side via logError; only the client-facing message is
// generic, since err.message can carry raw database/SDK/filesystem text
// never meant for a client. The status code is preserved (e.g. body-
// parser's 400 for malformed JSON is legitimate, actionable information,
// not a leak).
export const globalErrorHandler = (err, req, res, next) => {
  logError(`GlobalErrorHandler ${req.method} ${req.path}`, err, req);
  res.status(err.status || 500).json({
    error: "An unexpected server error occurred.",
  });
};
