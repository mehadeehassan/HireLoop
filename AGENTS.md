<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## What this repo is

- Next.js 16.4.5 App Router frontend (single package, no workspace). It is a BFF: the browser calls `src/app/api/**`, which verifies the Better Auth session and then calls the backend with a 2-minute HS256 service JWT via `src/lib/job-api.ts`.
- `../hireloop-server` is a separate Express + MongoDB Native Driver service and the source of truth for jobs, applications, companies, messages, notifications, admin data, subscriptions, and quota. Both projects share the `hireloopdb` database.
- Keep `npm run dev` in `../hireloop-server` running on port 5000 while using the app. The frontend defaults to `http://localhost:5000`; `NEXT_PUBLIC_API_BASE_URL` overrides it. A Next.js 502 with `ECONNREFUSED`/`UND_ERR_SOCKET` means the backend is down, not a payload bug.

## Commands and verification

- `npm run dev`, `npm run build`, `npm start`, `npm run lint` (runs bare `eslint`).
- Typecheck with `npx tsc --noEmit` (there is no script).
- Verify in order: `npm run lint` -> `npx tsc --noEmit` -> `npm run build`.
- No test suite exists in either package. Frontend `test:auth-security` and `auth:bootstrap-admin` point at a `scripts/` directory that is absent; backend `test:*` scripts point at missing `*.test.js` files. Do not treat them as runnable verification.
- Backend dev server: `npm run dev` in `../hireloop-server` (`node --watch index.js`).

## Next.js 16 specifics

- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `reactCompiler`. Read the bundled docs in `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Middleware is `src/proxy.ts` in Next 16. It only checks the Better Auth session cookie and redirects to `/signin`; it is not authorization.
- Dashboard routes that read session/dynamic data export `export const instant = false` (see seeker/recruiter pages and the admin layout). Add it to new blocking dashboard routes on the server page, not the client component, or `next build` reports blocking prerender errors.
- The managed `nextjs-agent-rules` block at the top is rewritten by `next dev`; keep it in commits.

## Auth and authorization

- Better Auth (`src/lib/auth.ts`) with the MongoDB adapter is the only identity/role store: `seeker`, `recruiter`, `admin`. Public signup accepts only the separate `signupIntent` values `seeker` or `recruiter`; missing intent defaults to `seeker`, invalid intent is rejected, and `role` remains `input: false`. Email uses a validated additional field; Google validates the intent before adding it to Better Auth's server-controlled OAuth state, so the role is not taken from callback/request data. The signed intent expires after five minutes and stale/missing state defaults to seeker. Admin is never selectable at signup.
- Direct Better Auth admin mutations are blocked in `src/app/api/auth/[...all]/route.ts` via `src/lib/auth-http-guard.ts`. Role and suspension changes must go through `PATCH /api/admin/users/:userId`, which also records backend audit entries. Do not add a second role store or unblock those endpoints.
- Signup sends a Better Auth email-verification link through the server-only `sendEmail` helper in `src/lib/email.ts`; password reset uses that same helper. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` only on the server. Gmail uses an App Password, and `EMAIL_FROM` should match `SMTP_USER` (for example, `"HireLoop <your-gmail@gmail.com>"`). `EMAIL_VERIFICATION_REQUIRED` defaults to `false`; signup still sends verification mail, but sign-in enforcement must remain off until existing users are handled and all existing admin accounts have `emailVerified: true`. Verification links are built from `BETTER_AUTH_URL`, use a fixed same-origin `/signin` callback, expire after 15 minutes, and never auto-sign-in. Email delivery failures are logged without token/URL details and do not block signup or the generic verification response. Better Auth's signed verification tokens are not strictly one-time in the installed version; additional verification emails are server rate-limited to 3 requests per 60 seconds.
- Reuse the server guards instead of ad-hoc session checks: `getActiveAdminSession` (`src/lib/admin-server-auth.ts`), `getCompanyServerContext` (`src/lib/company-server-auth.ts`), `requireBillingContext` (`src/lib/billing-proxy.ts`). `src/lib/admin-user-policy.ts` owns the `banned`/`banExpires` active-account rule.
- Every new admin page/API needs its own server-side role check; hiding navigation is not access control. Prevent self-demotion/suspension and changes that leave no active admin.
- The README's `npm run auth:bootstrap-admin` is stale (missing `scripts/`). There is no HTTP bootstrap endpoint.

## Layout and component ownership

- Routes under `src/app/dashboard/{seeker,recruiter,admin}/` stay thin and render components from `src/components/dashboard/<role>/`; the shell, header, sidebar, and shared widgets live in `src/components/dashboard/shared/`.
- `src/app/dashboard/layout.tsx` redirects unauthenticated users; `DashboardSessionGuard` also redirects to the role-correct dashboard client-side. `getDashboardRole` maps unknown roles to `seeker`.
- `/dashboard` is the role-aware entry point. Seeker pages: overview, jobs, saved, applied, companies, billing, settings, upgrade. Recruiter: overview, jobs, add-job, applications, companies, billing, settings, upgrade. Admin: overview, users, companies, jobs, payments, settings; other `/dashboard/admin/[section]` values are placeholders.

## Backend contract and data safety

- The backend is authoritative. Backend success is the only success; local/profile writes are best-effort mirrors. Never fabricate metrics, messages, notifications, invoices, or plans, and never turn a backend failure into an empty success state—surface the error (usually 502).
- Derive identity from the session and send it as the service-JWT `actor`. Never trust browser-supplied `candidateId`, `recruiterId`, `createdBy`, `createdByRole`, or role.
- `HIRELOOP_JWT_SECRET` is server-only, at least 32 bytes, and identical in both packages. Keep it out of `NEXT_PUBLIC_*`; the backend rejects raw secrets and unauthenticated requests.
- Resume bytes must never appear in seeker list/profile/application responses. The only resume path is `/api/seeker/resume`.
- Application PDFs are base64-encoded once and capped at 5 MB; the backend JSON body limit is 16 MB (5 MB resume + 5 MB avatar). A 413 means a body limit is too low.
- Conversation lists must return `{ conversations: [...] }` with a string `jobId` per item (`"direct"` when there is no job). Seeker notifications keep their existing `{ notifications: [...] }` shape with `id`, `jobId`, `jobTitle`, `company`, `status`, and `createdAt`; admin notifications use the separate admin notification contract.
- Company pages are owner-scoped; the backend derives `createdBy`/`createdByRole` from the JWT actor. The admin directory merges normalized submissions with legacy recruiter-profile/job data; do not add an approval/delete workflow without a defined lifecycle.
- Admin job deletion is a repeat-safe soft delete (`isDeleted`, `deletedAt`, `deletedBy`) that also closes the job. Do not hard-delete, restore, or refund quota; application records and quota history stay.
- Admin payments are read-only: backend `/admin/payments/overview`, `/admin/payments`, `/admin/payments/:paymentId`, and `/admin/subscriptions` only read the existing `payments`/`subscriptions` collections through `requireAdminRole`. Do not add refunds, manual charges, subscription overrides, or trust browser-supplied payment status. Return only safe method metadata and Stripe session/invoice references—never secret keys, card numbers, or CVC.

## Platform settings and enforcement

- Platform configuration lives in one Mongo doc `platform_settings` with `_id: "platform"` (`branding`, `controls`, `createdAt`, `updatedAt`, `updatedBy`). Defaults are merged at read time in `../hireloop-server/services/platform-settings.js`, so a missing doc means "everything on, default branding". Never hardcode a second source of truth in the frontend.
- Backend endpoints: `GET /admin/settings` (admin only), `PATCH /admin/settings` (admin only, allowlisted `branding`/`controls`, unknown keys rejected, atomic `$set`), `GET /admin/settings/audit-logs` (admin only, server-side pagination, filter by `section`), `GET /admin/settings/public` (signature-only service JWT via `requireHireLoopService`, returns only branding + `registration.seekerEnabled` and `registration.recruiterEnabled`). Next proxies under `src/app/api/admin/settings/**` only verify the admin session, sign the service JWT, validate the response shape, and forward.
- Enforcement is real, not UI-only: `seekerRegistration` and `recruiterRegistration` are checked inside Better Auth `databaseHooks.user.create.before` (`src/lib/auth-role-config.ts`) and throw `APIError('FORBIDDEN')`; `jobPosting` gates `POST /jobs` and `PATCH /jobs/:id`; `jobApplications` gates `POST /applications` through `isJobApplicationsEnabled`. Toggles are re-read from Mongo on every request, default to enabled when missing, and changes apply immediately. Disabling a registration role must never block existing sign-ins, and disabling a feature must never delete jobs, applications, or quota.
- Job text limits (`responsibility`/`qualifications` 5000) and resume rules (PDF only, 5 MB, `%PDF-` magic-byte check) are read-only in the settings UI because they are enforced in `utils/job-validation.js` and `routes/seeker-resume-routes.js`. Do not make them editable without wiring matching client-side `maxLength` and keeping the 16 MB body-parser limit.
- Plan limits are read from the `plans` collection, not hardcoded. Starter is fixed at 5 and non-editable; Growth/Premium updates reuse `PUT /subscription-plans/:role/:plan` (6–100000). Never edit Stripe prices, activate subscriptions, or treat settings as a billing source of truth.
- Admin notifications are in-app only and separate from seeker/recruiter notifications. The shared conceptual allowlist in `src/lib/admin-notifications-contract.ts` and `../hireloop-server/services/admin-notification-types.js` contains `user_registered`, `payment_failed`, `payment_succeeded`, `subscription_changed`, `job_posted`, `job_deleted_by_admin`, `application_submitted`, `company_submitted`, `admin_role_or_suspension_changed`, `quota_limit_reached`, `critical_system_error`, and `activity_digest`. Keep these lists and their labels aligned. `user_registered` covers new seeker and recruiter accounts; its notification message identifies the role, while the internal endpoint trusts only the signed seeker/recruiter actor and never accepts email from the request. Email and push are unconfigured; show them as not configured/disabled and never invent delivery.
- Backend collections are `admin_notifications` (immutable event documents), `admin_notification_reads` (unique `{ adminId, notificationId }` reads plus the `notificationId: "readAllBefore"` per-admin marker), and `admin_notification_preferences` (unique per-admin in-app preferences). Their indexes are initialized in `../hireloop-server/index.js`. Global defaults are under `platform_settings.controls.notifications`; missing values merge to enabled in `services/platform-settings.js`. Per-admin preferences default to enabled. Never put read state on the immutable event, delete events when a toggle is disabled, or use localStorage for admin read state.
- `services/admin-notifications.js` owns `emitAdminNotification` and the admin router. Emission re-reads global settings, skips globally disabled types, deduplicates by unique `dedupeKey`, stores safe IDs/summaries only, catches/logs errors, and is invoked outside quota/payment transactions. Event sources are Better Auth seeker/recruiter `databaseHooks.user.create.after` (best-effort, never blocks signup), Stripe invoice/Checkout/subscription webhook events (after commit, Stripe event ID dedupe), `POST /jobs`, admin soft delete, `POST /applications`, `POST /companies`, post-transaction monthly-limit 429 paths, successful `/admin/audit/:auditId` finalization, 5xx API responses/error middleware (route/status/10-minute dedupe), failed Stripe webhook processing, and a daily digest from actual Mongo counts. Never include secrets, card data, resumes, user email, or raw request/error content.
- Backend admin endpoints are `GET /admin/notifications?limit=20&cursor=…&unread=true|false&type=…`, `GET /admin/notifications/unread-count`, `PATCH /admin/notifications/:id/read`, `POST /admin/notifications/read-all`, `GET /admin/notifications/preferences`, and `PATCH /admin/notifications/preferences` with `{ types: { [type]: { inApp: boolean } } }`. List response is `{ notifications: [{ id, type, severity, title, message, link, createdAt, read }], nextCursor, unreadCount }`. Preferences return a merged type map with global/admin enabled values and in-app/email/push channel status. User-facing endpoints must run both the signed service-JWT guard and active-admin guard; actor identity comes from the JWT. The internal signup event endpoint accepts only signed seeker/recruiter actors and is not exposed through a browser proxy.
- Global type switches are changed through the existing audited `PATCH /admin/settings` payload `{ controls: { notifications: { [type]: boolean } } }`. The backend allowlists every type, writes `controls.notifications.<type>`, adds immutable `admin_settings_audits` entries under section `notifications`, and supports that section in `GET /admin/settings/audit-logs`. Keep the frontend audit filter in `src/app/api/admin/settings/audit-logs/route.ts` aligned.
- Next BFF routes live under `src/app/api/admin/notifications/**` and use `proxyAdminNotification` (`src/lib/admin-notifications-proxy.ts`): every request calls `getActiveAdminSession`, signs the short-lived actor JWT with `fetchBackendWithSecret`, validates response shape, disables caching, and surfaces backend errors. Never add direct browser-to-Express access or trust a browser admin ID.
- The bell is `AdminNotificationMenu` in `src/components/dashboard/shared/`, mounted by the admin shell. It polls unread count every 30 seconds only while the tab is visible, refreshes on focus/menu open, caps the badge at `99+`, and persists individual/read-all state on the backend. Preserve its loading/empty/error-retry states, keyboard Escape/arrow navigation, safe admin-only links, and accessibility labels. Seeker/recruiter menus and their response/read-state contracts stay unchanged. A full notifications page is optional; the current menu presents the newest 20.
- Settings UI is `AdminNotificationSettings` mounted in the Notifications tab of `AdminSettingsManager`: personal switches use optimistic update with rollback/toast through the preferences endpoint; global switches persist through settings PATCH and are audited; personal controls are disabled with a platform-wide hint when their global type is off. Only in-app is active. Do not restore the former read-only UI or claim that email/push are configured.
- Dashboard settings remain client components; if adding a new server dashboard page for notifications, export `instant = false` on that server page. Keep admin notifications separate from the seeker contract `{ notifications: [{ id, jobId, jobTitle, company, status, createdAt }] }`.
- Admin configuration changes are appended to `admin_settings_audits` (actorId, action, section, field, previousValue, newValue, createdAt). Records are immutable from the dashboard—never add edit/delete. Logo values are logged as `[image]` and long strings truncated to 240 chars.
- Logo upload uses the existing base64 data-URL path (PNG/JPEG/WebP, 1 MB, magic-byte verified). Public branding is reflected on `/signin` and `/signup` via `src/lib/platform-settings.ts`; never expose the full settings doc publicly.

## Billing and plans

- Monthly quotas are backend-authoritative: Starter 5/5, Growth 25/20, Premium 100/50 (seeker applications / recruiter job posts). Read usage from `/applications/count` and `/jobs/count`; do not recompute entitlement locally or let profile settings choose a plan.
- Card entry and plan management must stay on Stripe-hosted Setup Checkout/Billing Portal. Never collect or store card numbers/CVC, and only show a saved card after server-side SetupIntent verification.
- Keep the prior plan until Stripe confirms payment. Upgrades prorate; if an invoice needs payment, open its Stripe-hosted URL. For an archived Stripe product, create/reuse an active product and persist `stripeProductId` in the backend `plans` document instead of reactivating it or replaying old idempotency keys.
- Use backend-owned payment records and allow-listed Stripe URLs (`safeStripeUrl` in `src/lib/billing-proxy.ts`), never arbitrary URLs. Billing pages share `src/components/dashboard/shared/BillingHistory.tsx`.

## UI conventions and local-only state

- User-owned data stays server-side. Any user-specific browser storage must be keyed by user ID and cleared on sign-out or account change.
- Plan labels are display-only: recruiter `Starter` -> `Free` and `Premium` -> `Growth`; seeker shows `Starter Tier`, `Growth Tier`, or `Premium Tier`. Missing plan defaults to `Starter`.
- Saved jobs (`src/lib/seeker-jobs.ts`), archived applications (`hireloop:archived-applications`), and seeker notification read markers (`hireloop:seeker-notification-read`) are browser-local and do not sync. Admin notification read state is backend-persisted per admin.
- Job apply links go through `getJobApplyHref` in `src/lib/job-routes.ts`.
- `DashboardAvatar` falls back to the first two characters of the name. `next/image` with external or data URLs needs explicit dimensions and `unoptimized`.
- Keep sign-in errors generic (`Email or password is incorrect.`) and show them as both a toast and an inline password-field error with `aria-invalid`/`aria-describedby`; clear the server error when the user edits email or password.
- Match the existing dark, Figma-derived dashboard styling and responsive seeker/recruiter/admin shells.

## Environment

- `.env` needs `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_DB_URL` (Mongo, `hireloopdb`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `HIRELOOP_JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`; `SMTP_HOST` defaults to `smtp.gmail.com`, `SMTP_PORT` to `465`, and `SMTP_SECURE` is true when the port is 465. `EMAIL_VERIFICATION_REQUIRED` defaults to `false`, and `NEXT_PUBLIC_API_BASE_URL` is optional. `.env*` is gitignored—never commit secrets.
- Stripe secret and webhook keys belong only in `../hireloop-server`; the frontend uses hosted session URLs returned by authenticated proxies.
