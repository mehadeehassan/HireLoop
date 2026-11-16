# HireLoop

A job platform for **job seekers**, **recruiters**, and **admins**. This repository is the Next.js
frontend. It talks to the HireLoop backend (`../hireloop-server`), which owns all business logic,
quotas, billing, and data.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [How it works](#how-it-works)
- [Authentication and roles](#authentication-and-roles)
- [Sign-up, email verification, and password reset](#sign-up-email-verification-and-password-reset)
- [Dashboards](#dashboards)
- [Billing](#billing)
- [Admin settings and notifications](#admin-settings-and-notifications)
- [Project structure](#project-structure)
- [Local-only state](#local-only-state)
- [Troubleshooting](#troubleshooting)
- [Contributing checklist](#contributing-checklist)

## Features

- **Job seekers:** browse and filter jobs, save jobs, apply with a profile and PDF resume, track
  applications, message recruiters, manage billing and a monthly application quota.
- **Recruiters:** post and manage jobs, review applications, manage company pages, message
  candidates, manage billing and a monthly job-post quota.
- **Admins:** manage users and roles, jobs, companies, and payments; control platform settings,
  branding, and plan limits; receive in-app notifications about activity across the platform.
- **Billing:** Stripe-hosted Checkout, Billing Portal, and invoices. No card data ever touches this
  app.

## Tech stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router) with `cacheComponents`, `partialPrefetching`, and the React Compiler |
| Language | TypeScript |
| Authentication | Better Auth with the MongoDB adapter (email/password and Google) |
| Email | Resend (password reset and signup verification), server-side only |
| Payments | Stripe-hosted pages, driven by the backend |
| Backend | Express + MongoDB service in `../hireloop-server` |

> This is **not** the Next.js you may know. Next 16 has breaking changes, so read the relevant guide
> in `node_modules/next/dist/docs/` before using an unfamiliar API.

## Getting started

Prerequisites: Node.js, a MongoDB database (local or Atlas), and the backend running.

```sh
npm install
cp .env.example .env      # fill in your own development values
npm run dev               # http://localhost:3000
```

Also start the backend in a second terminal:

```sh
cd ../hireloop-server
npm run dev               # http://localhost:5000
```

Use a **local or dev** database and Stripe **test** keys while developing. Never commit `.env` and
never paste its values into chats or tickets.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `BETTER_AUTH_URL` | Yes | Public origin of this app, for example `http://localhost:3000`. |
| `BETTER_AUTH_SECRET` | Yes | Better Auth signing secret. |
| `BETTER_AUTH_DB_URL` | Yes | MongoDB connection string for the `hireloopdb` database. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Yes | Google sign-in. |
| `HIRELOOP_JWT_SECRET` | Yes | At least 32 bytes. Must be identical in the backend. Server-only. |
| `NEXT_PUBLIC_API_BASE_URL` | No | Backend URL. Defaults to `http://localhost:5000`. |
| `RESEND_API_KEY` | For email | Server-only. Never use a `NEXT_PUBLIC_` prefix. |
| `EMAIL_FROM` | For email | Sender address, verified in Resend. (`RESEND_FROM_EMAIL` still works until migrated.) |
| `EMAIL_VERIFICATION_REQUIRED` | No | `true` or `false`. Defaults to `false`. See below. |

Rules:

- `.env*` files are gitignored. Never commit secrets.
- Stripe secret and webhook keys belong **only** in the backend. This app uses hosted session URLs
  returned by authenticated server routes.
- Keep `HIRELOOP_JWT_SECRET` out of any `NEXT_PUBLIC_*` variable.
- If MongoDB authentication fails with a server-selection or DNS error, check the cluster hostname in
  Atlas, confirm the cluster is running, and make sure your network can reach it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000. |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | Runs ESLint. |
| `npx tsc --noEmit` | Type check (there is no script for it). |
| `npm run auth:bootstrap-admin -- user@example.com` | Promote one existing account to admin, in a trusted server environment. See below. |

There is no automated test suite. Verify changes in this order:

```sh
npm run lint && npx tsc --noEmit && npm run build
```

## How it works

```text
Browser -> Next.js server routes (src/app/api/**) -> Express backend (../hireloop-server) -> MongoDB
```

This app is a backend-for-frontend (BFF):

1. The browser calls routes under `src/app/api/**`.
2. Each route verifies the Better Auth session and derives the user's identity and role.
3. It calls the backend through `src/lib/job-api.ts` with a **two-minute signed service token**
   (HS256, secret `HIRELOOP_JWT_SECRET`).
4. The backend is the source of truth: it checks the actor again, enforces rules and quotas, and
   returns the result. This app validates the response shape and forwards it.

Consequences worth remembering:

- The browser never calls the backend directly, and the signing secret never reaches the browser.
- Business rules, quotas, and permissions live in the backend, not in React components.
- Identity always comes from the session. Request fields such as `candidateId`, `recruiterId`, or
  `role` sent by the browser are never trusted.
- A backend failure is shown as an error (usually a 502), never as an empty "success" screen.

## Authentication and roles

- Better Auth with the MongoDB adapter is the **only** identity and role store. Roles are `seeker`,
  `recruiter`, and `admin`. The `role` field cannot be set from user input.
- `src/proxy.ts` only checks for a session cookie and redirects to `/signin`. It is **not**
  authorization.
- Server guards do the real checks: `getActiveAdminSession`, `getCompanyServerContext`,
  `requireBillingContext`. Every admin page and API needs its own server-side role check; hiding a
  link is not access control.
- Role and suspension changes go through `PATCH /api/admin/users/:userId`, which also writes a backend
  audit record. Direct Better Auth admin endpoints are blocked on purpose.
- Self-demotion, self-suspension, and removing the last active admin are prevented.

### Bootstrapping the first admin

Create a normal account first, then in a trusted server environment with `BETTER_AUTH_DB_URL`
configured:

```sh
npm run auth:bootstrap-admin -- user@example.com
```

The command promotes only that existing account, is idempotent, revokes its sessions, and records the
action in the admin audit collection. It is a command, not an HTTP endpoint.

## Sign-up, email verification, and password reset

- Public sign-up accepts a **Job Seeker** or **Recruiter** choice. The role is set on the server when
  the account is created and is never taken from an email link. Admins are never created through
  sign-up.
- Registration can be switched off per role by an admin (Platform Controls). Turning a role off
  blocks only new sign-ups for that role; existing users can still sign in.
- **Password reset** and **signup verification** use the same server-only Resend sender.
  `RESEND_API_KEY` and `EMAIL_FROM` stay on the server. The sender address must be verified in Resend.
  Reset links expire after one hour. Verification links expire after 15 minutes and lead to the
  sign-in page afterwards (they do not create a session automatically).
- `EMAIL_VERIFICATION_REQUIRED` defaults to `false`: sign-up still sends a verification email, but
  nobody is blocked from signing in yet.

Before setting `EMAIL_VERIFICATION_REQUIRED=true`:

1. Verify every existing admin account, or they will be locked out.
2. Verify your sending domain in Resend (the shared `onboarding@resend.dev` sender only delivers to
   your own Resend account email).
3. Decide how to handle existing unverified email/password users.

With enforcement on, unverified users cannot sign in until they verify.

## Dashboards

`/dashboard` is a role-aware entry point that sends each user to their own dashboard.

| Role | Pages |
| --- | --- |
| Seeker | overview, jobs, saved, applied, companies, billing, settings, upgrade |
| Recruiter | overview, jobs, add-job, applications, companies, billing, settings, upgrade |
| Admin | overview, users, companies, jobs, payments, settings |

Route files stay thin and render components from `src/components/dashboard/<role>/`. The shell, header,
sidebar, and shared widgets live in `src/components/dashboard/shared/`. The look is a dark,
Figma-derived dashboard, responsive on mobile.

## Billing

- Plans: Starter, Growth, and Premium. Monthly quotas come from the backend (seeker applications and
  recruiter job posts: Starter 5/5, Growth 25/20, Premium 100/50). The UI never computes entitlement
  itself.
- Card entry and plan management happen on **Stripe-hosted** pages (Checkout, Billing Portal, hosted
  invoices). This app never sees card numbers or CVC.
- A plan changes only after Stripe confirms payment. Upgrades are prorated by Stripe.
- Plan labels are display-only: recruiters see `Starter` as **Free** and `Premium` as **Growth**;
  seekers see **Starter Tier**, **Growth Tier**, or **Premium Tier**.

## Admin settings and notifications

- **Platform settings** (admin only): branding, registration and marketplace controls, job and
  application rules, plan limits, and an activity log of every change. Toggles are enforced by the
  backend and Better Auth, not just hidden in the UI, and take effect immediately.
- **Admin notifications** are in-app only. The header bell shows an unread count (capped at `99+`),
  polls every 30 seconds while the tab is visible, and keeps read state per admin on the server.
  Personal preferences and platform-wide defaults are managed in Settings, under Notifications.
  Email and push are shown as not configured.
- Seeker and recruiter notification menus are separate and keep their own contract.

## Project structure

```text
src/
├── app/
│   ├── api/                 # BFF routes: session check -> backend call -> shape check -> forward
│   ├── dashboard/           # seeker, recruiter, admin pages (thin server pages)
│   ├── signin/ signup/      # authentication pages
│   └── ...
├── components/
│   ├── auth/                # sign-in and sign-up forms
│   └── dashboard/
│       ├── seeker/  recruiter/  admin/
│       └── shared/          # shell, header, sidebar, billing history, notification menus
├── lib/                     # job-api.ts, auth.ts, server guards, contracts, settings helpers
└── proxy.ts                 # session-cookie redirect (Next 16 "middleware")
```

Useful files: `src/lib/job-api.ts` (signed calls to the backend), `src/lib/auth.ts` and
`src/lib/auth-role-config.ts` (Better Auth and role rules), `src/lib/admin-server-auth.ts`,
`src/lib/billing-proxy.ts`, and `src/lib/admin-notifications-contract.ts`.

## Local-only state

A few things live in the browser only and do not sync across devices:

- Saved jobs (`src/lib/seeker-jobs.ts`)
- Archived applications (`hireloop:archived-applications`)
- Seeker notification read markers (`hireloop:seeker-notification-read`)

Admin notification read state is different: it is stored on the server per admin.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| A 502 with `ECONNREFUSED` or `UND_ERR_SOCKET` | The backend is not running. Start it in `../hireloop-server`. |
| All requests return 401 | `HIRELOOP_JWT_SECRET` differs between the frontend and backend. |
| A 413 error on upload | A request body limit is too low (backend JSON limit is 16 MB). |
| Sign-in fails with a MongoDB server-selection or DNS error | Wrong or unreachable `BETTER_AUTH_DB_URL`. Check the Atlas cluster and your network. |
| No password reset or verification email | `RESEND_API_KEY` or `EMAIL_FROM` is missing, or the sender is not verified in Resend. |
| `next build` reports blocking prerender errors | A dashboard route reads session data but its server page does not export `instant = false`. |

## Contributing checklist

- Keep dashboard routes thin; put UI in `src/components/dashboard/...`.
- Add `export const instant = false` on the **server page** (not the client component) of any new
  dashboard route that reads session or dynamic data.
- Reuse the existing server guards; do not write ad-hoc session checks.
- Never trust browser-supplied identity, role, status, price, or payment status.
- Never fabricate data or turn a backend failure into an empty success state.
- Match the existing dark, responsive styling and keep accessibility attributes.
- Run `npm run lint`, then `npx tsc --noEmit`, then `npm run build` before finishing.
- For agent-specific rules, see `AGENTS.md`.