import { sendWithBrevo } from "./brevoService.js";
import { sendWithResend } from "./resendService.js";
import { logActivity, logError } from "../utils/logger.js";

// Array-based provider registry ensures future extensibility
const providers = [
  { name: "brevo", send: sendWithBrevo },
  { name: "resend", send: sendWithResend },
];

// Helper to determine if the error is a temporary infrastructure, quota, or rate-limit error that warrants a fallback
const isFallbackError = (error) => {
  // 1. Check HTTP status code
  const status = error.status || error.statusCode || error.response?.status;
  if (status === 429 || status >= 500) return true; // 429, 500, 502, 503, 504
  
  // 2. Check for network timeouts / connection resets
  const errCode = error.code || "";
  if (["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "ECONNREFUSED"].includes(errCode)) return true;

  // 3. Quota/Rate Limit specific strings in structured response
  const code = (
    error.response?.body?.code ||
    error.body?.code ||
    error.response?.data?.code ||
    error.response?.body?.error?.code ||
    errCode
  )?.toString().toLowerCase() || "";

  if (["too_many_requests", "quota_exceeded", "rate_limit_exceeded"].includes(code)) return true;

  // Resend-style `name` field for error types if applicable
  const name = error.name?.toLowerCase() || "";
  if (name.includes("ratelimit") || name.includes("quota")) return true;

  // 4. Final fallback: Error message
  const message = (
    error.message ||
    error.response?.body?.message ||
    error.body?.message ||
    error.response?.data?.message
  )?.toLowerCase() || "";
  
  if (message.includes("quota") || message.includes("rate limit") || message.includes("too many requests")) return true;

  return false;
};

/**
 * Sends an email using the primary provider (Brevo) with an automatic
 * fallback to the secondary provider (Resend) ONLY on quota/rate-limit/temporary errors.
 * 
 * @param {Object} emailData Common email format payload
 * @param {String} studentId Student ID for operational logging
 * @returns {Object} Result metadata including provider used and fallback flag
 */
export const sendEmail = async (emailData, studentId = "unknown") => {
  let lastError;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      const result = await provider.send(emailData);
      // Stop immediately after the first successful send
      return result; 
    } catch (error) {
      lastError = error;
      
      // If this is the last provider in the array, throw the error
      if (i === providers.length - 1) {
        throw error;
      }

      // Check if fallback is allowed (explicitly only on quota/rate limiting/temporary failures)
      if (isFallbackError(error)) {
        // Improve Operational Logging: log failure reason before fallback
        const body = error.response?.body || error.body || error.response?.data;
        const reason = body?.code || error.status || error.code || "temporary_failure";
        
        logError(`[emailService] Provider failed before fallback`, {
          provider: provider.name,
          reason: reason,
          fallback_provider: providers[i + 1]?.name || "unknown",
          studentId: studentId
        });
        // Continue to the next provider
        continue;
      } else {
        // Stop immediately on any non-fallback error (e.g. invalid email)
        throw error;
      }
    }
  }

  throw lastError;
};