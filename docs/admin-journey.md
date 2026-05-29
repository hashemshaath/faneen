# Admin Journey — Qitaat v1.0

Admin access is granted via the `has_admin_access(auth.uid())` SECURITY
DEFINER function backed by the `user_roles` table. The role is never
stored on `profiles`. All admin surfaces are no-indexed.

## Surfaces

1. **Identity Center** (`/admin/identity`) — Users, profiles, role
   assignments, multi-business linking via Ref ID, suspicious-session
   audit, cross-provider uniqueness enforcement.
2. **Businesses** (`/admin/businesses`) — All businesses including
   drafts, approve/publish workflow, demo flag, RBAC overrides.
3. **Providers** (`/admin/providers`) — Membership tiers, monthly
   credit grants, manual adjustments (logged in
   `provider_lead_credit_transactions`).
4. **Diagnostics** (`/admin/diagnostics`) — Edge function health, email
   delivery, security memory, search index status.
5. **Operations Center** (`/dashboard/operations`) — Executive KPIs
   (revenue pipeline, cycle times, customer NPS, warranty status),
   data-integrity diagnostics (read-only), alerts feed.
6. **Audit Surfaces** — Activity timeline (semantic colors, JSON
   translations), badge attribution, access logs, AI center config.

## Boundaries

- Admin never edits customer-portal tokens directly.
- Admin never bypasses VAT logic or contract locks.
- Direct calls to `provider_lead_credit_transactions` or
  `admin_adjust_provider_credits` are forbidden — must go through
  `@/modules/credits` (enforced by `credits-isolation-audit`).

## v1.0 deferred admin work

- Customer-account moderation (no customer accounts yet).
- Warranty-claims triage queue.
- Supplier-portal admin views.