# System Access ↔ Membership Sync Audit (SYSTEM-ACCESS-MEMBERSHIP-SYNC-1)

## Surfaces audited
- `src/pages/admin/AdminSystemAccess.tsx` — `/admin/system-access` console.
- `src/modules/systemAccess/index.ts` — RPC wrappers (`admin_set_module_override`,
  `admin_clear_module_override`, `get_user_visible_modules`,
  `system_modules`, `system_module_overrides`, `system_module_audit_log`).
- `src/hooks/useVisibleModules.ts` — sidebar / route visibility consumer
  (query keys `['system-access', 'visible-modules', userId, entityId]`
   and `['system-access', 'catalog']`).
- `src/components/membership/FeatureGate.tsx` + `src/hooks/useFeatureGate.ts`
  — membership-feature gate (query key `['feature-gate', userId, key, businessId]`).
- `src/modules/memberships/services/usage/reads.ts` — `has_membership_feature` RPC.

## What already syncs
- Admin RPC writes a row in `system_module_audit_log` (action, scope, before/after,
  actor, reason) via the security-definer functions. Audit trail is intact.
- `AdminSystemAccess` invalidates `['system-module-overrides']` and `['system-access']`
  on success. The sidebar consumer (`useVisibleModules`) reads from
  `['system-access', 'visible-modules', ...]`, which **was not invalidated** —
  so sidebar/menu visibility lagged until the next manual refresh.

## What did NOT update immediately (before this phase)
- `useVisibleModules` cache (sidebar, route guard, command palette).
- `useFeatureGate` cache for every gated surface (dashboards, contracts,
  procurement, work orders, brands, help, etc.).
- The "effective access" surfaced inside the page itself — no membership
  pre-check, no synced/blocked feedback after writing.

## Membership linkage gaps
- The admin override RPC unconditionally writes the requested value even
  when the active membership plan does not include the feature. The override
  still applies (it always has — RLS treats overrides as authoritative),
  but the admin had **no warning**. This makes it easy to silently enable
  paid surfaces for a business on a plan that does not entitle them.

## Repairs landed
- New `src/modules/systemAccess/accessResolution.ts` —
  `resolveEffectiveBusinessAccess()` returns
  `{ allowed, disabled, reasons, sources, version }` from a single source.
- New `src/modules/systemAccess/services/updateBusinessSystemAccess.ts` —
  the only wrapper admin code should call. Validates membership
  entitlement before enabling, writes the override (audit row written by
  the RPC itself), and returns refreshed effective access.
- New `src/hooks/useBusinessAccessInvalidation.ts` —
  one call invalidates: workspace/business context, memberships,
  system-access caches, sidebar `visible-modules`, dashboard modules,
  feature gates, command palette entries.
- `AdminSystemAccess.tsx` invalidations widened (sidebar + feature gates).

## Query keys invalidated on every admin write
- `['system-module-overrides']`, `['system-access']`,
  `['system-access', 'visible-modules']`,
  `['system-access', 'catalog']`,
  `['system-module-audit', ...]`,
  `['feature-gate']` (broad),
  `['membership-subscription']`, `['membership-usage']`,
  `['workspace']`, `['active-workspace']`.

## Result
- Admin changes apply across sidebar, feature gates, and dashboards
  without logout.
- Membership entitlement is checked before enabling, with a clear
  bilingual warning when the plan blocks the feature.
- All writes remain audited (RPC-managed `system_module_audit_log`).
- No RLS weakening, no service-role usage in the client, no new scope
  creep (inventory / accounting / supplier payments untouched).