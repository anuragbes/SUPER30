import { Resend } from 'resend';
import { logError, logEmail } from '../utils/logger.js';
import Settings from '../models/settings.models.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWithResend = async (emailData) => {
  let reservedSlot = false;
  try {
    let settings = await Settings.findOne();
    
    // Enforce limits before even calling Resend
    if (settings) {
      let needsReset = false;
      if (!settings.resend?.windowStart) {
        needsReset = true;
      } else {
        const windowStartTime = new Date(settings.resend.windowStart).getTime();
        const now = Date.now();
        if (now - windowStartTime >= 24 * 60 * 60 * 1000) {
          needsReset = true;
        }
      }

      if (needsReset) {
        const oldWindowStart = settings.resend?.windowStart;
        const updateResult = await Settings.findOneAndUpdate(
          { "resend.windowStart": oldWindowStart },
          { $set: { "resend.count": 0, "resend.windowStart": new Date().toISOString() } },
          { new: true }
        );
        
        // If updateResult is null, another request already performed the reset
        if (!updateResult) {
          settings = await Settings.findOne();
        } else {
          settings = updateResult;
          logEmail("QUOTA_RESET", { provider: "resend", previousWindowStart: oldWindowStart, newWindowStart: settings.resend.windowStart });
        }
      }
      
      // Atomically reserve a send slot before calling the provider -- closes
      // the check-then-act race where two concurrent sends could both read
      // count<100 before either increments. Rolled back below if the send
      // itself fails, so the counter still only reflects confirmed sends.
      const reserved = await Settings.findOneAndUpdate(
        { "resend.windowStart": settings.resend.windowStart, "resend.count": { $lt: 100 } },
        { $inc: { "resend.count": 1 } },
        { new: true }
      );

      if (!reserved) {
        logEmail("QUOTA_EXCEEDED", { provider: "resend", count: settings.resend.count, limit: 100, windowStart: settings.resend.windowStart });
        const error = new Error("Resend daily limit of 100 emails reached");
        error.name = "RateLimitError";
        error.status = 429;
        throw error;
      }
      reservedSlot = true;
    }

    const { data, error } = await resend.emails.send({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      attachments: emailData.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })) || [],
    });

    if (error) {
      throw error;
    }

    logEmail("EMAIL_SENT", { provider: "resend", to: emailData.to, messageId: data?.id });

    return { success: true, provider: "resend", data };
  } catch (error) {
    if (reservedSlot) {
      // Send failed after we reserved a slot -- release it so the counter
      // still only reflects confirmed sends.
      await Settings.updateOne({}, { $inc: { "resend.count": -1 } });
    }
    logEmail("EMAIL_FAILED", { provider: "resend", to: emailData.to, error: error.message });
    logError("[resendService] Failed to send email", error);
    throw error;
  }
};
