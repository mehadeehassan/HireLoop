import 'server-only';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('Password reset email delivery is not configured.');
  }

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Reset your HireLoop password',
      text: `Hello ${name},\n\nUse this link to reset your HireLoop password. The link expires in one hour.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Hello ${safeName},</p><p>Use the link below to reset your HireLoop password. The link expires in one hour.</p><p><a href="${safeUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error('Password reset email could not be sent.');
  }
}
