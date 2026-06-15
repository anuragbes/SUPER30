/**
 * Central error logger for the backend.
 *
 * Logs structured error details to the server console only.
 * Nothing from here should be sent directly to frontend users.
 */

export const logError = (context, error) => {
  try {
    const errorInfo = {
      name: error?.name || "UnknownError",
      message: error?.message || String(error),
      code: error?.code || "N/A",
      status: error?.status || error?.statusCode || "N/A",
      reason: error?.reason || "N/A",
      action: error?.action || "N/A",
      stack: error?.stack || "No stack available",
    };

    console.error(
      `${context}\n${JSON.stringify(errorInfo, null, 2)}`
    );

    // Optional: Keep raw error for debugging unknown issues
    if (
      process.env.NODE_ENV !== "production" ||
      !error?.message
    ) {
      console.error("Raw Error Object:", error);
    }
  } catch (loggerError) {
    console.error(`${context}: Failed to log error`);
    console.error("Original Error:", error);
    console.error("Logger Error:", loggerError);
  }
};

/**
 * Activity logger for state-changing business events.
 *
 * Usage:
 *   logActivity("StudentRegistered", { studentId, stream }, req);
 *   logActivity("StudentDeleted",    { studentId },         req);  // admin actor auto-extracted
 *
 * Rules:
 *  - NO full PII: never log name, email, phone, address, DOB, parent names
 *  - studentId and stream/class are safe system identifiers
 *  - For admin actions, actor is extracted from req.admin (set by adminAuth JWT middleware)
 */
export const logActivity = (event, data = {}, req = null) => {
  const timestamp = new Date().toISOString();

  // Extract actor for admin actions (from JWT payload set by adminAuth)
  const actor = req?.admin?.adminId
    ? `admin:${req.admin.adminId}`
    : req?.clerkUserId
    ? `user:${req.clerkUserId}`
    : "system";

  const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";

  const entry = {
    timestamp,
    event,
    actor,
    ip,
    ...data,
  };

  console.log(`📋 [ACTIVITY] ${JSON.stringify(entry)}`);
};