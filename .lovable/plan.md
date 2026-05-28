# ORG-RBAC-STRUCTURE-2 — Staged Execution Plan

The spec covers 9 phases (A–I) spanning new DB tables, fine-grained permissions, governance UI, staff management center, approval system, accountability, and location governance. Doing all of this in a single loop would violate the "additive only / no breaking changes / operational stability" safety rules at the top of the brief — and would be impossible to validate carefully in one pass.

This plan stages the work so each step is independently shippable, fully tested, and reversible. We start with **pure additive UI-layer code** (no DB, no RLS, no enforcement), exactly as ORG-RBAC-STRUCTURE-1 did. DB-touching phases are sequenced last and gated on explicit approval per phase.

## Execution order

### Step 1 — Phase B: Capability Matrix (this loop)
**Pure additive, UI-layer only. No DB. No enforcement.**

- Create `src/modules/workspace/permissions/capabilityMatrix.ts`:
  - Extend `WORKSPACE_PERMISSIONS` with capability-level keys: `contracts.approve`, `work_orders.assign`, `work_orders.close`, `staff.invite`, `staff.suspend`, `billing.view`, `billing.manage`, `reports.export`, `admin.notes.manage`.
  - Add `CAPABILITY_GROUPS` (contracts / work_orders / bookings / staff / billing / reports / admin) for governance UX grouping.
  - Add `EXPLICIT_DENY` support: a `denies: string[]` field on workspace memberships is honored even if a role default would grant.
  - Add `hasCapability(workspace, capability)` — wraps `hasWorkspacePermission` with deny-list precedence; returns `false` on unknown capabilities (safe fallback).
- Extend `ROLE_PERMISSION_DEFAULTS` additively — owner/entity_admin get all new capabilities; other roles get sensible read defaults only.
- Re-export from `src/modules/workspace/permissions/index.ts`.
- Tests: `src/__tests__/orgRbacStructure2.capabilityMatrix.test.ts`
  - matrix integrity (no orphan capabilities, no duplicates)
  - owner short-circuit
  - explicit grant beats role default
  - explicit deny beats role default and explicit grant
  - unknown capability → false
  - role defaults snapshot (catch accidental widening)

### Step 2 — Phase C: Page Governance Primitives (this loop)
**UI primitives only. Opt-in. No page is hard-blocked.**

- Create `src/components/workspace/WorkspaceCapabilityGate.tsx` — wraps `PermissionGate` but uses `hasCapability` and supports `mode="hide" | "readOnly"`.
- Create `src/components/workspace/ReadOnlyWorkspaceNotice.tsx` — bilingual inline banner ("You have read-only access to this section").
- Create `src/components/workspace/RestrictedWorkspaceCard.tsx` — full-card empty state for `mode="hide"` denials with clear bilingual copy.
- All three are additive primitives — **not** wired into any existing page in this loop. Pages adopt them in Step 3.
- Tests: `src/__tests__/orgRbacStructure2.governancePrimitives.test.tsx`
  - gate renders children when allowed
  - hide mode renders fallback / null
  - readOnly mode renders notice
  - bilingual rendering (ar/en)
  - no raw UUID / no auth coupling

### Step 3 — Phase H (subset): Sticky Governance Indicators (this loop)
**Header-level UX only.**

- Create `src/components/workspace/WorkspaceScopeBadge.tsx` — small badge showing active role + scope (entity / location / "all locations") next to existing `ActiveBusinessSwitcher` / `ActiveLocationSwitcher`.
- Create `src/components/workspace/ActingAsBanner.tsx` — bilingual banner; renders only when a `delegated_workspace_access` placeholder context is active (no-op in this loop, since the table doesn't exist yet).
- Tests: smoke + bilingual.

### Step 4 — Phase A DB layer (DEFERRED, needs approval)
Migrations for `business_teams`, `business_team_members`, `delegated_workspace_access`, `staff_activity_sessions`, each with explicit GRANTs and RLS scoped to `has_entity_membership`. I will surface the migration SQL for review before running it.

### Step 5 — Phase D: Staff Management Center (DEFERRED, depends on Step 4)
`/dashboard/settings/staff` invite / assign / suspend / delegated-access UI. Depends on tables from Step 4 and capabilities from Step 1.

### Step 6 — Phases E / F / G (DEFERRED, scoped per phase)
Approval state model, audit actor context, location-scoped reads. Each will be its own ORG-RBAC sub-phase with its own plan.

## Why staging

- Steps 1–3 are 100% additive client code — zero risk to RLS, auth, payments, or running pages. They can ship today and unblock the rest.
- Steps 4–6 each touch the DB or wire new pages, and each deserves its own focused review + migration approval. Bundling them invites silent regressions.
- This mirrors how ORG-RBAC-STRUCTURE-1 shipped (UI permission map first, RLS folding deferred).

## Validation for this loop (Steps 1–3)

- `tsc`
- focused tests: `businessOpsMetrics4`-style targeted runs for the 2 new test files
- full `vitest`
- `broken-links-audit`
- `operations-isolation-audit`, `businesses-reads-isolation-audit`, `identity-isolation-audit`

## Out of scope for this loop

- Any DB migration
- Any RLS change
- Any auth / payment / membership change
- Wiring capability gates into existing pages (Step 5)
- Notifications, cron, realtime — explicitly forbidden by the brief

## Deliverable on approval

Steps 1, 2, 3 implemented and validated in this loop. Steps 4–6 require explicit user "go" per phase (because they touch the DB and create new admin surfaces).
