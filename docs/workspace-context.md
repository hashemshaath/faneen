# Workspace Context — WORKSPACE-CONTEXT-1 (Step 1)

## Goal
Foundation for users who belong to multiple entities (owned business + staff
memberships across other businesses). Minimal, safe, non-breaking.

## Current behavior (audit)
- `useActiveBusiness` (per-user localStorage key `qitaat_active_business_<uid>`)
  persists the selected business, self-heals when the stored id is no longer
  accessible, and broadcasts changes via the `qitaat:active-business-changed`
  CustomEvent + cross-tab `storage` event.
- `ActiveBusinessSwitcher` merges `listOwnerBusinesses` + `listActiveStaffBusinessesForUser`
  and renders a dropdown labeled Owner / Staff.
- Dashboard pages call `useActiveBusiness` directly; queries are RLS-scoped.
- Server-side membership is gated by `public.has_entity_membership` and
  `public.has_location_access` (wrappers in `src/modules/entities/services/access/`).

## What Step 1 adds
- New read-only hook `useActiveWorkspace` (`src/hooks/useActiveWorkspace.ts`)
  that aggregates the existing wrappers into the canonical shape:
  - `active_entity_id`
  - `active_location_id` (always `null` — deferred to Step 2)
  - `active_membership_id`
  - `active_role` (`'owner' | business_staff_role`)
  - `permissions: string[]` (deferred — RLS authoritative)
  - `entities: WorkspaceEntity[]`
  - `setActiveEntityId(id)`
- Reuses `useActiveBusiness` so the existing switcher, dashboards and persisted
  preference continue to work unchanged.
- Tests cover: owner-only, staff-only, multi-entity switch, localStorage restore,
  inaccessible-entity fallback, no direct table access.

## What is intentionally NOT done in Step 1
- No changes to `ActiveBusinessSwitcher`, dashboards, or RLS.
- No location switching — `business_locations` consumers are not fully wired
  through a single source of truth yet. Deferred to Step 2.
- No client-side permission map — permissions remain enforced by RLS and the
  `has_entity_membership` / `has_location_access` RPCs.

## Security
- localStorage is preference only. Every data path validates membership via
  RLS or the wrappers above. A spoofed `active_entity_id` cannot read or
  mutate data the user is not authorized for.
- Inaccessible entities are filtered server-side because the entity list is
  sourced from `listOwnerBusinesses` (RLS-scoped) and
  `listActiveStaffBusinessesForUser` (`is_active = true` + RLS).

## Next steps
- Step 2: location switching once `business_locations` consumers route through
  a canonical wrapper, plus expansion of `permissions` derived from
  `business_staff.permissions_override` + role defaults.
- Step 3: migrate dashboard pages from `useActiveBusiness` to
  `useActiveWorkspace` incrementally (one module at a time).

---

## WORKSPACE-CONTEXT-2 — Step 2 (locations + permissions hydration)

### Location source of truth
There is no `business_locations` table. After audit, the active location
within an entity maps to `public.business_branches`. Decision:

- **Canonical source: `public.business_branches`** (`business_id` foreign key).
- `public.client_sites` represents *customer* sites for projects/contracts,
  not provider workspace locations — out of scope for the workspace switcher.
- `public.location_staff_assignments` (per-branch staff scoping) is exposed
  via an optional read wrapper but is not yet consumed by the active
  workspace. RLS on it is admin-only today, so staff assignment scoping
  remains server-side.

### New canonical wrappers (`src/modules/locations`)
- `listLocationsForEntity({ entityId, activeOnly? })` — RLS-scoped read of
  `business_branches` filtered by `business_id`, ordered by `is_main desc,
  sort_order asc`.
- `getLocationById({ locationId })` — single-row lookup, returns null when
  the caller cannot see the row.
- `listLocationAssignmentsForUser({ userId, entityId? })` — optional read
  of `location_staff_assignments` joined to `business_staff` for the
  current user. Provided for future per-location permission UI.

No pages access these tables directly via `supabase.from` (audit test
`workspaceContext2.audit.test.ts`).

### useActiveWorkspace additions
New shape (additive — existing fields unchanged):

```
{
  active_location_id: string | null,
  locations: WorkspaceLocationRow[],
  setActiveLocationId: (id: string | null) => void,
  clearActiveLocationId: () => void,
  permissions: string[],  // hydrated, see below
}
```

Behavior:
- `locations` is fetched per active entity via `listLocationsForEntity`
  (React Query, `staleTime: 60s`).
- `active_location_id` is persisted per `(user, entity)` under
  `localStorage` key `qitaat_active_location_<uid>_<entityId>`.
- Switching the active entity rehydrates `active_location_id` from the new
  entity's preference (or null if absent).
- Self-heal: a persisted id that is not in the accessible `locations[]`
  list (revoked branch, spoofed value) is cleared. No automatic fallback
  to "first" — locations remain optional.
- `setActiveLocationId` ignores ids not in the accessible list, blocking
  localStorage / runtime spoofing from setting an inaccessible id.

### Permissions hydration
- Derived from the active membership's `business_staff.permissions_override`
  (jsonb). Accepts both shapes:
  - `Record<string, boolean>` → keys with value `true`.
  - `string[]` → returned as-is.
- For owner memberships there is no staff row; `permissions` is `[]` (the
  owner role grants full access via RLS — this hint is for UI only).
- **Authorization remains server-side.** `permissions` is a UI convenience
  for hiding/showing controls; every mutation and read continues to go
  through RLS / RPC.

### Intentionally NOT done in Step 2
- No `ActiveBusinessSwitcher` UI changes (no location dropdown yet).
- No dashboard migrations off `useActiveBusiness`.
- No RLS changes; no new policies; no route changes; no payment/auth
  changes.

### Deferred next steps
- Location switcher UI (extend `ActiveBusinessSwitcher` with a secondary
  selector).
- Dashboard migration onto `useActiveWorkspace` (per-module).
- Role / permission catalog wiring (define canonical permission keys and
  derive defaults per `business_staff_role`).

---

## WORKSPACE-RBAC-6A — Role / permission catalog foundation

### Canonical roles (entity-scoped)
`owner`, `entity_admin`, `business_manager`, `site_manager`,
`operations_manager`, `contracts_manager`, `finance`, `sales`, `staff`,
`viewer`. Seeded into `public.roles_catalog`.

### Canonical permissions
Grouped keys: `entity.*`, `staff.*`, `locations.*`, `services.*`,
`leads.*`, `quotes.*`, `contracts.*`, `bookings.*`, `documents.*`,
`memberships.*`, `payments.*`, `settings.*`. Seeded into
`public.permissions_catalog`. Defaults per role mapped via
`public.role_permissions` (idempotent `ON CONFLICT DO NOTHING`).

### Service wrappers (`src/modules/workspace/services/permissions`)
- `listRolesCatalog()`
- `listPermissionsCatalog()`
- `listRolePermissions()`
- `getRolePermissions({ role })`

All return raw `{ data, error }` per project convention. Pages must not
call `supabase.from('roles_catalog' | 'permissions_catalog' |
'role_permissions')` directly — enforced by the
`workspaceRbac6a.catalog` audit.

### Frontend helpers
- `hasWorkspacePermission(workspace, permission)` — pure function.
- `useCan(permission)` — hook over `useActiveWorkspace`.

Resolution order:
1. `active_role === 'owner'` → `true`.
2. `permissions[]` (from `business_staff.permissions_override`) contains
   the key → `true`.
3. Static role defaults (`ROLE_PERMISSION_DEFAULTS`, mirrors the DB
   seed) include the key → `true`.
4. Otherwise `false`.

### ⚠️ UI-only — NOT authorization
`useCan` / `hasWorkspacePermission` are advisory hints for showing or
hiding affordances. **Every mutation and read continues to be gated by
RLS / RPC.** No existing dashboard buttons or routes were rewired in
this phase; the audit asserts there are zero `useCan(...)` callers in
`src/pages/**` today.

### Deferred (future phases)
- Server-side `has_permission(_user_id, _entity_id, _permission)` RPC
  backed by `business_staff.role` + `permissions_override` joined to
  `role_permissions`.
- Apply `useCan` to low-risk UI affordances once parity with current
  behavior is verified.
- RLS policy migration to consult `has_permission` instead of
  role-only gates.