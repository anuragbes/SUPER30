import express from "express";
import { adminLogin } from "../controllers/adminAuthController.js";
import { deleteAllStudents, deleteStudent, generateRollNumbers, getDashboardStats, getExamSettings, getSummaryStats, updateExamSettings, removeRollNumbers } from "../controllers/adminController.js";
import { adminAuth } from "../middlewares/adminAuth.js";
import { bulkGenerateAdmitCards, bulkSendAdmitCards } from "../controllers/bulkAdmitController.js";
import { createAnnouncement, deleteAnnouncement, getActiveAnnouncements, getAllAnnouncements, toggleAnnouncementPin, toggleAnnouncementStatus, updateAnnouncement } from "../controllers/announcementController.js";


const router = express.Router();

// ====== PUBLIC ROUTES ======
// Admin Login
router.post("/login", adminLogin);

// Get Exam Settings (Public - needed for Home page)
router.get("/exam-settings", getExamSettings);

// Announcements (Public - needed for Home page)
router.get("/announcements", getActiveAnnouncements);


// ====== PROTECTED ROUTES ======
// Generate Roll Number
router.post("/generate-rollno", adminAuth, generateRollNumbers);

// Remove Roll Numbers
router.post("/remove-rollno", adminAuth, removeRollNumbers);

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


// Announcement
router.post("/announcements", adminAuth, createAnnouncement);
router.get("/announcements", adminAuth, getAllAnnouncements);
router.patch("/announcements/:id", adminAuth, updateAnnouncement);
router.patch("/announcements/:id/toggle", adminAuth, toggleAnnouncementStatus);
router.patch("/announcements/:id/pin", adminAuth, toggleAnnouncementPin);
router.delete("/announcements/:id", adminAuth, deleteAnnouncement);



router.delete("/delete-student/:studentId", adminAuth, deleteStudent);


export default router;