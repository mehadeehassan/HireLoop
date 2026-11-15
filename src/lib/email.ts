import 'server-only';

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

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('Email delivery is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Resend rejected the API key (HTTP 401). Check RESEND_API_KEY.');
    }
    if (response.status === 403 && /@resend\.dev(?:[>\s]|$)/i.test(from)) {
      throw new Error(
        'Resend rejected the test email. The onboarding@resend.dev sender can only deliver to the Resend account owner email.',
      );
    }
    throw new Error(`Resend rejected email delivery (HTTP ${response.status}).`);
  }
}
