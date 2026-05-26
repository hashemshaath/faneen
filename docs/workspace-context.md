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