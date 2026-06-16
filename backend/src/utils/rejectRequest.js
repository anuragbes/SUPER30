import { logSecurity } from "./logger.js";

/**
 * Centralised rejection helper.
 * Every 4xx response routes through here, guaranteeing a log entry for every rejection.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 409)
 * @param {string} reason - Machine-readable reason (e.g. "duplicate_registration")
 * @param {string} message - Human-readable message sent to the client
 */
export const rejectRequest = (req, res, statusCode, reason, message) => {
  logSecurity("REQUEST_REJECTED", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    reason,
  }, req);

  return res.status(statusCode).json({ error: message });
};
