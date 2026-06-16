import { verifyToken } from "@clerk/clerk-sdk-node";
import { logError, logSecurity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

export const verifyClerkToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logSecurity("UNAUTHORIZED_ACCESS", { reason: "MissingAuthHeader" }, req);
    return rejectRequest(req, res, 401, "missing_auth_header", "Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60 * 1000, // 60 seconds of leeway for clock sync issues
    });

    // single source of truth
    req.clerkUserId = payload.sub;

    next();
  } catch (error) {
    logError("[AuthMiddleware] Clerk token verification failed", error, req);
    logSecurity("TOKEN_INVALID", { reason: error.reason || "VerificationFailed" }, req);
    return rejectRequest(req, res, 401, "invalid_token", "Unauthorized");
  }
};
