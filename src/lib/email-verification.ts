import 'server-only';

import { escapeEmailHtml, sendEmail } from '@/lib/email';

export async function sendVerificationEmail(email: string, name: string, url: string) {
  const safeName = escapeEmailHtml(name);
  const safeUrl = escapeEmailHtml(url);
  const text = `HIRELOOP
Email verification

Verify your email address

Hello ${name},

Thanks for creating a HireLoop account. Verify your email address to continue:

${url}

This link expires in 15 minutes.

If you did not create a HireLoop account, you can ignore this email.

This is an automated message from HireLoop. Please do not reply.`;
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>Verify your HireLoop email</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f3f4f8;font-family:Arial,Helvetica,sans-serif;color:#202033;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          Verify your email to finish setting up your HireLoop account.
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#f3f4f8;">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:separate;border-spacing:0;">
                <tr>
                  <td style="padding:0 0 20px;text-align:center;">
                    <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#6258ff;">HireLoop</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 36px 32px;background-color:#ffffff;border:1px solid #e8e8f0;border-radius:16px;">
                    <div style="width:48px;height:48px;margin:0 0 22px;border-radius:14px;background-color:#f0efff;text-align:center;line-height:48px;font-size:14px;font-weight:700;letter-spacing:-0.5px;color:#6258ff;">HL</div>
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6258ff;">Email verification</p>
                    <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;letter-spacing:-0.7px;color:#191927;">Verify your email address</h1>
                    <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#454557;">Hello ${safeName},</p>
                    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#656579;">Thanks for creating a HireLoop account. Confirm your email address to finish setting up your account.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
                      <tr>
                        <td align="center" style="border-radius:9px;background-color:#6258ff;">
                          <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border:1px solid #6258ff;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Verify my email</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#77778a;">This secure link expires in <strong style="color:#454557;">15 minutes</strong>.</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#77778a;">If the button doesn't work, copy and paste this address into your browser:</p>
                    <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.6;"><a href="${safeUrl}" style="color:#6258ff;text-decoration:underline;">${safeUrl}</a></p>
                    <hr style="height:1px;margin:26px 0 18px;border:0;background-color:#eeeeF4;">
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#77778a;">If you didn't create a HireLoop account, you can safely ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 12px 0;text-align:center;font-size:12px;line-height:1.6;color:#9696a6;">
                    This is an automated message from HireLoop. Please don't reply to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify your HireLoop email',
    text,
    html,
  });
}
