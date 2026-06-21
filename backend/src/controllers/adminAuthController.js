import Admin from "../models/admin.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logError, logSecurity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const userAgent = req.headers["user-agent"] || "unknown";

    const admin = await Admin.findOne({ username });
    if (!admin) {
      logSecurity("LOGIN_FAILED", { reason: "InvalidCredentials", userAgent }, req);
      return rejectRequest(req, res, 401, "invalid_credentials", "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      logSecurity("LOGIN_FAILED", { reason: "InvalidCredentials", userAgent }, req);
      return rejectRequest(req, res, 401, "invalid_credentials", "Invalid credentials");
    }

    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Temporarily attach admin info to req so logSecurity can accurately extract the actor ID
    req.admin = { adminId: admin._id };
    
    logSecurity("LOGIN_SUCCESS", { userAgent }, req);
    
    res.json({ message: "Login successful", token, admin: { username: admin.username } });

  } catch (error) {
    logError("[AdminAuthController] adminLogin", error, req);
    res.status(500).json({ error: "An unexpected error occurred during login. Please try again." });
  }
};

export const adminLogout = (req, res) => {
  res.json({ message: "Logout successful" });
};

export const adminMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.adminId).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json({ admin: { username: admin.username } });
  } catch (error) {
    logError("[AdminAuthController] adminMe", error, req);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
};
