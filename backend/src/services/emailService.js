import { sendWithBrevo } from "./brevoService.js";
import { sendWithResend } from "./resendService.js";
import { logActivity, logError } from "../utils/logger.js";

// Array-based provider registry ensures future extensibility
const providers = {
  brevo: sendWithBrevo,
  resend: sendWithResend,
};

/**
 * Sends an email using the specified provider.
 * 
 * @param {Object} emailData Common email format payload
 * @param {String} studentId Student ID for operational logging
 * @param {String} providerName "brevo" or "resend"
 * @returns {Object} Result metadata including provider used
 */
export const sendEmail = async (emailData, studentId = "unknown", providerName = "brevo") => {
  const sendFn = providers[providerName] || providers.brevo;

  try {
    const result = await sendFn(emailData);
    return result; 
  } catch (error) {
    logError(`[emailService] Provider ${providerName} failed`, {
      provider: providerName,
      studentId: studentId
    });
    throw error;
  }
};