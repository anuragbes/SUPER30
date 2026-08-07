import mongoose from "mongoose";

// Records administrator actions for after-the-fact traceability: who did
// it, when, from where, and what changed. Deliberately metadata-only --
// see recordAuditLog() in utils/auditLog.js for what is and is not allowed
// into `metadata`. No passwords, tokens, cookies, uploaded file contents,
// or full request/response bodies are ever stored here.
const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Both the id (for joins/filtering) and a snapshotted username (so the
    // log still reads correctly if an Admin account is later renamed or
    // removed) are kept. adminId is nullable to cover a failed login
    // attempt against a username that doesn't correspond to any account.
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    adminUsername: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      default: null,
    },
    resourceId: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      default: "unknown",
    },
    userAgent: {
      type: String,
      default: "unknown",
    },
    success: {
      type: Boolean,
      required: true,
    },
    // Small, bounded, non-PII details specific to the action (e.g. counts,
    // which fields changed, a provider name). Never large payloads.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // `timestamp` above is the field the audit log is queried and sorted
    // by; Mongoose's own createdAt/updatedAt would be redundant with it,
    // so timestamps are deliberately not enabled here.
    timestamps: false,
  },
);

// Every list view is newest-first; this is the primary access pattern.
auditLogSchema.index({ timestamp: -1 });
// Supports the action-filter + newest-first combination without an
// in-memory sort fallback.
auditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
