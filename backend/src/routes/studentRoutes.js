import express from "express";
import multer from "multer";
import { registerStudent, getAllStudents, resetStudentIdCounter } from "../controllers/studentController.js";
import { generateAdmitCard } from "../controllers/admitCardController.js";
import upload, { MAX_FILE_SIZE_MB } from "../middlewares/upload.js";
import { logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

import { verifyClerkToken } from "../middlewares/authMiddleware.js";
import Student from "../models/student.models.js";
import { registrationLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/all", getAllStudents);
router.get("/admit-card/:studentId", generateAdmitCard);

// Multer error handler — wraps the upload middleware so file errors return clean JSON
const handleUpload = (req, res, next) => {
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "identityPhoto", maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();

    // File too large
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return rejectRequest(req, res, 400, "file_too_large",
        `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB per image.`);
    }

    // Wrong file type (thrown from fileFilter)
    if (err.code === "INVALID_FILE_TYPE") {
      return rejectRequest(req, res, 400, "invalid_file_type", err.message);
    }

    // Any other upload error
    return rejectRequest(req, res, 400, "upload_failed",
      "File upload failed. Please check your files and try again.");
  });
};

// REQUEST_START / REQUEST_END lifecycle logging — only for registration
const registrationLifecycle = (req, res, next) => {
  logActivity("REQUEST_START", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
  }, req);

  res.on("finish", () => {
    const durationMs = Date.now() - req.startTime;
    logActivity("REQUEST_END", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    }, req);
  });

  next();
};

router.post(
  "/register",
  registrationLifecycle,  // Log request lifecycle
  registrationLimiter,    // Rate limit registrations
  verifyClerkToken,       // Protect this route
  handleUpload,           // Upload files with error handling
  registerStudent
);

// Reset Counter Route
router.post("/reset-id-counter", resetStudentIdCounter);

export default router;
