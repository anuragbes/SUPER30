import Admin from "../models/admin.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logError, logSecurity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";
import { recordAuditLog } from "../utils/auditLog.js";

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const userAgent = req.headers["user-agent"] || "unknown";

    const admin = await Admin.findOne({ username });
    if (!admin) {
      logSecurity("LOGIN_FAILED", { reason: "InvalidCredentials", userAgent }, req);
      await recordAuditLog({
        req,
        action: "ADMIN_LOGIN",
        resourceType: "Admin",
        summary: `Failed login attempt for username "${username}"`,
        success: false,
        adminId: null,
        adminUsername: username || "unknown",
        metadata: { reason: "invalid_credentials" },
      });
      return rejectRequest(req, res, 401, "invalid_credentials", "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      logSecurity("LOGIN_FAILED", { reason: "InvalidCredentials", userAgent }, req);
      await recordAuditLog({
        req,
        action: "ADMIN_LOGIN",
        resourceType: "Admin",
        resourceId: admin._id,
        summary: `Failed login attempt for username "${username}"`,
        success: false,
        adminId: null,
        adminUsername: username || "unknown",
        metadata: { reason: "invalid_credentials" },
      });
      return rejectRequest(req, res, 401, "invalid_credentials", "Invalid credentials");
    }

    const token = jwt.sign(
  { adminId: admin._id },
  process.env.JWT_SECRET,
  { expiresIn: "12h" }
);

req.admin = { adminId: admin._id };

logSecurity("LOGIN_SUCCESS", { userAgent }, req);
await recordAuditLog({
  req,
  action: "ADMIN_LOGIN",
  resourceType: "Admin",
  resourceId: admin._id,
  summary: `Admin "${admin.username}" logged in`,
  success: true,
  adminId: admin._id,
  adminUsername: admin.username,
});

res.cookie("adminToken", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 12 * 60 * 60 * 1000,
});

return res.json({
  message: "Login successful",
  token,
  admin: {
    username: admin.username,
  },
});

  } catch (error) {
    logError("[AdminAuthController] adminLogin", error, req);
    res.status(500).json({ error: "An unexpected error occurred during login. Please try again." });
  }
};

export const adminLogout = async (req, res) => {
  await recordAuditLog({
    req,
    action: "ADMIN_LOGOUT",
    resourceType: "Admin",
    summary: `Admin logged out`,
    success: true,
  });

  res.clearCookie("adminToken", {
  secure: true,
  sameSite: "none",
});

  res.json({
    message: "Logout successful",
  });
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
