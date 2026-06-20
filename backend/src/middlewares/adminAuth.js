import jwt from "jsonwebtoken";
import { logError, logSecurity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";


export function adminAuth(req, res, next) {
  const token = req.cookies?.adminToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    logSecurity("UNAUTHORIZED_ACCESS", { reason: "MissingToken" }, req);
    return rejectRequest(req, res, 401, "missing_token", "Unauthorized access");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    const isExpired = error.name === "TokenExpiredError";
    const event = isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    const reason = isExpired ? "TokenExpired" : "InvalidSignature";

    logError("[AdminAuth] JWT verification failed", error, req);
    logSecurity(event, { reason }, req);
    return rejectRequest(req, res, 401, reason.toLowerCase(), "Invalid or expired token");
  }
};