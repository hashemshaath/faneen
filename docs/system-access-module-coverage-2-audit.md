# System Access Module Coverage v2 (SYSTEM-ACCESS-MODULE-COVERAGE-2)

Extends `/admin/system-access` to fully control five modules that were
only partially gated before: **Analytics**, **Operations Log**,
**Private Sectors**, **Installments**, **Staff & Teams**.

## Canonical module keys

| Key | Group (category) | AR Label | EN Label | Default | Membership feature |
|---|---|---|---|---|---|
| `analytics` | insights | التحليلات | Analytics | enabled | `analytics` (when plan defines it) |
| `operations_log` | insights | سجل العمليات | Operations Log | enabled | n/a (treated as core observability) |
| `private_sectors` | business | القطاعات الخاصة | Private Sectors | enabled | `private_sectors` (premium plans) |
| `installments` | finance | الأقساط | Installments | enabled | `installments` (paid plans) |
| `staff_management` | workspace | الموظفون والفرق | Staff & Teams | enabled | `staff_seats` (paid plans) |

Legacy keys retained for backwards compatibility:
- `activity_log` (older alias of `operations_log`) — both keys now resolve the same routes.
- `staff` (older alias of `staff_management`) — both keys now resolve the same routes.

## Inventory

### Analytics (`analytics`)
- Routes: `/dashboard/analytics`, `/dashboard/insights`
- Sidebar: Insights group → Analytics
- Quick actions: KPI snapshot
- Command palette: "Open Analytics"
- Feature gate: `feature-gate:analytics`
- Membership: optional (plan-defined)
- Previous gap: admin toggle existed but invalidation missed sidebar cache → fixed in SYSTEM-ACCESS-MEMBERSHIP-SYNC-1; aliases added.

### Operations Log (`operations_log`)
- Routes: `/dashboard/operations`, `/dashboard/operations/feed`, `/dashboard/operations-feed`, `/dashboard/activity`, `/dashboard/audit`
- Sidebar: Operations group → Activity / Audit
- Command palette: "Operations history", "Audit history"
- Feature gate: `feature-gate:operations_log`
- Membership: none (treated as core observability)
- Previous gap: missing canonical registry entry — added in migration `20260601182500_system_access_module_coverage_2`.

### Private Sectors (`private_sectors`)
- Routes: `/dashboard/private-sectors`, `/private-sectors`, `/private-sectors/:slug`
- Sidebar: Specializations group
- Feature gate: `feature-gate:private_sectors`
- Membership: premium plans only
- Previous gap: aliases added previously; admin can toggle via existing UI.

### Installments (`installments`)
- Routes: `/dashboard/installments`, `/dashboard/billing/installments`
- Sidebar: Finance group → Installments / BNPL
- Feature gate: `feature-gate:installments`
- Membership: paid plans only
- Previous gap: aliases added previously.

### Staff & Teams (`staff_management`)
- Routes: `/dashboard/team`, `/dashboard/team-access`, `/dashboard/settings/staff`, `/dashboard/settings/staff-access`, `/dashboard/invitations`
- Sidebar: Workspace group → Staff
- Feature gate: `feature-gate:staff_seats`
- Membership: seat-limited per plan
- Previous gap: missing canonical registry entry — added in this migration; aliases extended.

## What this phase changed

1. **DB registry** — Inserted `operations_log` and `staff_management` rows
   via `INSERT … ON CONFLICT (key) DO UPDATE` so `/admin/system-access`
   surfaces them under their proper category groups automatically (the
   admin UI is data-driven over `listSystemModules()`).
2. **Route aliases** — `useVisibleModules.MODULE_ROUTE_ALIASES` extended
   to map the canonical keys to every route they own (including the
   legacy `/dashboard/operations`, `/dashboard/audit`, `/dashboard/invitations`).
3. **Access resolution** — No structural change needed; the new keys
   flow through `resolveEffectiveBusinessAccess()` via the catalog query.
4. **Membership pre-check** — Already enforced by
   `updateBusinessSystemAccess()`; plan-blocked enable returns the
   bilingual reason from SYSTEM-ACCESS-MEMBERSHIP-SYNC-1.
5. **Invalidation** — `useBusinessAccessInvalidation` already covers
   `['system-access','visible-modules']`, `['feature-gate']`,
   `['membership-subscription']`, etc.
6. **Audit / observability** — Unchanged. Writes are recorded in
   `system_module_audit_log` by the security-definer RPC, plus
   `console.info('[observability] system_access.updated', …)` from
   `updateBusinessSystemAccess`.

## Non-goals

- No RLS changes.
- No membership plan-definition changes.
- No new business domains (inventory / accounting / supplier-payments
  untouched).
- No service-role usage in client.
- No logout/login requirement — invalidation hook handles live sync.

## Verification

- Source test: `src/tests/systemAccessModuleCoverage2.test.ts`
- Earlier related coverage: `systemAccessMembershipSync1.test.ts`,
  `systemAccessModuleAliases.test.ts`, `accessGovernanceFinal1.test.ts`.