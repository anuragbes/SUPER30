import { BrevoClient } from '@getbrevo/brevo';

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

  try {
    const result = await brevo.transactionalEmails.sendTransacEmail(payload);
    return {
      provider: "brevo",
      messageId: result.body?.messageId || result.messageId || "unknown",
      fallback: false
    };
  } catch (error) {
    throw error;
  }
};
