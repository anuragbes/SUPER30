import jwt from "jsonwebtoken";
import { logError } from "../utils/logger.js";


export function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized access" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    logError("[AdminAuth] JWT verification failed", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};