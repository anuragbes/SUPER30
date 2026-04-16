import express from "express";
import { registerStudent, getAllStudents, resetStudentIdCounter } from "../controllers/studentController.js";
import { generateAdmitCard } from "../controllers/admitCardController.js";
import upload from "../middlewares/upload.js";

import { verifyClerkToken } from "../middlewares/authMiddleware.js";
import Student from "../models/student.models.js";
import { registrationLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/all", getAllStudents);
router.get("/admit-card/:studentId", generateAdmitCard);


router.post(
  "/register",
  registrationLimiter, // Rate limit registrations
  verifyClerkToken, // Protect this route
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "identityPhoto", maxCount: 1 },
  ]),
  registerStudent
);

// ✅ Reset Counter Route
router.post("/reset-id-counter", resetStudentIdCounter);



export default router;
