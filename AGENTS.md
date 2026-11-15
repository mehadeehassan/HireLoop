<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Recruiter dashboard identity and plan

- The recruiter sidebar card is `src/components/dashboard/shared/SidebarProfileCard.tsx`. Keep recruiter name and plan conditional; do not show seeker plan information in the recruiter dashboard.
- The card reads `recruiterName` and `plan` from `GET /api/recruiter/profile`. Missing plan data defaults to `Starter`; display `Starter` as `Free` and `Premium` as `Growth`.
- Plan values belong to recruiter profile/subscription data. Do not allow profile settings to change a plan unless a subscription or authorized plan-management flow is implemented.
- `DashboardAvatar` displays a user's image when available; otherwise its fallback uses the first two characters of the displayed name.

## Seeker dashboard plan

- The seeker sidebar card uses `plan` from `GET /api/seeker/profile`; missing plan data defaults to `Starter`.
- Display seeker plans conditionally as `Starter Tier`, `Growth Tier`, or `Premium Tier`. Legacy `free` maps to `Starter`; unknown values fall back to `Starter`.
- Keep plan ownership in seeker profile/subscription data. Do not add a user-editable plan selector unless a subscription or authorized plan-management flow is implemented.
- `/dashboard` is the role-aware entry point and redirects signed-in users to their role dashboard; keep the Next.js `instant` route config on the server page, not its client component.

## Seeker dashboard implementation

- Seeker-specific dashboard screens and reusable UI live in `src/components/dashboard/seeker/`; routes under `src/app/dashboard/seeker/` should stay thin and render those components.
- Implemented routes: dashboard overview, jobs, saved jobs, applications, billing, and settings. Shared dashboard shell, navigation, header actions, notifications, and common widgets live in `src/components/dashboard/shared/`; recruiter-specific components live in `src/components/dashboard/recruiter/`.
- Dashboard metrics and activity derive from seeker applications; job lists use `/api/jobs`; saved IDs and their timestamps use browser-local storage via `src/lib/seeker-jobs.ts`. Saved-job closing-soon counts use the optional job deadline.
- Job apply links use `src/lib/job-routes.ts` to open the job-specific apply form directly. Seeker application archive/restore is a local-only display preference (`hireloop:archived-applications`); it does not change backend status and does not sync across devices.
- Application details display only fields already returned to the authenticated seeker by `/api/seeker/applications`; never expose uploaded resume bytes in this list or the details dialog.
- Seeker profile data is owned by `/api/seeker/profile`; resume file download/removal uses `/api/seeker/resume`. Keep profile APIs seeker-authorized and never return uploaded resume bytes in normal profile/application list responses.
- Saved jobs currently remain browser-local. Billing displays the stored seeker plan plus only provider-backed subscription, payment-method, and invoice data. Card entry and plan management must use Stripe-hosted setup/portal sessions; never collect or store raw card numbers or imply that a charge or subscription change occurred without backend confirmation.
- User profile images in `next/image` must include dimensions and be unoptimized when they may be external or data URLs. `DashboardAvatar` uses a plain image with initials as the fallback.
- Match the provided dark Figma design with responsive seeker-only shell styling. Run targeted ESLint, `npx tsc --noEmit`, and `npm run build` after seeker dashboard changes.

## Application submission

- `POST /api/jobs/:id/apply` authenticates the seeker and derives `candidateId` from the session and `recruiterId` from the backend job record. It forwards applications to the separate backend's `POST /applications`.
- Configure the same random `HIRELOOP_JWT_SECRET` (at least 32 bytes) in the Next.js app and backend `.env` files. Keep it server-only; Next.js signs two-minute HS256 service JWTs, and the backend rejects raw secrets, expired tokens, and unauthenticated requests in every environment.
- The uploaded PDF is base64-encoded once in the application payload and is capped at 5 MB. Configure the backend JSON parser before its routes with `express.json({ limit: '8mb' })` and configure any reverse proxy/load balancer body limit to at least 8 MB; otherwise PDF submissions can fail with HTTP 413. Validate the payload and job/recruiter relationship, and enforce duplicate applications with a unique `(candidateId, jobId)` constraint.
- Seeker application history is loaded from the separate backend via authenticated `GET /applications?candidateId=<session seeker id>`, so recruiter status updates appear dynamically. The backend must require the short-lived server-to-server JWT, filter by the requested candidate ID, and exclude resume bytes from results. The Next.js proxy also filters returned records to the signed-in seeker.
- Seeker billing is proxied through authenticated `/api/seeker/billing`. The separate backend contract is `GET /billing?candidateId=...`, `POST /billing/payment-methods/setup-session`, and `POST /billing/portal-session`, all protected by the short-lived server-to-server JWT. Resolve customer IDs from trusted backend records, return only safe card metadata and hosted invoice URLs, and never accept/store raw card data from HireLoop.
- Seeker notifications in the dashboard header are loaded by `src/components/dashboard/shared/SeekerNotificationMenu.tsx` from authenticated `GET /api/seeker/notifications`. The Next.js proxy calls the separate backend's JWT-protected `GET /notifications?candidateId=...` and returns `{ notifications: [...] }`; the component must read the `notifications` array (not `applications`). Each item includes `id`, `jobId`, `jobTitle`, `company`, `status`, and `createdAt`. The proxy derives `candidateId` from the signed-in seeker session and excludes resume data. Recruiter status updates are mirrored to the backend first using the JWT-protected `PATCH /applications/status`, so notification status and timestamps stay current. Notifications refresh while the menu is open; read markers use `hireloop:seeker-notification-read` in browser-local storage and are not synced across devices.
- Seeker messaging is implemented in `src/components/dashboard/shared/SeekerMessagesMenu.tsx`; recruiters can start direct conversations with any seeker by name from `src/components/dashboard/recruiter/RecruiterMessagesMenu.tsx`, which also handles recruiter inbox/replies. Recruiter messages use the recruiter ID from the authenticated session; the browser never chooses or submits that identity. The recruiter-only `/api/recruiter/candidates?q=...` endpoint searches seeker names and returns only seeker IDs and display names, never email, resume, or profile details. The authenticated Next.js proxies are `/api/seeker/messages`, `/api/seeker/messages/[conversationId]`, `/api/recruiter/messages`, and `/api/recruiter/messages/[conversationId]`. Conversation previews must include `id`, `candidateId`, `recruiterId`, `jobId`, `participantName`, `jobTitle`, `unreadCount`, and `lastMessage`; legacy conversations without a job use `jobId: "direct"`. The separate backend must provide JWT-protected seeker and recruiter inbox, thread, send, and mark-read routes. The backend validates conversation membership; direct recruiter messages require the recipient account to have the seeker role. Job-related applicant messages additionally verify recruiter job ownership and the application. Applications and direct messages use separate conversation keys. Messages and notifications must come from backend records; never fabricate them.
- Keep the recruiter conversation-list response shape aligned across backend, proxy, and UI: `GET /recruiter/messages` returns `{ conversations: [...] }`, and every conversation preview includes a string `jobId` (use `"direct"` for legacy/direct threads without a job). The UI validates this field, so omitting it causes the whole inbox load to fail even when messages were successfully sent.
- Keep the JWT signing secret server-only. If notification data is missing or malformed, surface the API error instead of silently treating it as an empty list. Preserve the notification response contract consistently between the backend route, Next.js proxy, and seeker menu.
- Backend acceptance is authoritative. Local application/profile writes are best-effort mirrors after backend success; do not report a failed application if only the local mirror fails. Do not return resume bytes from seeker list/profile APIs.

## Subscription limits and billing

- Billing and subscription records are role-scoped in the separate `hireloop-server` Express backend, which uses the MongoDB Native Driver. Keep Seeker and Recruiter plans, usage, payment history, and subscription status independent.
- Monthly limits are Starter: 5 applications for Seekers and 5 job posts for Recruiters; Growth: 25 applications and 20 job posts; Premium: 100 applications and 50 job posts. Keep plan limits backend-authoritative and configurable through the existing plan data; never let profile settings choose a plan.
- Enforce limits atomically before creating applications or jobs. Count only successful real records; duplicate applications, failed creates, and dummy applications must not consume usage.
- Current usage/reset details come from the backend count endpoints (`GET /applications/count` for seekers and `GET /jobs/count` for recruiters); the UI should use their plan, used, remaining, and reset-date data rather than recomputing entitlement locally.
- Upgrade requests from active paid plans use the authenticated checkout proxy and backend subscription flow. A paid upgrade is not active until Stripe confirms payment; preserve pending-upgrade state and do not claim a charge or plan change before confirmation.
- Upgrading an existing subscription applies Stripe proration. If an invoice needs payment, return/open its Stripe-hosted payment URL and keep the prior plan until Stripe confirms success. Keep resume/cancel controls for pending Checkout sessions ownership-checked and idempotent.
- If an upgrade's existing Stripe product is archived, do not create a Price on it or silently reactivate it. Create/reuse an active product for the target role and plan, persist its `stripeProductId` in the backend `plans` document, and create/find the matching Price there. Stripe idempotency keys for the Price and subscription update must distinguish the new product/Price so an earlier failed inactive-product response cannot be replayed. Backend implementation is in `../hireloop-server/index.js`.
- Card setup and plan management must stay on Stripe-hosted Setup Checkout/Billing Portal. Never collect or store raw card numbers or CVC. Verify setup completion server-side using the returned Checkout session ID and authenticated owner before showing safe card metadata; only show a saved card after Stripe confirms the SetupIntent and PaymentMethod ownership.
- Seeker and Recruiter may display safe card metadata for linked Stripe customers belonging to the same account, but keep subscriptions and invoices role-scoped. The setup verification proxy is `src/app/api/billing/payment-methods/verify-setup-session/route.ts`; the backend owns the Stripe verification and default-payment-method update.
- Seeker and Recruiter billing pages share `src/components/dashboard/shared/BillingHistory.tsx` for invoice details/download and pending payment actions. Use backend-owned payment records and Stripe-hosted invoice URLs; do not fabricate invoice, card, or payment status.
- Invoice downloads should use the ownership-checked, allow-listed Stripe PDF URL rather than fetching/streaming the PDF through the backend. Do not expose arbitrary URLs or resume bytes.
- Usage, payment, and notification API failures must remain visible as errors; never turn a failed/malformed backend response into an empty success state.

## Local backend connectivity

- The Express API is a separate project in `../hireloop-server`; run its existing `npm run dev` watcher and keep that terminal running while using the Next.js app. The frontend defaults to `http://localhost:5000` through `src/lib/job-api.ts`.
- A Next.js `502` with `ECONNREFUSED` or `UND_ERR_SOCKET` means the backend process was unavailable or restarted; check `GET /` on port 5000 and the backend terminal before debugging the feature payload. Do not work around backend outages by fabricating billing, application, or notification data.
- The protected backend requires the server-only `HIRELOOP_JWT_SECRET` in all environments. Keep it out of browser code and `NEXT_PUBLIC_` variables.

## Sign-in error UX

- Email sign-in is implemented in `src/components/auth/AuthForm.tsx`. Keep invalid credentials generic (`Email or password is incorrect.`) to avoid exposing whether an account exists.
- For invalid-credential responses, dismiss the loading toast before creating a separate error toast, and render the same error below the password field with `aria-invalid`/`aria-describedby`. Clear that server error when the user edits the email or password; keep client-side required/format validation separate.

## Implemented HireLoop sections

### Identity and admin security

- Better Auth is the source of truth for `seeker`, `recruiter`, and `admin` roles. Public signup creates seekers; recruiter/admin access is assigned through protected admin flows, never from signup input.
- The initial admin is bootstrapped server-side with `npm run auth:bootstrap-admin`; there is no public bootstrap endpoint.
- Admin routes use an active Better Auth session on the Next.js server. Protected Express requests use a two-minute service JWT, and the backend rechecks the actor's current role and suspension state.
- User management uses Better Auth Admin APIs for role and suspension changes, revokes sessions as needed, and records actions through the admin audit endpoints. Do not add a second role store.

### Admin dashboard and users

- `/dashboard/admin` has a shared responsive sidebar/layout and a database-backed overview for users, companies, jobs, applications, and payments.
- `/dashboard/admin/users` supports search, role/status filters, sorting, pagination, and confirmed role/suspension actions. Prevent self-demotion/suspension and changes that would leave no active admin.
- Keep server-side admin authorization on every new admin page/API; hiding navigation is not access control.

### Company submissions and directory

- Seeker and recruiter dashboards both have owner-scoped Companies pages. The backend derives `createdBy` and `createdByRole` from the authenticated Service JWT actor; never trust those fields from browser input.
- Company records live in MongoDB. User APIs support validated create/list/details/update, duplicate handling, and ownership checks. Existing recruiter profile data is preserved.
- The Admin Companies directory combines normalized submissions with legacy recruiter-profile and job company data. Do not add an approval workflow or delete/archive operation without an established lifecycle and safe reference handling.

### Admin jobs

- `/dashboard/admin/jobs` displays real, server-paginated job data with title/company search, status/category/location/type/recruiter filters, sorting, database-derived summaries, details, and validated editing.
- Admin job APIs are `/api/admin/jobs`, `/api/admin/jobs/:jobId`, `/api/admin/jobs/:jobId/status`, and `DELETE /api/admin/jobs/:jobId`; matching Express endpoints are mounted under `/admin/jobs`.
- Status management supports Active → Closed and Closed/Expired → Active. It does not change recruiter quota or application records. Closed/unpublished jobs are excluded from public listings and cannot accept new applications.
- `AdminJobsManager` offers Delete from the jobs table and job-details dialog, with a confirmation dialog, success/error toast, and list refresh. The authenticated Next.js `DELETE /api/admin/jobs/:jobId` proxy calls the active-admin-only Express `DELETE /admin/jobs/:jobId` endpoint.
- Deletion is a repeat-safe soft delete (`isDeleted`, `deletedAt`, `deletedBy` from the verified admin actor), and also sets status to Closed and `isActive` to false. Admin, recruiter, and public listings/details, dashboard totals, and related-company job counts exclude deleted jobs; application submission rejects them.
- Soft deletion preserves application records and recruiter quota history; it does not physically delete a job or refund quota. Do not hard-delete jobs or add a restore flow without an explicit lifecycle contract.

### Verification notes

- For admin job changes, run the focused backend tests (`npm run test:admin-jobs`, `npm run test:applications`) and the frontend ESLint, `npx tsc --noEmit`, and `npm run build`.
- Admin soft-delete coverage checks active-admin authorization, soft-delete metadata, repeat requests, and rejection of applications without consuming quota.
- Dashboard statistics, jobs, companies, applications, and billing data must come from their authoritative backend/Better Auth sources. Do not add fabricated metrics or success-shaped fallbacks.
