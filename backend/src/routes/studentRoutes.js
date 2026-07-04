import express from "express";
import multer from "multer";
import { registerStudent, getAllStudents, resetStudentIdCounter, getMyRegistrations } from "../controllers/studentController.js";
import { generateAdmitCard } from "../controllers/admitCardController.js";
import { memoryUpload, MAX_FILE_SIZE_MB } from "../middlewares/upload.js";
import { logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

import { verifyClerkToken } from "../middlewares/authMiddleware.js";
import Student from "../models/student.models.js";
import { registrationLimiter } from "../middlewares/rateLimiter.js";
import { adminAuth } from "../middlewares/adminAuth.js";

const router = express.Router();

router.get("/all", adminAuth, getAllStudents);
router.get("/my-registrations", verifyClerkToken, getMyRegistrations);
router.get("/admit-card/:studentId", adminAuth, generateAdmitCard);

// Multer error handler — wraps the upload middleware so file errors return clean JSON
const handleUpload = (req, res, next) => {
  memoryUpload.fields([
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

// Removed request start/end lifecycle logging
router.post(
  "/register",
  registrationLimiter,    // Rate limit registrations
  verifyClerkToken,       // Protect this route
  handleUpload,           // Upload files with error handling
  registerStudent
);

// Reset Counter Route
router.post("/reset-id-counter", adminAuth, resetStudentIdCounter);

export default router;
