# Resume / Deferred Dedupe Work

Completed in this batch:
- Shared the exact date-only display formatter used by the admin company/user list views and payment summary cards into `src/lib/date-format.ts`.
- Kept the role-specific billing and admin proxy logic separate because their auth, URL allowlists, response validation, and ownership boundaries are intentionally different.

Remaining high-risk clusters intentionally deferred until explicit approval:
- Billing URL allowlist separation (`safeStripeUrl` vs. route-level checkout/billing restrictions).
- Admin proxy wrappers and shared error/status handling (`getActiveAdminSession`, service-JWT forwarding, response validation).
- Role-scoped message routes and menu components (seeker vs recruiter contracts and actor ownership).
- Backend model/route consolidation behind the dirty `refactor/mvc` backend branch.

The first low-risk dedupe is complete; the remaining clusters require contract-level validation before any merge.
