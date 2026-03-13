import Student from "../models/student.models.js";
import Counter from "../models/counter.models.js";
import Settings from "../models/settings.models.js";
import { updatePCMAndPCB, deleteStudentFromSheet, clearRollNumbersFromSheet } from "../utils/googleSheets.js";

export const generateRollNumbers = async (req, res) => {
  try {
    const order = req.body.order || "alphabetical";

    const fetchByStream = async (stream) => {
      const query = {
        stream,
        $or: [
          { rollNo: null },
          { rollNo: "" },
          { rollNo: { $exists: false } },
        ],
      };

      if (order === "random") {
        const total = await Student.countDocuments(query);
        if (total === 0) return [];
        return await Student.aggregate([{ $match: query }, { $sample: { size: total } }]);
      }

      return await Student.find(query).sort({ studentName: 1 });
    };

    const pcm = await fetchByStream("PCM");
    const pcb = await fetchByStream("PCB");

    const bulkOps = [];

    // PCM: start from last + 1 OR 3001
    const lastPCM = await Student.findOne({ rollNo: { $gte: 4001, $lt: 5000 } })
      .sort({ rollNo: -1 });

    let rollPCM = lastPCM ? lastPCM.rollNo + 1 : 4001;

    pcm.forEach((s) =>
      bulkOps.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { rollNo: rollPCM++ } },
        },
      })
    );

    // PCB: start from last + 1 OR 5001
    const lastPCB = await Student.findOne({ rollNo: { $gte: 6001, $lt: 7000 } })
      .sort({ rollNo: -1 });

    let rollPCB = lastPCB ? lastPCB.rollNo + 1 : 6001;

    pcb.forEach((s) =>
      bulkOps.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { rollNo: rollPCB++ } },
        },
      })
    );

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    // Sync updated roll numbers to Google Sheets
    await updatePCMAndPCB();

    return res.json({
      success: true,
      message: "Roll numbers assigned only to students without roll numbers.",
      assigned: { PCM: pcm.length, PCB: pcb.length },
    });

  } catch (error) {
    console.error("Error generating roll numbers:", error);
    res.status(500).json({ error: "Failed to generate roll numbers" });
  }
};


// delete all students from database
export const deleteAllStudents = async (req, res) => {
  try {
    await Student.deleteMany({}); // deletes all student records
    await Counter.findOneAndUpdate(
      { id: "studentId" },
      { seq: 0 }, // reset student ID counter
      { new: true }
    );

    res.status(200).json({ message: "All student data cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const groupBy = async (field) => {
      const data = await Student.aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      ]);
      return data.map((d) => ({ name: d._id || "N/A", count: d.count }));
    };

    const stats = {
      gender: await groupBy("gender"),
      stream: await groupBy("stream"),
      target: await groupBy("target"),
      classMoving: await groupBy("classMoving"),
      testCentre: await groupBy("testCentre"),
      scholarship: await groupBy("scholarshipOffered"),
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSummaryStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const pcmCount = await Student.countDocuments({ stream: "PCM" });
    const pcbCount = await Student.countDocuments({ stream: "PCB" });
    const admitCardGenerated = await Student.countDocuments({ admitCardGenerated: true });

    res.status(200).json({
      totalStudents,
      pcmCount,
      pcbCount,
      admitCardGenerated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




// Get current exam date
export const getExamSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        examDate: "",
        lastDateToRegister: "",
        resultDate: "",
        registrationOpen: true
      });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update exam date
export const updateExamSettings = async (req, res) => {
  try {
    const { examDate, lastDateToRegister, resultDate, registrationOpen } = req.body;

    // Find existing settings first
    let settings = await Settings.findOne();
    
    // Build update object with only provided fields
    const updateData = {};
    if (examDate !== undefined) updateData.examDate = examDate;
    if (lastDateToRegister !== undefined) updateData.lastDateToRegister = lastDateToRegister;
    if (resultDate !== undefined) updateData.resultDate = resultDate;
    if (registrationOpen !== undefined) updateData.registrationOpen = registrationOpen;

    const updated = await Settings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Exam settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    console.error("Error updating exam settings:", error);
    res.status(500).json({ message: error.message });
  }
};


// =============================
// DELETE SINGLE STUDENT
// =============================
export const deleteStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    // 1️⃣ Delete from DB
    const student = await Student.findOneAndDelete({ studentId });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // 2️⃣ Delete from correct Google Sheet tab
    await deleteStudentFromSheet(studentId, student.stream);

    return res.json({
      success: true,
      message: "Student deleted from database & Google Sheet",
    });

  } catch (error) {
    console.error("❌ Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting student",
      error: error.message,
    });
  }
};


// REMOVE ROLL NUMBERS FOR A STREAM
// =============================
export const removeRollNumbers = async (req, res) => {
  try {
    const { stream } = req.body;

    // Validate stream
    if (!stream || !["PCM", "PCB"].includes(stream)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stream. Must be PCM or PCB.",
      });
    }

    // Clear roll numbers in database for the stream
    const result = await Student.updateMany(
      { stream },
      { $set: { rollNo: null } }
    );

    // Clear roll numbers in Google Sheet for the stream
    await clearRollNumbersFromSheet(stream);

    return res.json({
      success: true,
      message: `Roll numbers removed for ${stream} stream.`,
      updated: result.modifiedCount,
    });

  } catch (error) {
    console.error("❌ Error removing roll numbers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove roll numbers",
      error: error.message,
    });
  }
};
