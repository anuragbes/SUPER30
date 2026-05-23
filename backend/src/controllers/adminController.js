import Student from "../models/student.models.js";
import Counter from "../models/counter.models.js";
import Settings from "../models/settings.models.js";
import { updatePCMAndPCB, deleteStudentFromSheet, clearRollNumbersFromSheet, clearRollNumbersFromClassSheet } from "../utils/googleSheets.js";

export const generateRollNumbers = async (req, res) => {
  try {
    const order = req.body.order || "alphabetical";

    // Check current form mode
    const settings = await Settings.findOne();
    const isJunior = settings?.formMode === "junior";

    const noRollQuery = {
      $or: [
        { rollNo: null },
        { rollNo: "" },
        { rollNo: { $exists: false } },
      ],
    };

    const fetchStudents = async (filter) => {
      const query = { ...filter, ...noRollQuery };

      if (order === "random") {
        const total = await Student.countDocuments(query);
        if (total === 0) return [];
        return await Student.aggregate([{ $match: query }, { $sample: { size: total } }]);
      }

      return await Student.find(query).sort({ studentName: 1 });
    };

    const bulkOps = [];
    const assigned = {};

    if (isJunior) {
      // Junior mode: generate roll numbers by class
      const classGroups = [
        { name: "Class 8", counterId: "class8Roll", startBase: 8000 },
        { name: "Class 9", counterId: "class9Roll", startBase: 9000 },
        { name: "Class 10", counterId: "class10Roll", startBase: 10000 },
      ];

      for (const group of classGroups) {
        const students = await fetchStudents({ classMoving: group.name, stream: null });
        const count = students.length;
        assigned[group.name] = count;

        if (count > 0) {
          const counter = await Counter.findOneAndUpdate(
            { id: group.counterId },
            { $inc: { seq: count } },
            { new: true, upsert: true }
          );

          let rollNo = group.startBase + (counter.seq - count + 1);

          students.forEach((s) =>
            bulkOps.push({
              updateOne: {
                filter: { _id: s._id, ...noRollQuery },
                update: { $set: { rollNo: rollNo++ } },
              },
            })
          );
        }
      }
    } else {
      // Senior mode: generate roll numbers by stream (PCM / PCB)
      const pcm = await fetchStudents({ stream: "PCM" });
      const pcb = await fetchStudents({ stream: "PCB" });

      assigned.PCM = pcm.length;
      assigned.PCB = pcb.length;

      if (pcm.length > 0) {
        const counter = await Counter.findOneAndUpdate(
          { id: "pcmRoll" },
          { $inc: { seq: pcm.length } },
          { new: true, upsert: true }
        );
        let rollPCM = 4000 + (counter.seq - pcm.length + 1);

        pcm.forEach((s) =>
          bulkOps.push({
            updateOne: {
              filter: { _id: s._id, ...noRollQuery },
              update: { $set: { rollNo: rollPCM++ } },
            },
          })
        );
      }

      if (pcb.length > 0) {
        const counter = await Counter.findOneAndUpdate(
          { id: "pcbRoll" },
          { $inc: { seq: pcb.length } },
          { new: true, upsert: true }
        );
        let rollPCB = 6000 + (counter.seq - pcb.length + 1);

        pcb.forEach((s) =>
          bulkOps.push({
            updateOne: {
              filter: { _id: s._id, ...noRollQuery },
              update: { $set: { rollNo: rollPCB++ } },
            },
          })
        );
      }
    }

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    // Sync updated roll numbers to Google Sheets
    await updatePCMAndPCB();

    return res.json({
      success: true,
      message: "Roll numbers assigned only to students without roll numbers.",
      assigned,
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

    // Reset roll number counters
    await Counter.findOneAndUpdate({ id: "pcmRoll" }, { seq: 0 }, { upsert: true });
    await Counter.findOneAndUpdate({ id: "pcbRoll" }, { seq: 0 }, { upsert: true });

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
      studyCentre: await groupBy("studyCentre"),
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
    const class8Count = await Student.countDocuments({ classMoving: "Class 8" });
    const class9Count = await Student.countDocuments({ classMoving: "Class 9" });
    const class10Count = await Student.countDocuments({ classMoving: "Class 10" });
    const admitCardGenerated = await Student.countDocuments({ admitCardGenerated: true });

    res.status(200).json({
      totalStudents,
      pcmCount,
      pcbCount,
      class8Count,
      class9Count,
      class10Count,
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
    const { examDate, lastDateToRegister, resultDate, registrationOpen, formMode } = req.body;

    // Find existing settings first
    let settings = await Settings.findOne();

    // Build update object with only provided fields
    const updateData = {};
    if (examDate !== undefined) updateData.examDate = examDate;
    if (lastDateToRegister !== undefined) updateData.lastDateToRegister = lastDateToRegister;
    if (resultDate !== undefined) updateData.resultDate = resultDate;
    if (registrationOpen !== undefined) updateData.registrationOpen = registrationOpen;
    if (formMode !== undefined) updateData.formMode = formMode;

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
    await deleteStudentFromSheet(studentId, student.stream, student.classMoving);

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


// REMOVE ROLL NUMBERS FOR A STREAM OR CLASS
// =============================
export const removeRollNumbers = async (req, res) => {
  try {
    const { stream, classGroup } = req.body;

    // Junior mode: remove by class
    if (classGroup) {
      const validClasses = ["Class 8", "Class 9", "Class 10"];
      if (!validClasses.includes(classGroup)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class. Must be Class 8, Class 9, or Class 10.",
        });
      }

      const result = await Student.updateMany(
        { classMoving: classGroup, stream: null },
        { $set: { rollNo: null } }
      );

      const counterMap = { "Class 8": "class8Roll", "Class 9": "class9Roll", "Class 10": "class10Roll" };
      await Counter.findOneAndUpdate({ id: counterMap[classGroup] }, { seq: 0 }, { upsert: true });

      await clearRollNumbersFromClassSheet(classGroup);

      return res.json({
        success: true,
        message: `Roll numbers removed for ${classGroup}.`,
        updated: result.modifiedCount,
      });
    }

    // Senior mode: remove by stream
    if (!stream || !["PCM", "PCB"].includes(stream)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stream. Must be PCM or PCB.",
      });
    }

    const result = await Student.updateMany(
      { stream },
      { $set: { rollNo: null } }
    );

    const counterId = stream === "PCM" ? "pcmRoll" : "pcbRoll";
    await Counter.findOneAndUpdate({ id: counterId }, { seq: 0 }, { upsert: true });

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
