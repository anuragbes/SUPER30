import { BrevoClient } from '@getbrevo/brevo';
import Settings from '../models/settings.models.js';

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

export const sendWithBrevo = async (emailData) => {
  let senderName = undefined;
  let senderEmail = emailData.from;
  
  const bracketIndex = emailData.from.lastIndexOf('<');
  if (bracketIndex !== -1 && emailData.from.endsWith('>')) {
    const namePart = emailData.from.substring(0, bracketIndex).trim();
    senderName = namePart.replace(/^["'](.*)["']$/, '$1').trim() || undefined;
    senderEmail = emailData.from.substring(bracketIndex + 1, emailData.from.length - 1).trim();
  }

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: emailData.to }],
    subject: emailData.subject,
    htmlContent: emailData.html,
  };

  if (emailData.attachments && emailData.attachments.length > 0) {
    payload.attachment = emailData.attachments.map(att => ({
      name: att.filename,
      content: att.content
    }));
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Upsert settings to ensure document exists
  const settings = await Settings.findOneAndUpdate(
    {},
    { $setOnInsert: { brevoLastResetDate: today } },
    { upsert: true, new: true }
  );

  // Reset daily counter if it's a new UTC day
  if (settings.brevoLastResetDate !== today) {
    await Settings.updateOne({}, { $set: { brevoDailyCount: 0, brevoLastResetDate: today } });
  }

  // Fetch current to avoid race conditions with multiple parallel requests as much as possible
  const currentSettings = await Settings.findOne();
  if (currentSettings && currentSettings.brevoDailyCount >= 300) {
    const error = new Error("Daily Brevo limit reached");
    error.code = "quota_exceeded"; // This will trigger isFallbackError in emailService.js
    throw error;
  }

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail(payload);
    
    // Increment counter successfully
    await Settings.updateOne({}, { $inc: { brevoDailyCount: 1 } });

    return {
      provider: "brevo",
      messageId: result.body?.messageId || result.messageId || "unknown",
      fallback: false
    };
  } catch (error) {
    throw error;
  }
};
