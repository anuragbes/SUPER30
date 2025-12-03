import express from "express";
import { registerStudent, getAllStudents, resetStudentIdCounter } from "../controllers/studentController.js";
import { generateAdmitCard } from "../controllers/admitCardController.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.get("/all", getAllStudents);
router.get("/admit-card/:studentId", generateAdmitCard);

router.post(
  "/register",
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "identityPhoto", maxCount: 1 },
  ]),
  registerStudent
);

// ✅ Reset Counter Route
router.post("/reset-id-counter", resetStudentIdCounter);

export default router;
