import express from "express";
import multer from "multer";
import { registerStudent, getAllStudents, resetStudentIdCounter } from "../controllers/studentController.js";
import { generateAdmitCard } from "../controllers/admitCardController.js";
import upload, { MAX_FILE_SIZE_MB } from "../middlewares/upload.js";

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
      return res.status(400).json({
        error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB per image.`,
      });
    }

    // Wrong file type (thrown from fileFilter)
    if (err.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({ error: err.message });
    }

    // Any other upload error
    return res.status(400).json({
      error: "File upload failed. Please check your files and try again.",
    });
  });
};

router.post(
  "/register",
  registrationLimiter,  // Rate limit registrations
  verifyClerkToken,     // Protect this route
  handleUpload,         // Upload files with error handling
  registerStudent
);

// Reset Counter Route
router.post("/reset-id-counter", resetStudentIdCounter);

export default router;

