import { verifyToken } from "@clerk/clerk-sdk-node";
import { logError, logSecurity } from "../utils/logger.js";

export const verifyClerkToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logSecurity("UnauthorizedAccess", { reason: "MissingOrInvalidHeader" }, req);
    return res.status(401).json({ error: "Unauthorized" });
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
    logError("[AuthMiddleware] Clerk token verification failed", error);
    logSecurity("UnauthorizedAccess", { reason: "InvalidToken" }, req);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
