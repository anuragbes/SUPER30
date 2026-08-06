import Poster from "../models/poster.models.js";
import { cloudinary } from "../middlewares/upload.js";
import { logError, logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";
import { retryWithBackoff } from "../utils/retryWithBackoff.js";

/**
 * @desc    Upload one or more posters (Admin)
 * @route   POST /api/admin/posters
 * @access  Admin
 */
export const uploadPoster = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return rejectRequest(req, res, 400, "no_files_uploaded", "Please upload at least one image");
    }

    // Get the highest current order value
    const maxOrderPoster = await Poster.findOne().sort({ order: -1 });
    let nextOrder = maxOrderPoster ? maxOrderPoster.order + 1 : 0;

    const posters = [];
    for (const file of req.files) {
      const poster = await Poster.create({
        imageUrl: file.path,
        publicId: file.filename,
        order: nextOrder++,
      });
      posters.push(poster);
    }

    logActivity("PostersUploaded", { count: posters.length, posterIds: posters.map(p => p._id) }, req);
    res.status(201).json({
      success: true,
      message: `${posters.length} poster(s) uploaded successfully`,
      data: posters,
    });
  } catch (error) {
    logError("[PosterController] uploadPoster", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to upload poster",
    });
  }
};

/**
 * @desc    Get all posters (Admin)
 * @route   GET /api/admin/posters/all
 * @access  Admin
 */
export const getAllPosters = async (req, res) => {
  try {
    const posters = await Poster.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: posters,
    });
  } catch (error) {
    logError("[PosterController] getAllPosters", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posters",
    });
  }
};

/**
 * @desc    Get active posters (Public - for AutoSlider)
 * @route   GET /api/admin/posters
 * @access  Public
 */
export const getActivePosters = async (req, res) => {
  try {
    const posters = await Poster.find({ isActive: true }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: posters,
    });
  } catch (error) {
    logError("[PosterController] getActivePosters", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posters",
    });
  }
};

/**
 * @desc    Toggle poster active status (Admin)
 * @route   PATCH /api/admin/posters/:id/toggle
 * @access  Admin
 */
export const togglePosterStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const poster = await Poster.findById(id);

    if (!poster) {
      return rejectRequest(req, res, 404, "poster_not_found", "Poster not found");
    }

    poster.isActive = !poster.isActive;
    await poster.save();

    logActivity("PosterStatusToggled", { posterId: id, isActive: poster.isActive }, req);
    res.status(200).json({
      success: true,
      message: `Poster ${poster.isActive ? "activated" : "deactivated"} successfully`,
      data: poster,
    });
  } catch (error) {
    logError("[PosterController] togglePosterStatus", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to update poster status",
    });
  }
};

/**
 * @desc    Reorder posters (Admin)
 * @route   PATCH /api/admin/posters/reorder
 * @access  Admin
 */
export const reorderPosters = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return rejectRequest(req, res, 400, "invalid_ordered_ids", "orderedIds array is required");
    }

    // Update order for each poster
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index },
      },
    }));

    await Poster.bulkWrite(bulkOps);

    const posters = await Poster.find().sort({ order: 1 });

    logActivity("PostersReordered", { count: orderedIds.length }, req);
    res.status(200).json({
      success: true,
      message: "Posters reordered successfully",
      data: posters,
    });
  } catch (error) {
    logError("[PosterController] reorderPosters", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to reorder posters",
    });
  }
};

/**
 * @desc    Delete a poster (Admin)
 * @route   DELETE /api/admin/posters/:id
 * @access  Admin
 */
export const deletePoster = async (req, res) => {
  try {
    const { id } = req.params;

    const poster = await Poster.findById(id);

    if (!poster) {
      return rejectRequest(req, res, 404, "poster_not_found", "Poster not found");
    }

    // Delete from Cloudinary (retried on transient failures -- deletion is
    // idempotent, so retrying an already-deleted/nonexistent asset is a safe
    // no-op, not a duplication risk)
    try {
      await retryWithBackoff(() => cloudinary.uploader.destroy(poster.publicId));
    } catch (cloudErr) {
      logError("[PosterController] deletePoster - Cloudinary", cloudErr, req);
      // Continue with DB deletion even if Cloudinary fails
    }

    await Poster.findByIdAndDelete(id);

    logActivity("PosterDeleted", { posterId: id }, req);
    res.status(200).json({
      success: true,
      message: "Poster deleted successfully",
    });
  } catch (error) {
    logError("[PosterController] deletePoster", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to delete poster",
    });
  }
};
