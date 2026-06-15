/**
 * Central error logger for the backend.
 *
 * Logs structured error details to the server console only.
 * Nothing from here should be sent directly to frontend users.
 */

export const logError = (context, error) => {
  try {
    const errorInfo = {
      message: error?.message || String(error),
      code: error?.code,
      status: error?.status || error?.statusCode,
      reason: error?.reason,
      action: error?.action,
      stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    };

    console.error(`❌ [${context}] ${JSON.stringify(errorInfo)}`);
  } catch (err) {
    console.error(`❌ [LoggerError] Failed to log: ${err.message}`);
  }
};

const formatLogData = (data = {}) => {
  const { 
    studentName, email, parentMobile, studentMobile, whatsappMobile,
    title, content, posterName, identityPhotoURL, passportPhotoURL, 
    username, password, fatherName, motherName, permanentAddress, presentAddress, ...safeData 
  } = data;

  return Object.entries(safeData)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
};

const getActor = (req) => {
  return req?.admin?.adminId 
    ? `admin:${req.admin.adminId}` 
    : req?.clerkUserId 
    ? `user:${req.clerkUserId}` 
    : "system";
};

export const logActivity = (event, data = {}, req = null) => {
  const timestamp = new Date().toISOString();
  const actor = getActor(req);
  const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
  
  const dataString = formatLogData(data);
  const meta = `actor=${actor} ip=${ip}`;
  
  console.log(`📋 [${event}] timestamp=${timestamp} ${dataString} ${meta}`.trim());
};

export const logSecurity = (event, data = {}, req = null) => {
  const timestamp = new Date().toISOString();
  const actor = getActor(req);
  const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
  
  const dataString = formatLogData(data);
  const meta = `actor=${actor} ip=${ip}`;
  
  console.log(`🔐 [${event}] timestamp=${timestamp} ${dataString} ${meta}`.trim());
};