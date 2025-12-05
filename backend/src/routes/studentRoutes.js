import express from "express";
import { registerStudent, getAllStudents, resetStudentIdCounter } from "../controllers/studentController.js";
import { generateAdmitCard } from "../controllers/admitCardController.js";
import upload from "../middlewares/upload.js";

import { verifyFirebaseToken } from "../middlewares/authMiddleware.js";
import Student from "../models/student.models.js";

const router = express.Router();

router.get("/all", getAllStudents);
router.get("/admit-card/:studentId", generateAdmitCard);

// Check if phone number is already registered
router.post("/check-phone", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const student = await Student.findOne({
      $or: [
        { studentMobile: phoneNumber },
        { parentMobile: phoneNumber }
      ]
    });

    if (student) {
      return res.json({ exists: true, message: "Phone number already registered" });
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error("Error checking phone number:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/register",
  verifyFirebaseToken, // Protect this route
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "identityPhoto", maxCount: 1 },
  ]),
  registerStudent
);

// ✅ Reset Counter Route
router.post("/reset-id-counter", resetStudentIdCounter);

export default router;
