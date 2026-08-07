import AuditLog from "../models/auditLog.models.js";
import { logError } from "../utils/logger.js";
import { escapeRegex } from "./studentController.js";

/**
 * @desc    List audit log entries (paginated, filterable, newest first)
 * @route   GET /api/admin/audit-logs
 * @access  Admin (read-only)
 *
 * Query params:
 *   page    - 1-based page number (default 1)
 *   search  - matched against summary/adminUsername/action (case-insensitive,
 *             regex-escaped -- same ReDoS-safe pattern as getAllStudents)
 *   action  - exact action filter (e.g. "STUDENT_DELETED")
 *   from/to - ISO date strings, inclusive range filter on `timestamp`
 *   sort    - "oldest" for ascending; anything else (or omitted) is newest-first
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { search, action, from, to, sort, page = 1 } = req.query;

    const limit = 50;
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { summary: { $regex: escapedSearch, $options: "i" } },
        { adminUsername: { $regex: escapedSearch, $options: "i" } },
        { action: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (action) query.action = action;

    if (from || to) {
      const range = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate)) range.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate)) range.$lte = toDate;
      }
      if (Object.keys(range).length > 0) query.timestamp = range;
    }

    const sortDirection = sort === "oldest" ? 1 : -1;

    const totalRecords = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: logs,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    logError("[AuditLogController] getAuditLogs", error, req);
    res.status(500).json({ success: false, message: "Failed to load audit logs." });
  }
};
