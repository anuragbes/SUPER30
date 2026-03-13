import Announcement from "../models/announcement.models.js";

/**
 * @desc    Create a new announcement (Admin)
 * @route   POST /admin/announcement
 * @access  Admin
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const announcement = await Announcement.create({
      title,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Failed to create announcement:", error);
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
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
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.status(200).json({
      success: true,
      message: `Announcement ${
        announcement.isActive ? "activated" : "deactivated"
      } successfully`,
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update announcement status",
      error: error.message,
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
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, message },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update announcement",
      error: error.message,
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
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
      error: error.message,
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
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    res.status(200).json({
      success: true,
      message: `Announcement ${
        announcement.isPinned ? "pinned" : "unpinned"
      } successfully`,
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update announcement pin status",
      error: error.message,
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
      error: error.message,
    });
  }
};
