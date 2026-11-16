import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { getMongoClient } from '@/lib/mongodb';
import { createHireLoopAuthRoleConfig } from '@/lib/auth-role-config';
import { sendPasswordResetEmail } from '@/lib/password-reset-email';
import { escapeEmailHtml, sendEmail } from '@/lib/email';

const client = getMongoClient();
const db = client.db('hireloopdb');
const verificationCallbackURL = '/signin?verification=success';
const verificationTokenLifetimeSeconds = 15 * 60;

function createVerificationUrl(token: string) {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) {
    throw new Error('Email verification URL is not configured.');
  }

  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error('Email verification URL is not configured correctly.');
  }

  const authPath = url.pathname.replace(/\/+$/, '') || '/api/auth';
  url.pathname = `${authPath}/verify-email`;
  url.search = '';
  url.hash = '';
  url.searchParams.set('token', token);
  url.searchParams.set('callbackURL', verificationCallbackURL);
  return url.toString();
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  ...createHireLoopAuthRoleConfig(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, token }) => {
      try {
        const url = createVerificationUrl(token);
        const safeName = escapeEmailHtml(user.name);
        const safeUrl = escapeEmailHtml(url);
        await sendEmail({
          to: user.email,
          subject: 'Verify your HireLoop email',
          text: `Hello ${user.name},\n\nUse this link to verify your HireLoop email. The link expires in 15 minutes.\n\n${url}\n\nIf you did not create a HireLoop account, you can ignore this email.`,
          html: `<p>Hello ${safeName},</p><p>Use the link below to verify your HireLoop email. The link expires in 15 minutes.</p><p><a href="${safeUrl}">Verify your email</a></p><p>If you did not create a HireLoop account, you can ignore this email.</p>`,
        });
      } catch {
        console.error('Email verification delivery failed.');
      }
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: verificationTokenLifetimeSeconds,
  },
  rateLimit: {
    customRules: {
      '/send-verification-email': { window: 60, max: 3 },
    },
  },
  session: {
    cookieCache: {
      enabled: false,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  database: mongodbAdapter(db, {
    client,
  }),
});
