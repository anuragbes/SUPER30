/**
 * Production-grade logger for the backend.
 *
 * Features:
 * - Safe serialization (handles circular references)
 * - Automatic field redaction (passwords, tokens, PII)
 * - Request correlation via requestId
 * - Never crashes during logging
 */

// Fields that must never appear in logs
const REDACTED_FIELDS = new Set([
  // PII
  "studentName", "parentMobile", "studentMobile", "whatsappMobile",
  "title", "content", "posterName", "identityPhotoURL", "passportPhotoURL",
  "fatherName", "motherName", "permanentAddress", "presentAddress",
  "parentEmail",
  // Security
  "password", "token", "accessToken", "refreshToken", "otp", "secret", "authorization",
]);

/**
 * Safely stringify any value, handling circular references and redacting sensitive fields.
 */
const safeStringify = (obj) => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (REDACTED_FIELDS.has(key)) return "[REDACTED]";
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    });
  } catch {
    return "[Unserializable]";
  }
};

/**
 * Format log data as key=value pairs, stripping out redacted fields.
 */
const formatLogData = (data = {}) => {
  try {
    return Object.entries(data)
      .filter(([key, v]) => !REDACTED_FIELDS.has(key) && v !== undefined && v !== null && v !== "")
      .map(([k, v]) => {
        if (typeof v === "object") return `${k}=${safeStringify(v)}`;
        return `${k}=${v}`;
      })
      .join(" ");
  } catch {
    return "[FormatError]";
  }
};

/**
 * Extract actor identity from request.
 */
const getActor = (req) => {
  try {
    return req?.admin?.adminId
      ? `admin:${req.admin.adminId}`
      : req?.clerkUserId
      ? `user:${req.clerkUserId}`
      : "system";
  } catch {
    return "system";
  }
};

/**
 * Structured error logger.
 * Logs to stderr only. Nothing from here is sent to frontend users.
 */
export const logError = (context, error, req = null) => {
  try {
    const errorInfo = {
      message: error?.message || String(error),
      code: error?.code,
      status: error?.status || error?.statusCode,
      reason: error?.reason,
      action: error?.action,
      stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    };

    const requestId = req?.requestId || "";
    const ridPart = requestId ? ` requestId=${requestId}` : "";

    console.error(`[ERROR] [${context}]${ridPart} ${safeStringify(errorInfo)}`);
  } catch (err) {
    console.error(`[ERROR] [LoggerError] Failed to log: ${err?.message || "unknown"}`);
  }
};

/**
 * Business activity logger.
 * Use for state-changing operations (registrations, deletions, settings updates).
 */
export const logActivity = (event, data = {}, req = null) => {
  try {
    const timestamp = new Date().toISOString();
    const actor = getActor(req);
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
    const requestId = req?.requestId || "";

    const dataString = formatLogData(data);
    const ridPart = requestId ? `requestId=${requestId} ` : "";
    const meta = `actor=${actor} ip=${ip}`;

    console.log(`[ACTIVITY] [${event}] timestamp=${timestamp} ${ridPart}${dataString} ${meta}`.trim());
  } catch (err) {
    console.error(`[ERROR] [LoggerError] logActivity failed: ${err?.message || "unknown"}`);
  }
};

/**
 * Security event logger.
 * Use for auth failures, login attempts, rate limits, and request rejections.
 */
export const logSecurity = (event, data = {}, req = null) => {
  try {
    const timestamp = new Date().toISOString();
    const actor = getActor(req);
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
    const requestId = req?.requestId || "";

    const dataString = formatLogData(data);
    const ridPart = requestId ? `requestId=${requestId} ` : "";
    const meta = `actor=${actor} ip=${ip}`;

    console.log(`[SECURITY] [${event}] timestamp=${timestamp} ${ridPart}${dataString} ${meta}`.trim());
  } catch (err) {
    console.error(`[ERROR] [LoggerError] logSecurity failed: ${err?.message || "unknown"}`);
  }
};

/**
 * Email operation logger.
 * Use for all email-related events: sends, quota checks, resets, and provider failures.
 * Provides a single grep-able log stream for debugging email quota issues.
 *
 * Events:
 *   EMAIL_SENT        - Provider accepted the email
 *   EMAIL_FAILED      - Provider rejected the email
 *   QUOTA_RESET       - Daily/window quota counter was reset
 *   QUOTA_EXCEEDED    - Send blocked because quota is full
 *   QUOTA_INCREMENT   - Counter incremented after successful send
 */
export const logEmail = (event, data = {}, req = null) => {
  try {
    const timestamp = new Date().toISOString();
    const actor = getActor(req);
    const requestId = req?.requestId || "";

    const dataString = formatLogData(data);
    const ridPart = requestId ? `requestId=${requestId} ` : "";

    console.log(`[EMAIL] [${event}] timestamp=${timestamp} ${ridPart}${dataString} actor=${actor}`.trim());
  } catch (err) {
    console.error(`[ERROR] [LoggerError] logEmail failed: ${err?.message || "unknown"}`);
  }
};