import 'server-only';
import { escapeEmailHtml, sendEmail } from '@/lib/email';

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
  const safeName = escapeEmailHtml(name);
  const safeUrl = escapeEmailHtml(resetUrl);
  await sendEmail({
    to: email,
    subject: 'Reset your HireLoop password',
    text: `Hello ${name},\n\nUse this link to reset your HireLoop password. The link expires in one hour.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Use the link below to reset your HireLoop password. The link expires in one hour.</p><p><a href="${safeUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}
