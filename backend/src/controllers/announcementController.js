import Announcement from "../models/announcement.models.js";
import { logError, logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

/**
 * @desc    Create a new announcement (Admin)
 * @route   POST /admin/announcement
 * @access  Admin
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return rejectRequest(req, res, 400, "missing_fields", "Title and message are required");
    }

    const announcement = await Announcement.create({
      title,
      message,
    });

    logActivity("AnnouncementCreated", { announcementId: announcement._id }, req);
    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    logError("[AnnouncementController] createAnnouncement", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to create announcement",
    });
  }};

/**
 * @desc    Get all announcements (Admin)
 * @route   GET /admin/announcement
 * @access  Admin
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({
      isPinned: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    logError("[AnnouncementController] getAllAnnouncements", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
    });
  }
};

/**
 * @desc    Toggle announcement active status (Admin)
 * @route   PATCH /admin/announcement/:id/toggle
 * @access  Admin
 */
export const toggleAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return rejectRequest(req, res, 404, "announcement_not_found", "Announcement not found");
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    logActivity("AnnouncementToggled", { announcementId: id, isActive: announcement.isActive }, req);
    res.status(200).json({
      success: true,
      message: `Announcement ${announcement.isActive ? "activated" : "deactivated"} successfully`,
      data: announcement,
    });
  } catch (error) {
    logError("[AnnouncementController] toggleAnnouncementStatus", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to update announcement status",
    });
  }
};

/**
 * @desc    Update an announcement (Admin)
 * @route   PATCH /admin/announcement/:id
 * @access  Admin
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return rejectRequest(req, res, 400, "missing_fields", "Title and message are required");
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, message },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return rejectRequest(req, res, 404, "announcement_not_found", "Announcement not found");
    }

    logActivity("AnnouncementUpdated", { announcementId: id }, req);
    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    logError("[AnnouncementController] updateAnnouncement", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to update announcement",
    });
  }
};

/**
 * @desc    Delete an announcement (Admin)
 * @route   DELETE /admin/announcement/:id
 * @access  Admin
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return rejectRequest(req, res, 404, "announcement_not_found", "Announcement not found");
    }

    logActivity("AnnouncementDeleted", { announcementId: id }, req);
    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    logError("[AnnouncementController] deleteAnnouncement", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
    });
  }
};

/**
 * @desc    Toggle announcement pin status (Admin)
 * @route   PATCH /admin/announcements/:id/pin
 * @access  Admin
 */
export const toggleAnnouncementPin = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return rejectRequest(req, res, 404, "announcement_not_found", "Announcement not found");
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    logActivity("AnnouncementPinToggled", { announcementId: id, isPinned: announcement.isPinned }, req);
    res.status(200).json({
      success: true,
      message: `Announcement ${announcement.isPinned ? "pinned" : "unpinned"} successfully`,
      data: announcement,
    });
  } catch (error) {
    logError("[AnnouncementController] toggleAnnouncementPin", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to update announcement pin status",
    });
  }
};

/**
 * @desc    Get active announcements (Public)
 * @route   GET /announcements
 * @access  Public
 */
export const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({
      isPinned: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    logError("[AnnouncementController] getActiveAnnouncements", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
    });
  }
};
