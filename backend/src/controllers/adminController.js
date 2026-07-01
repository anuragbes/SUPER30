import Student from "../models/student.models.js";
import Counter from "../models/counter.models.js";
import Settings from "../models/settings.models.js";
import { updatePCMAndPCB, deleteStudentFromSheet, clearRollNumbersFromSheet, clearRollNumbersFromClassSheet } from "../utils/googleSheets.js";
import { logError, logActivity } from "../utils/logger.js";
import { rejectRequest } from "../utils/rejectRequest.js";

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

    logActivity("RollNumbersGenerated", { order, assigned }, req);

    return res.json({
      success: true,
      message: "Roll numbers assigned only to students without roll numbers.",
      assigned,
    });

  } catch (error) {
    logError("[AdminController] generateRollNumbers", error, req);
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
    await updatePCMAndPCB();

    logActivity("DatabaseCleared", {}, req);
    
    return res.json({ message: "All student data cleared successfully" });
  } catch (error) {
    logError("[AdminController] deleteAllStudents", error, req);
    res.status(500).json({ error: "An unexpected error occurred while clearing student data." });
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
    logError("[AdminController] getDashboardStats", error, req);
    res.status(500).json({ message: "Failed to load dashboard statistics." });
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
    const admitCardSent = await Student.countDocuments({ admitCardSent: true });
    const sentViaBrevo = await Student.countDocuments({ admitCardProvider: "brevo" });
    const sentViaResend = await Student.countDocuments({ admitCardProvider: "resend" });

    const settings = await Settings.findOne();
    
    const today = new Date().toISOString().split('T')[0];
    
    const brevoDailyCount = settings?.brevoLastResetDate === today 
      ? (settings?.brevoDailyCount || 0) 
      : 0;
      
    const resendDailyCount = settings?.resendLastResetDate === today 
      ? (settings?.resendDailyCount || 0) 
      : 0;

    res.status(200).json({
      totalStudents,
      pcmCount,
      pcbCount,
      class8Count,
      class9Count,
      class10Count,
      admitCardGenerated,
      admitCardSent,
      sentViaBrevo,
      sentViaResend,
      brevoDailyCount,
      resendDailyCount,
    });
  } catch (error) {
    logError("[AdminController] getSummaryStats", error, req);
    res.status(500).json({ message: "Failed to load summary statistics." });
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
    logError("[AdminController] getExamSettings", error, req);
    res.status(500).json({ message: "Failed to load exam settings." });
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

    logActivity("ExamSettingsUpdated", { updatedFields: Object.keys(updateData) }, req);
    res.status(200).json({
      success: true,
      message: "Exam settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    logError("[AdminController] updateExamSettings", error, req);
    res.status(500).json({ message: "Failed to update exam settings." });
  }
};


// =============================
// DELETE SINGLE STUDENT
// =============================
export const deleteStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Delete from DB
    const student = await Student.findOneAndDelete({ studentId });

    if (!student) {
      return rejectRequest(req, res, 404, "student_not_found", "Student not found");
    }

    // Delete from correct Google Sheet tab
    await deleteStudentFromSheet(studentId, student.stream, student.classMoving);

    logActivity("StudentDeleted", { studentId }, req);
    return res.json({
      success: true,
      message: "Student deleted from database & Google Sheet",
    });

  } catch (error) {
    logError("[AdminController] deleteStudent", error, req);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while deleting the student.",
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
      if (!["Class 8", "Class 9", "Class 10"].includes(classGroup)) {
        return rejectRequest(req, res, 400, "invalid_class_group", "A valid classGroup is required.");
      }

      const result = await Student.updateMany(
        { classMoving: classGroup },
        { $unset: { rollNo: "" } }
      );

      logActivity("RollNumbersCleared", { classGroup, count: result.modifiedCount }, req);

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
      return rejectRequest(req, res, 400, "invalid_stream", "A valid stream is required.");
    }

    const result = await Student.updateMany(
      { stream },
      { $unset: { rollNo: "" } }
    );

    logActivity("RollNumbersCleared", { stream, count: result.modifiedCount }, req);

    const counterId = stream === "PCM" ? "pcmRoll" : "pcbRoll";
    await Counter.findOneAndUpdate({ id: counterId }, { seq: 0 }, { upsert: true });

    await clearRollNumbersFromSheet(stream);

    return res.json({
      success: true,
      message: `Roll numbers removed for ${stream} stream.`,
      updated: result.modifiedCount,
    });

  } catch (error) {
    logError("[AdminController] removeRollNumbers", error, req);
    res.status(500).json({
      success: false,
      message: "Failed to remove roll numbers. Please try again.",
    });
  }
};
