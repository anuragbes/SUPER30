import { Resend } from "resend";

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

  try {
    const result = await resend.emails.send(payload);
    
    if (result.error) {
      throw result.error;
    }

    return {
      provider: "resend",
      messageId: result.data?.id || "unknown",
      fallback: true
    };
  } catch (error) {
    throw error;
  }
};
