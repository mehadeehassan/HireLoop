import { createHireLoopAuthRoleConfig } from '@/lib/auth-role-config';
import { sendVerificationEmail } from '@/lib/email-verification';
import { getMongoClient } from '@/lib/mongodb';
import { sendPasswordResetEmail } from '@/lib/password-reset-email';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';


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
      const url = createVerificationUrl(token);
      await sendVerificationEmail(user.email, user.name, url);
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
