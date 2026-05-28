# Organization RBAC structure

_Last updated: ORG-RBAC-STRUCTURE-7._

This document is the single source of truth for the **organization /
entity / staff hierarchy** that drives Lovable Cloud (qitaat.com).
Authoritative authorization is enforced server-side via RLS plus the
`has_entity_membership` and `has_permission` SQL functions. The UI
helpers documented here exist only for admin diagnostics and visibility.

## Role catalog (entity scope)

Ten canonical roles, ranked by privilege:

| Rank | Role                 | Notes                                            |
| ---: | -------------------- | ------------------------------------------------ |
|    1 | `owner`              | Full access. UI short-circuits all permissions.  |
|    2 | `entity_admin`       | All permissions; assigned by owner.              |
|    3 | `business_manager`   | Day-to-day operations.                           |
|    4 | `site_manager`       | Scoped to a site/branch.                         |
|    5 | `operations_manager` | Leads / contracts / bookings.                    |
|    6 | `contracts_manager`  | Contract lifecycle.                              |
|    7 | `finance`            | Memberships + payments.                          |
|    8 | `sales`              | Leads + quotes.                                  |
|    9 | `staff`              | Read-only operational access.                    |
|   10 | `viewer`             | Minimal read-only entity access.                 |

Mirrored in `src/modules/workspace/permissions/catalog.ts` and validated
against `roles_catalog` / `role_permissions` by
`workspaceRbac6a.catalog.test.ts`.

## Membership invariants

Enforced server-side via RLS + the Phase-2 normalization migration.
Mirrored in `src/modules/workspace/governance/orgStructure.ts` for
admin diagnostics:

1. **I1 — Every business has an owner.** `businesses.user_id` not null.
2. **I2 — Owner is in staff.** Each owner has an `is_active = true`
   `business_staff` row with `role = 'owner'`.
3. **I3 — Owner is primary manager.** That row carries
   `is_primary_manager = true` (backfilled by CRITICAL-ENTITY-IDENTITY-
   ACCESS-FIX-1 phase 2).
4. **I4 — Single primary manager per entity.** At most one active
   `is_primary_manager = true` row.
5. **I5 — Inactive staff grants nothing.** Inactive rows MUST NOT carry
   `is_primary_manager = true`, and never count toward
   `has_entity_membership`.

`computeEffectiveBusinessIds` filters `is_active = true` to match
`has_entity_membership` semantics in the UI.

## Location assignments

`location_staff_assignments` further scopes a staff member to specific
locations. Out of scope for Phase 7 — the role hierarchy and primary-
manager invariants apply at the entity level.

## Admin diagnostics

Read-only, admin-gated:

- `getAdminIdentityIntegrityReport` — email mismatches, orphan profiles.
- `getAdminCompanyAccessDiagnostic(businessId)` — owner + staff snapshot
  + warnings for I1–I4.
- `getAdminUserAccessSummary(userId)` — owned + active staff bids +
  workspace accessibility warnings.

## Workspace self-heal

`useWorkspaceStateSelfHeal` clears any stale `active_entity_id` from the
UI store when it is not in the user's accessible list. Authority is
still RLS — self-heal only prevents broken UI state.

## Deferred items (require explicit approval)

- Identity reconciliation Phase 2 (auth.users email reconciliation,
  duplicate-account merge, synthetic test-account cleanup).
- RLS migration tightening primary-manager uniqueness as a constraint.
- Migrating remaining direct `supabase.from('business_staff')` callsites
  in pages to canonical wrappers.