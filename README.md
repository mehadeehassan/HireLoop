This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database configuration

Set `BETTER_AUTH_DB_URL` in `.env` to the current MongoDB connection string for an active cluster. If authentication fails with a MongoDB server-selection or DNS error, verify the cluster hostname in Atlas, that the cluster is running, and that your network can resolve and reach it.

Authenticated admin user-management requests go through `PATCH /api/admin/users/:userId`. Direct
Admin Plugin mutation endpoints are blocked so role and suspension changes cannot bypass safety
checks, session revocation, or the backend audit record.

## Password reset email

Password reset and signup email verification use the same server-only Resend sender. Configure
`RESEND_API_KEY` and `EMAIL_FROM` in the frontend server environment; the sender address must be
verified in Resend. Keep these values server-only and do not use `NEXT_PUBLIC_` variables.
`EMAIL_VERIFICATION_REQUIRED` defaults to `false`: signup still sends a verification email, but
existing users can sign in without verifying until enforcement is enabled. Reset links expire after
one hour. Signup verification links expire after 15 minutes and lead to sign-in after verification
(they do not automatically create a session). Existing deployments using `RESEND_FROM_EMAIL`
continue to work until migrated to `EMAIL_FROM`.

Before changing `EMAIL_VERIFICATION_REQUIRED` to `true`, verify every existing admin account, verify
the Resend sender domain, and decide how to handle existing unverified email/password users. With
enforcement enabled, unverified users cannot sign in until they verify their email.

Public signup accepts the seeker or recruiter intent; the role is set server-side and never taken
from an email link. To bootstrap the first admin, create a normal account and run
`npm run auth:bootstrap-admin -- user@example.com` in a trusted server environment with
`BETTER_AUTH_DB_URL` configured. The command can only promote the specified existing account, is
idempotent for that account, revokes its sessions, and records the bootstrap action in the admin
audit collection; it is not an HTTP endpoint.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
