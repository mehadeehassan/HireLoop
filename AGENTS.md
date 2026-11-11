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
- Configure `HIRELOOP_APPLICATIONS_API_SECRET` as a server-only environment variable in both the Next.js app and backend. The proxy sends it as a Bearer token; never expose it with a `NEXT_PUBLIC_` variable. Production requires the secret and the backend must reject requests without a matching token. Local development may omit it to use the existing local backend, with a warning; do not use that unauthenticated setup in production.
- The uploaded PDF is base64-encoded once in the application payload and is capped at 5 MB. Configure the backend JSON parser before its routes with `express.json({ limit: '8mb' })` and configure any reverse proxy/load balancer body limit to at least 8 MB; otherwise PDF submissions can fail with HTTP 413. Validate the payload and job/recruiter relationship, and enforce duplicate applications with a unique `(candidateId, jobId)` constraint.
- Seeker application history is loaded from the separate backend via authenticated `GET /applications?candidateId=<session seeker id>`, so recruiter status updates appear dynamically. The backend must enforce the shared Bearer secret, filter by the requested candidate ID, and exclude resume bytes from results. The Next.js proxy also filters returned records to the signed-in seeker.
- Seeker billing is proxied through authenticated `/api/seeker/billing`. The separate backend contract is `GET /billing?candidateId=...`, `POST /billing/payment-methods/setup-session`, and `POST /billing/portal-session`, all protected by the shared Bearer secret. Resolve customer IDs from trusted backend records, return only safe card metadata and hosted invoice URLs, and never accept/store raw card data from HireLoop.
- Seeker notifications in the dashboard header are loaded by `src/components/dashboard/shared/SeekerNotificationMenu.tsx` from authenticated `GET /api/seeker/notifications`. The Next.js proxy calls the separate backend's secret-protected `GET /notifications?candidateId=...` and returns `{ notifications: [...] }`; the component must read the `notifications` array (not `applications`). Each item includes `id`, `jobId`, `jobTitle`, `company`, `status`, and `createdAt`. The proxy derives `candidateId` from the signed-in seeker session and excludes resume data. Recruiter status updates are mirrored to the backend first using secret-protected `PATCH /applications/status`, so notification status and timestamps stay current. Notifications refresh while the menu is open; read markers use `hireloop:seeker-notification-read` in browser-local storage and are not synced across devices.
- Seeker messaging is implemented in `src/components/dashboard/shared/SeekerMessagesMenu.tsx`; recruiters can start direct conversations with any seeker by name from `src/components/dashboard/recruiter/RecruiterMessagesMenu.tsx`, which also handles recruiter inbox/replies. Recruiter messages use the recruiter ID from the authenticated session; the browser never chooses or submits that identity. The recruiter-only `/api/recruiter/candidates?q=...` endpoint searches seeker names and returns only seeker IDs and display names, never email, resume, or profile details. The authenticated Next.js proxies are `/api/seeker/messages`, `/api/seeker/messages/[conversationId]`, `/api/recruiter/messages`, and `/api/recruiter/messages/[conversationId]`. Conversation previews must include `id`, `candidateId`, `recruiterId`, `jobId`, `participantName`, `jobTitle`, `unreadCount`, and `lastMessage`; legacy conversations without a job use `jobId: "direct"`. The separate backend must provide shared-secret-protected seeker and recruiter inbox, thread, send, and mark-read routes. The backend validates conversation membership; direct recruiter messages require the recipient account to have the seeker role. Job-related applicant messages additionally verify recruiter job ownership and the application. Applications and direct messages use separate conversation keys. Messages and notifications must come from backend records; never fabricate them.
- Keep the recruiter conversation-list response shape aligned across backend, proxy, and UI: `GET /recruiter/messages` returns `{ conversations: [...] }`, and every conversation preview includes a string `jobId` (use `"direct"` for legacy/direct threads without a job). The UI validates this field, so omitting it causes the whole inbox load to fail even when messages were successfully sent.
- Keep the shared API secret server-only. If notification data is missing or malformed, surface the API error instead of silently treating it as an empty list. Preserve the notification response contract consistently between the backend route, Next.js proxy, and seeker menu.
- Backend acceptance is authoritative. Local application/profile writes are best-effort mirrors after backend success; do not report a failed application if only the local mirror fails. Do not return resume bytes from seeker list/profile APIs.
