import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, 
  }
);

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
