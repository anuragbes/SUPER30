import Admin from "../models/admin.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logError, logActivity } from "../utils/logger.js";

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const userAgent = req.headers["user-agent"] || "unknown";

    const admin = await Admin.findOne({ username });
    if (!admin) {
      logActivity("AdminLoginFailed", { username, reason: "Admin not found", userAgent }, req);
      return res.status(404).json({ error: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      logActivity("AdminLoginFailed", { username, reason: "Invalid password", userAgent }, req);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Temporarily attach admin info to req so logActivity can accurately extract the actor ID
    req.admin = { adminId: admin._id };
    
    logActivity("AdminLoginSuccess", { username, userAgent }, req);
    res.json({ message: "Login successful", token });

  } catch (error) {
    logError("[AdminAuthController] adminLogin", error);
    res.status(500).json({ error: "An unexpected error occurred during login. Please try again." });
  }
};

