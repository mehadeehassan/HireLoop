import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { getMongoClient } from '@/lib/mongodb';
import { createHireLoopAuthRoleConfig } from '@/lib/auth-role-config';
import { sendPasswordResetEmail } from '@/lib/password-reset-email';

const client = getMongoClient();
const db = client.db('hireloopdb');

export const auth = betterAuth({
  ...createHireLoopAuthRoleConfig(),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, user.name, url);
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
