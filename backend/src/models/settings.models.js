import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
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
}

});

export default mongoose.model("Settings", settingsSchema);
