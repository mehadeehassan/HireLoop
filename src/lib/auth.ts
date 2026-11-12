import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { getMongoClient } from '@/lib/mongodb';

const client = getMongoClient();
const db = client.db('hireloopdb');

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ['seeker', 'recruiter', 'admin'],
        input: true,
        required: true,
        defaultValue: 'seeker',
      },
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
