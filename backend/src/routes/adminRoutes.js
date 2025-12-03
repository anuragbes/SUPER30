import express from "express";
import { adminLogin } from "../controllers/adminAuthController.js";
import { deleteAllStudents, generateRollNumbers, getDashboardStats, getExamSettings, getSummaryStats, updateExamSettings } from "../controllers/adminController.js";
import { adminAuth } from "../middlewares/adminAuth.js";
import { bulkGenerateAdmitCards, bulkSendAdmitCards } from "../controllers/bulkAdmitController.js";


const router = express.Router();

// ====== PUBLIC ROUTES ======
// Admin Login
router.post("/login", adminLogin);

// Get Exam Settings (Public - needed for Home page)
router.get("/exam-settings", getExamSettings);


// ====== PROTECTED ROUTES ======
// Generate Roll Number
router.post("/generate-rollno", adminAuth, generateRollNumbers);

// Delete all students
router.delete("/clear-database", adminAuth, deleteAllStudents);

// Generate and send Admit Card
router.post("/bulk-generate-admit-cards", adminAuth, bulkGenerateAdmitCards);
router.post("/bulk-send-admit-cards", adminAuth, bulkSendAdmitCards);

// Dashboard Stats
router.get("/dashboard-stats", adminAuth, getDashboardStats);
router.get("/summary-stats", adminAuth, getSummaryStats);

// Update Exam Settings (Protected)
router.post("/exam-settings", adminAuth, updateExamSettings);

export default router;