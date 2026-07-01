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
  brevoDailyCount: {
    type: Number,
    default: 0
  },
  brevoLastResetDate: {
    type: String, // format: "YYYY-MM-DD"
    default: ""
  }
});

export default mongoose.model("Settings", settingsSchema);
