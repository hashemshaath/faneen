# Auth Simplification — Context Model Audit

Phase: `AUTH SIMPLIFICATION UX — ONE ACCOUNT + POST-LOGIN CONTEXT SELECTION`
Generated: 2026-06-15
Status: UI-only inventory; no DB / RLS / RPC / edge / migration touched.

## 1. User account flow

- Canonical entry: `/auth` (sign-in / register / forgot all routed here).
- Register is now a **single screen** (`RegisterForm.tsx`). No
  account-type picker, no 4-card intent surface. Every sign-up creates a
  personal account (`account_type = 'individual'`).
- Post email verification → `/auth/verified` → role-based redirect via
  `useRoleRedirect`. Users whose `profile.is_onboarded === false` land on
  `/onboarding`; verified individuals can reach `/start` to pick context
  without committing to any business creation.

## 2. Individual context

- Stored on `profiles` (`account_type`, `full_name`, `is_onboarded`).
- Owns: `quote_requests`, `lead_requests`, `projects`, favorites,
  bookmarks, notifications, loyalty.
- Dashboard surfaces: `DashboardOverview` → `UserDashboardView`.
- No business linkage required.

## 3. Business context

- A business = row in `businesses` (owner = `auth.users.id`).
- Membership: owner + `business_staff` rows (active / pending / inactive).
- Dashboard surfaces switch via `ActiveBusinessSwitcher` in
  `DashboardLayout` header.
- Provider-only dashboards (services, leads, RFQ inbox, work orders,
  contracts) read from the currently-active business via
  `useActiveBusiness`.

## 4. Membership / role model

- Role table: `user_roles` (`app_role` enum) — checked via the
  `has_role(_user_id, _role)` SECURITY DEFINER function.
- Business role:
  - **Owner** — row in `businesses.owner_id`.
  - **Staff** — `business_staff` (role + permissions JSON via
    `business_staff_permissions`).
- Workspace permissions resolved in `useHasPermission` /
  `WORKSPACE_ROUTE_PERMISSIONS` and guarded by `PermissionRouteGuard`.

## 5. Invite flow

- Entry points kept intact:
  - `/invite/:token` (`client_invitations` → customer link).
  - `/staff-invite/:token` (`business_staff_invitations` → staff seat).
- Unauthenticated visit → `sessionStorage` stash (`qitaat_pending_invite_token`)
  and bounce through `/auth`. After login the redirect logic in
  `Auth.tsx` consumes the pending token and resumes on the invite page.
- Acceptance is explicit (button click), never automatic.

## 6. Request access flow

- UI-only entry from `/start` → "Join a business" card → `/dashboard/team-access`.
- The legacy `request-access` intent has been removed from the
  registration surface.
- **Not built end-to-end yet**: the `entity_access_requests` write path
  exists in `createEntityAccessRequest` (used by `/onboarding` only).
  `/start` deliberately does not write to that table; it routes the
  user to the dashboard surface where the existing onboarding wizard
  can be opened. No DB writes added in this phase.

## 7. Provider lead vs business duplication risk

- `provider_leads` = enrichment / pre-registered prospects, never owned
  by an `auth.users` row.
- `businesses` = active registered businesses linked to an owner user.
- **Risk**: a sales-imported `provider_leads` row may correspond to a
  later self-registered `businesses` row with no automatic link. This is
  currently reconciled manually via the admin "Provider Growth" surface.
- Recommendation (future DB phase, NOT this phase): add nullable
  `provider_leads.linked_business_id` + a soft-merge RPC. Out of scope here.

## 8. What can be improved UI-only (this phase)

- ✅ Single-screen registration (no intent picker, no business fields).
- ✅ `/start` post-login context selection (Individual / Create / Join).
- ✅ Context switcher retained at `ActiveBusinessSwitcher` + "Personal
  account" pill in `DashboardLayout` header.
- ✅ Forgot-password remains non-enumerating.
- ✅ Invite links unchanged.
- ✅ No `/login` or `/register` standalone routes (AUTH-14B guard
  preserved); `/auth` is canonical.

## 9. What needs DB / RPC follow-up (NOT done in this phase)

- Soft-link `provider_leads` → `businesses` after a self-signup.
- First-class `business_members` view that unions `businesses.owner_id`
  + `business_staff` for cleaner switcher queries.
- Functional `request-access` flow end-to-end (audit + admin queue is
  partially present in `AdminEntityAccessRequests`; UI submission from
  `/start` is intentionally deferred).
- Optional: surface "individual" as a first-class entry in
  `ActiveBusinessSwitcher` (currently surfaced as the always-present
  "Personal account" pill next to the switcher).

## 10. Files touched this phase

- `src/components/auth/RegisterForm.tsx` — rewritten (single screen).
- `src/pages/Start.tsx` — new.
- `src/App.tsx` — `/start` route added.
- `docs/auth-simplification-context-model-audit.md` — new (this file).
- `src/__tests__/authSimplificationOneAccountContextSelection.test.tsx` — new guard.

NOT touched: `Auth.tsx`, `IdentitySignInForm.tsx`, `ForgotPasswordForm.tsx`,
`ResetPassword.tsx`, `Onboarding.tsx`, `DashboardOverview.tsx`,
`ActiveBusinessSwitcher.tsx`, any service / RPC / edge / migration.
