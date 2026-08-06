import mongoose from "mongoose";
import Counter from "./counter.models.js";

function toTitleCase(str) {
    if (!str) return str;
    return str
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        unique: true,
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    classMoving: {
        type: String,
        enum: ["Class 8", "Class 9", "Class 10", "10th to 11th", "11th to 12th"],
        required: true
    },
    dateOfBirth: {
        type: Date,
        // required: true
    },
    stream: {
        type: String,
        enum: ["PCM", "PCB"],
        required: function () {
            return this.classMoving === "10th to 11th" || this.classMoving === "11th to 12th";
        }
    },
    target: {
        type: String,
        enum: ["JEE", "NEET", "CBSE Board", "JEE Mains/ Advanced / Olympiads", "CBSE - Board"],
        required: true
    },
    fatherName: {
        type: String,
        required: true,
        trim: true
    },
    motherName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        match: /.+\@.+\..+/
    },
    permanentAddress: {
        type: String,
        maxlength: 110,
        required: true
    },
    presentAddress: {
        type: String,
        maxlength: 110,
        required: true
    },
    parentMobile: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/  // validates 10-digit number
    },
    studentMobile: {
        type: String,
        match: /^[0-9]{10}$/
    },
    whatsappMobile: {
        type: String,
        match: /^[0-9]{10}$/
    },
    previousSchool: {
        type: String,
        required: true
    },
    previousResultPercentage: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    testCentre: {
        type: String,
        required: true
    },
    studyCentre: {
        type: String,
        default: null
    },
    scholarshipOffered: {
        type: Boolean,
        default: false,
    },
    scholarshipDetails: {
        type: String,
        required: function () {
            return this.scholarshipOffered === true;
        }
    },
    passportPhotoURL: {
        type: String,
        required: true
    },
    identityPhotoURL: {
        type: String,
        required: true
    },
    rollNo: {
        type: Number,
        default: null
    },
    admitCardGenerated: {
        type: Boolean,
        default: false
    },
    admitCardSent: {
        type: Boolean,
        default: false
    },
    admitCardProvider: {
        type: String,
        enum: ["brevo", "resend", null],
        default: null
    },
    admitCardSentAt: {
        type: Date,
        default: null
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    clerkUserId: {
        type: String,
        required: true,
        index: true,
    },
}, { timestamps: true })

// Makes the existing duplicate-registration check (registerStudent's
// findOne on studentName+fatherName+dateOfBirth) atomic instead of racy.
// Scoped to only the documents that check already applies to -- partial,
// not a plain unique index -- since dateOfBirth is optional on this schema
// and a non-partial unique index would treat every document missing it as
// colliding with every other one. studentName/fatherName are both already
// `required: true`, so in practice this only gates on dateOfBirth being set.
studentSchema.index(
  { studentName: 1, fatherName: 1, dateOfBirth: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentName: { $exists: true },
      fatherName: { $exists: true },
      dateOfBirth: { $exists: true },
    },
  }
);


studentSchema.pre("save", function (next) {
    const fieldsToTitleCase = [
        "studentName",
        "fatherName",
        "motherName",
        "permanentAddress",
        "presentAddress",
        "previousSchool",
        "scholarshipDetails"
    ];

    fieldsToTitleCase.forEach(field => {
        if (this[field]) {
            this[field] = toTitleCase(this[field]);
        }
    });

    next();
});

// Auto-increment studentID before saving (using Counter collection for unique IDs)
studentSchema.pre("save", async function (next) {
    if (this.isNew) {                                     // checks if the student is new
        try {
            const counter = await Counter.findOneAndUpdate(
                { id: "studentId" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.studentId = "STU" + counter.seq.toString().padStart(4, "0");
        } catch (error) {
            return next(error);
        }
    }
    next();
});


const Student = mongoose.model("Student", studentSchema);
export default Student;