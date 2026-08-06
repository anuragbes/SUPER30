import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  // Enforces the existing "one Settings document" convention at the database
  // level. Every call site already reads/writes via findOne()/empty-filter
  // upserts assuming a single document -- this field + its unique index just
  // makes MongoDB reject a second one, instead of relying on that convention
  // never being violated by a future bug or race.
  singleton: {
    type: Boolean,
    default: true,
    unique: true,
  },
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
