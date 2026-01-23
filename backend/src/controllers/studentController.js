import "dotenv/config";
import Student from "../models/student.models.js";
import Counter from "../models/counter.models.js";
import { appendToGoogleSheet } from "../utils/googleSheets.js";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;


export const registerStudent = async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const existingStudent = await Student.findOne({ clerkUserId });
    if (existingStudent) {
      return res.status(400).json({
        error: "You have already registered for this exam",
      });
    }

    const newStudent = new Student({
      ...req.body,
      clerkUserId,
    });

    if (req.body.previousSchool === "Other" && req.body.customSchool) {
      newStudent.previousSchool = req.body.customSchool;
    }

    if (req.files?.passportPhoto?.[0]?.path) {
      newStudent.passportPhotoURL = req.files.passportPhoto[0].path;
    }

    if (req.files?.identityPhoto?.[0]?.path) {
      newStudent.identityPhotoURL = req.files.identityPhoto[0].path;
    }

    await newStudent.save();
    await appendToGoogleSheet(newStudent);

    res.status(201).json({
      message: "✅ Registration successful",
      studentId: newStudent.studentId,
    });

  } catch (error) {
    console.error("❌ ERROR in registerStudent:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const { search, stream, target, status, page = 1 } = req.query;

    const limit = 100;
    const skip = (page - 1) * limit;

    const query = {};

    // 🔍 Search
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    // 🎓 Stream filter
    if (stream) query.stream = stream;

    // 🎯 Target filter
    if (target) query.target = target;

    // 📄 Status filter
    if (status === "Generated") {
      query.admitCardGenerated = true;
      query.admitCardSent = { $ne: true };
    } else if (status === "Sent") {
      query.admitCardSent = true;
    } else if (status === "Pending") {
      query.admitCardGenerated = { $ne: true };
      query.admitCardSent = { $ne: true };
    }

    // 🧮 Total students (for pagination)
    const totalStudents = await Student.countDocuments(query);

    // 🧾 Paginated result
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: students,
      totalStudents,
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




export const resetStudentIdCounter = async (req, res) => {
  try {
    await Counter.updateOne(
      { id: "studentId" },
      { $set: { seq: 0 } },
      { upsert: true }
    );

    res.status(200).json({ message: "Student ID counter has been reset to STU0001" });
  } catch (error) {
    console.log("Error resetting counter:", error);
    res.status(500).json({ error: "Failed to reset ID counter" });
  }
};