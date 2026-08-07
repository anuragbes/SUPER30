import Admin from "../models/admin.models.js";
import AuditLog from "../models/auditLog.models.js";
import { logError } from "./logger.js";

const MAX_SUMMARY_LENGTH = 300;
// Defense in depth against an accidentally-oversized metadata object at a
// future call site. Every call site in this codebase is written to pass
// small, bounded metadata (counts and short strings, never full document
// arrays or request bodies) -- this cap is a backstop, not the primary
// control.
const MAX_METADATA_JSON_LENGTH = 2000;

const boundMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return {};
  try {
    const json = JSON.stringify(metadata);
    if (json.length <= MAX_METADATA_JSON_LENGTH) return metadata;
    return { truncated: true, preview: json.slice(0, MAX_METADATA_JSON_LENGTH) };
  } catch {
    return { unserializable: true };
  }
};

const extractIp = (req) =>
  req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";

const extractUserAgent = (req) =>
  req?.headers?.["user-agent"] || "unknown";

/**
 * Records one audit log entry for an administrator action. Every call site
 * awaits this (for audit durability -- the request only completes once the
 * write has been attempted), but it is internally fault-isolated: all
 * errors are caught here and reported via the existing logError channel,
 * so this function never throws and never rejects. Awaiting it therefore
 * cannot fail or reject the caller's request -- at worst it adds the time
 * the (failed) write attempt took, it never surfaces as a failure of the
 * operation that triggered it.
 *
 * `adminId`/`adminUsername` are normally derived from `req.admin` (set by
 * the adminAuth middleware) plus one lookup to snapshot the current
 * username. Pass them explicitly to cover cases with no authenticated
 * admin context yet -- e.g. a failed login attempt, where `adminId` is
 * null and `adminUsername` is the attempted (not necessarily valid)
 * username.
 */
export const recordAuditLog = async ({
  req,
  action,
  resourceType = null,
  resourceId = null,
  summary,
  success,
  metadata = {},
  adminId: adminIdOverride,
  adminUsername: adminUsernameOverride,
}) => {
  try {
    let adminId = adminIdOverride !== undefined ? adminIdOverride : req?.admin?.adminId ?? null;
    let adminUsername = adminUsernameOverride;

    if (adminUsername === undefined) {
      adminUsername = "unknown";
      if (adminId) {
        const admin = await Admin.findById(adminId).select("username").lean();
        if (admin?.username) adminUsername = admin.username;
      }
    }

    await AuditLog.create({
      adminId,
      adminUsername,
      action,
      resourceType,
      resourceId: resourceId !== null && resourceId !== undefined ? String(resourceId) : null,
      summary: String(summary).slice(0, MAX_SUMMARY_LENGTH),
      ip: extractIp(req),
      userAgent: extractUserAgent(req),
      success,
      metadata: boundMetadata(metadata),
    });
  } catch (error) {
    logError("[AuditLog] recordAuditLog failed", error, req);
  }
};
