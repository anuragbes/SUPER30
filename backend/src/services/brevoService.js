import { BrevoClient } from '@getbrevo/brevo';
import Settings from '../models/settings.models.js';
import { logEmail } from '../utils/logger.js';

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
    { $setOnInsert: { "brevo.date": today, singleton: true } },
    { upsert: true, new: true }
  );

  // Reset daily counter if it's a new UTC day (use OCC to prevent concurrent resets from overwriting increments)
  if (settings.brevo?.date !== today) {
    const resetResult = await Settings.updateOne(
      { "brevo.date": settings.brevo?.date },
      { $set: { "brevo.count": 0, "brevo.date": today } }
    );
    if (resetResult.modifiedCount > 0) {
      logEmail("QUOTA_RESET", { provider: "brevo", previousDate: settings.brevo?.date, newDate: today });
    }
  }

  // Atomically reserve a send slot before calling the provider -- closes the
  // check-then-act race where two concurrent sends could both read count<300
  // before either increments. Rolled back below if the send itself fails, so
  // the counter still only reflects confirmed sends, same as before.
  const reserved = await Settings.findOneAndUpdate(
    { "brevo.date": today, "brevo.count": { $lt: 300 } },
    { $inc: { "brevo.count": 1 } },
    { new: true }
  );

  if (!reserved) {
    const current = await Settings.findOne();
    logEmail("QUOTA_EXCEEDED", { provider: "brevo", count: current?.brevo?.count, limit: 300 });
    const error = new Error("Daily Brevo limit reached");
    error.code = "quota_exceeded";
    throw error;
  }

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail(payload);

    const messageId = result.body?.messageId || result.messageId || "unknown";
    logEmail("EMAIL_SENT", { provider: "brevo", to: emailData.to, messageId });

    return {
      provider: "brevo",
      messageId,
      fallback: false
    };
  } catch (error) {
    // Send failed after we reserved a slot -- release it so the counter
    // still only reflects confirmed sends.
    await Settings.updateOne({}, { $inc: { "brevo.count": -1 } });
    logEmail("EMAIL_FAILED", { provider: "brevo", to: emailData.to, error: error.message });
    throw error;
  }
};
