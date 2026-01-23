import { verifyToken } from "@clerk/clerk-sdk-node";

export const verifyClerkToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // 🔑 single source of truth
    req.clerkUserId = payload.sub;

    next();
  } catch (error) {
    console.error("Clerk token verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
