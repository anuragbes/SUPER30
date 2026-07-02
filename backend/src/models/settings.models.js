import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  formMode: {
    type: String,
    enum: ["junior", "senior"],
    default: "senior"
  },
  examDate: { 
    type: String, 
    required: false 
  },
  lastDateToRegister: { 
    type: String 
  },
  resultDate: { 
    type: String 
  }, 
  registrationOpen: {
    type: Boolean,
    default: true
  },
  brevo: {
    count: { type: Number, default: 0 },
    date: { type: String, default: "" }
  },
  resend: {
    count: { type: Number, default: 0 },
    windowStart: { type: String, default: null } // ISO timestamp
  }
}, { timestamps: true });

export default mongoose.model("Settings", settingsSchema);
