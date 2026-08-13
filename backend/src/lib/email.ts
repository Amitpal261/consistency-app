import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const emailFrom = process.env.EMAIL_FROM ?? "no-reply@consistency.app";
const resetUrlBase = process.env.PASSWORD_RESET_URL_BASE ?? process.env.FRONTEND_URL;

const hasSmtpConfig = Boolean(smtpHost && smtpPort && smtpUser && smtpPass);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

function buildResetUrl(token: string) {
  if (resetUrlBase) {
    const base = resetUrlBase.replace(/\/$/, "");
    return `${base}/reset-password?token=${encodeURIComponent(token)}`;
  }
  return `https://example.com/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = buildResetUrl(token);
  const subject = "Reset your Consistency password";
  const text = `Hi ${name || "there"},\n\n` +
    "We received a request to reset your Consistency password. " +
    "Click the link below to choose a new password:\n\n" +
    `${resetUrl}\n\n` +
    "If you didn't request this, you can ignore this message. " +
    "This link will expire in one hour.\n\n" +
    "Thanks,\nConsistency Team";

  const html = `<p>Hi ${name || "there"},</p>` +
    `<p>We received a request to reset your Consistency password. Click the link below to choose a new password:</p>` +
    `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
    `<p>If you didn't request this, you can ignore this message. This link will expire in one hour.</p>` +
    `<p>Thanks,<br/>Consistency Team</p>`;

  if (!transporter) {
    console.warn("Password reset email not sent because SMTP is not configured.");
    console.warn(`Reset link for ${email}: ${resetUrl}`);
    return false;
  }

  await transporter.sendMail({
    from: emailFrom,
    to: email,
    subject,
    text,
    html,
  });

  return true;
}
