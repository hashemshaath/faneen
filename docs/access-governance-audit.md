# Access Governance Audit (ACCESS-GOVERNANCE-FINAL-1)

## Scope
Make `resolveEffectiveBusinessAccess()` the single source of truth for
**module-level effective access** (what systems a business can use, given
admin overrides + membership entitlement + business status). This is
distinct from — and does NOT replace — the existing canonical layers for
other access concerns. See "Layered model" below.

## Layered access model (canonical)

| Concern                                | Canonical engine                                                | Notes |
|----------------------------------------|------------------------------------------------------------------|-------|
| Module / system effective access       | `resolveEffectiveBusinessAccess()` (new)                         | Composed via `useEffectiveBusinessAccess` |
| Membership feature entitlement (single)| `useFeatureGate` → `hasMembershipFeature` RPC                    | The ONLY consumer of `hasMembershipFeature` |
| UI presence of a module/route          | `useVisibleModules` → `get_user_visible_modules` RPC             | Sidebar / route hide |
| Workspace permission / role            | `useCan` + `WorkspaceCapabilityGate`                             | RBAC, not feature |
| Auth / admin gate                      | `ProtectedRoute` + `PermissionRouteGuard`                        | Hard route gate |
| RLS / server authorization             | `has_membership_feature`, `has_role`, RLS policies               | Always authoritative |

These layers compose. They are not duplicates — they answer different
questions (Is the plan paid for? vs. Has the admin hidden it? vs. Does the
user's role allow it?). The resolver folds the first three into a single
answer for module-level UI.

## Inventory of access consumers

### Membership entitlement (`hasMembershipFeature`)
- `src/hooks/useFeatureGate.ts` — **only** runtime consumer.
- `src/components/membership/FeatureGate.tsx` and `RequireFeature` — JSX
  wrappers around `useFeatureGate`.
- `src/modules/systemAccess/services/updateBusinessSystemAccess.ts` —
  admin pre-check before writing an override.
- Tests (no production duplication detected).

### Module visibility (`get_user_visible_modules`)
- `src/hooks/useVisibleModules.ts` — sidebar / route hide.
- `src/pages/admin/AdminSystemAccess.tsx` — admin console.

### Workspace RBAC (`useCan`, `hasEffectivePermission`)
- `src/hooks/useCan.ts`, `WorkspaceCapabilityGate`, `PermissionRouteGuard`
  — permission catalog (`ROLE_PERMISSION_DEFAULTS`, delegated access,
  team memberships).

### Auth / admin role
- `src/contexts/AuthContext.tsx` (`isAdmin`) + `ProtectedRoute requireAdmin`.

## Duplicate logic detection

| Item                                                | Severity | Status / action |
|-----------------------------------------------------|----------|-----------------|
| Direct `hasMembershipFeature` calls outside `useFeatureGate` | high | None found in production code |
| Pages re-implementing "is this plan allowed?" logic | high     | None found |
| Pages re-implementing "is module visible?" logic    | medium   | None found — `useVisibleModules` is the sole reader |
| Mixing role-checks with feature-checks ad-hoc       | medium   | Resolver now exposes both via one entry (`useEffectiveBusinessAccess`) — no rewrites required |
| Stale invalidation on system-access changes         | high     | Fixed in SYSTEM-ACCESS-MEMBERSHIP-SYNC-1 (`useBusinessAccessInvalidation`) |
| Custom membership labels duplicated per surface     | low      | `ACCESS_LABELS` in `accessResolution.ts` now provides the canonical bilingual strings |

No critical-severity duplications were found. The membership feature gate
layer was already correctly centralized via `useFeatureGate`. The
highest-leverage improvement was widening invalidation, which shipped in
the previous phase.

## Safe repairs applied here
- New hook `src/hooks/useEffectiveBusinessAccess.ts` — composes the
  resolver with live module catalog + per-user visibility + (optional)
  per-feature membership map. Returns `{ access, isEnabled(key),
  reasonFor(key), isLoading }`. Future call sites that want "is this
  module effectively on for this business?" must use this hook instead of
  re-querying the underlying tables.
- Canonical bilingual reason strings exported from `ACCESS_LABELS`
  (active / membership_block / admin_disabled / business_suspended /
  synced). Surfaces showing a disabled reason should pull from here.

## Not in scope (intentionally not changed)
- RLS policies, membership plans, role catalog, permission catalog.
- `useCan` / `WorkspaceCapabilityGate` / `PermissionRouteGuard` — these
  govern role/permission, not module entitlement, and remain canonical
  for their layer.
- Server-side `has_membership_feature`, `has_role`, and
  `get_user_visible_modules` — these are the authoritative RPCs; the
  resolver merely composes their answers for UI.

## Expected outcome
- One canonical access engine for module-level effective access
  (`resolveEffectiveBusinessAccess` + `useEffectiveBusinessAccess`).
- Membership feature gate consolidated through `useFeatureGate` (already
  the only consumer of `hasMembershipFeature`).
- Consistent bilingual disabled-state messaging via `ACCESS_LABELS`.
- Zero new duplication; no permission / RLS / membership-plan changes.