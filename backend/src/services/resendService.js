import { Resend } from "resend";
import Settings from "../models/settings.models.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWithResend = async (emailData) => {
  const payload = {
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
  };

  if (emailData.attachments && emailData.attachments.length > 0) {
    payload.attachments = emailData.attachments.map(att => ({
      filename: att.filename,
      content: att.content,
      type: att.contentType,
      disposition: "attachment"
    }));
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Upsert settings to ensure document exists
  const settings = await Settings.findOneAndUpdate(
    {},
    { $setOnInsert: { resendLastResetDate: today } },
    { upsert: true, new: true }
  );

  // Reset daily counter if it's a new UTC day
  if (settings.resendLastResetDate !== today) {
    await Settings.updateOne({}, { $set: { resendDailyCount: 0, resendLastResetDate: today } });
  }

  // Fetch current to avoid race conditions
  const currentSettings = await Settings.findOne();
  if (currentSettings && currentSettings.resendDailyCount >= 100) {
    const error = new Error("Daily Resend limit reached");
    error.code = "quota_exceeded";
    throw error;
  }

  try {
    const result = await resend.emails.send(payload);
    
    if (result.error) {
      throw result.error;
    }

    await Settings.updateOne({}, { $inc: { resendDailyCount: 1 } });

    return {
      provider: "resend",
      messageId: result.data?.id || "unknown",
      fallback: true
    };
  } catch (error) {
    throw error;
  }
};
