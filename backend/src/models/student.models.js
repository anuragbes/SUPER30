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
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined values to not conflict
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
        enum: ["10th to 11th"],
        required: true
    },
    dateOfBirth: {
        type: Date,
        // required: true
    },
    stream: {
        type: String,
        enum: ["PCM", "PCB"],
        required: true
    },
    target: {
        type: String,
        enum: ["JEE", "NEET", "CBSE Board"],
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
        default: "British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)",
        required: true
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
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })


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
// Assign studentId only after a successful save to avoid gaps when save fails
studentSchema.post("save", async function (doc, next) {
    try {
        // If studentId already exists (e.g., seeded data), skip
        if (doc.studentId) return next();

        const counter = await Counter.findOneAndUpdate(
            { id: "studentId" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const newId = "STU" + counter.seq.toString().padStart(4, "0");

        // Update the saved document with the generated studentId
        await doc.constructor.findByIdAndUpdate(doc._id, { studentId: newId });

        next();
    } catch (err) {
        // Do not block the saved document; log and continue
        console.error("Error assigning studentId post-save:", err);
        next();
    }
});


const Student = mongoose.model("Student", studentSchema);
export default Student;