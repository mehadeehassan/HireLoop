import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function escapeEmailHtml(value: string) {
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

let transporter: Transporter | undefined;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.error('Email delivery is not configured: SMTP_USER and SMTP_PASS are required.');
    return undefined;
  }

  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465 || process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const from = process.env.EMAIL_FROM;
  const mailer = getTransporter();
  if (!mailer || !from) {
    if (mailer && !from) console.error('Email delivery is not configured: EMAIL_FROM is required.');
    return;
  }

  try {
    await mailer.sendMail({ from, to, subject, text, html });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : undefined;
    if (code === 'EAUTH') {
      console.error('SMTP authentication failed. Check SMTP_USER and SMTP_PASS.');
    } else {
      console.error('Email delivery failed.', code ? `SMTP error code: ${code}.` : '');
    }
  }
}
