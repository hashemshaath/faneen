# ORG-RBAC-STRUCTURE-1 — Organizational Access & Permission Audit

Status: Phase A audit + Phase C central route map + Phase D additive sidebar
integration shipped. Phases B/E/F documented; heavy enforcement deferred
to a dedicated RLS phase (see roadmap at bottom).

## Scope

UI-only architecture normalization. **No** RLS, auth, payment, or membership
rewrites. Server (`has_entity_membership`, `has_permission`, RLS) remains the
only authoritative authorization boundary.

---

## Phase A — Role Matrix (current state)

| Role                | Entity scope | Location scope          | Sidebar visibility (current) | Allowed actions (current)                          | Current issues                                                  |
|---------------------|--------------|-------------------------|------------------------------|----------------------------------------------------|-----------------------------------------------------------------|
| Owner               | full         | all locations           | full provider sidebar        | everything (RLS owner-of)                          | none                                                            |
| `entity_admin`      | full         | all                     | full provider sidebar        | full (catalog defaults)                            | UI did not distinguish from owner                                |
| `business_manager`  | full         | all                     | full provider sidebar        | most (no `entity.manage`, no `staff.manage`)       | billing pages visible without `payments.view`                    |
| `site_manager`      | scoped       | assigned locations only | full provider sidebar        | leads/quotes/bookings (location)                   | sidebar leaked entity-wide pages; location scoping not enforced  |
| `operations_manager`| full         | all                     | full provider sidebar        | leads/quotes/contracts/bookings                    | billing & settings visible by default                            |
| `contracts_manager` | full         | all                     | full provider sidebar        | contracts manage + docs                            | leads/quotes hidden in catalog but visible in sidebar            |
| `finance`           | full         | n/a                     | full provider sidebar        | memberships/payments                               | unrelated operational pages visible                              |
| `sales`             | full         | n/a                     | full provider sidebar        | leads/quotes/services view                         | contracts & bookings visible                                     |
| `staff`             | scoped       | scoped (read-only)      | full provider sidebar        | view-only across most pages                        | management pages visible (gated only at action level)            |
| `viewer`            | scoped       | n/a                     | full provider sidebar        | entity.view only                                   | every page visible; relied on inline gates only                  |
| Platform Admin      | cross        | cross                   | admin sidebar                | admin tools                                        | none                                                             |
| Super Admin         | cross        | cross                   | admin sidebar + super-only   | governance                                         | none                                                             |

## Phase A — Route Visibility (workspace routes)

Required permission column reflects the **new** canonical map
(`src/modules/workspace/permissions/routePermissions.ts`).
Owner short-circuits and admin overrides apply to every row.

| Route                                | Required perm(s)                      | Scope    | Owner | Manager | Sales | Staff | Viewer | Admin |
|--------------------------------------|---------------------------------------|----------|:-----:|:-------:|:-----:|:-----:|:------:|:-----:|
| /dashboard                           | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/analytics                 | entity.view                           | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/work-orders/overview      | bookings.view                         | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/operations/feed           | bookings.view                         | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/business-edit             | entity.manage                         | entity   |  ✓    |   ·     |  ·    |  ·    |   ·    |   ✓   |
| /dashboard/services                  | services.view                         | entity   |  ✓    |   ✓     |  ✓    |  ·    |   ·    |   ✓   |
| /dashboard/portfolio                 | entity.view                           | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/projects                  | entity.view                           | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/promotions                | services.manage                       | entity   |  ✓    |   ✓     |  ·    |  ·    |   ·    |   ✓   |
| /dashboard/provider/service-areas    | locations.view                        | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/private-sectors           | entity.view                           | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/reviews                   | entity.view                           | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/badge                     | entity.manage                         | entity   |  ✓    |   ·     |  ·    |  ·    |   ·    |   ✓   |
| /dashboard/leads                     | leads.view                            | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ·    |   ✓   |
| /dashboard/provider/leads            | quotes.view                           | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ·    |   ✓   |
| /dashboard/bookings                  | bookings.view                         | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/clients                   | leads.view                            | entity   |  ✓    |   ✓     |  ✓    |  ✓    |   ·    |   ✓   |
| /dashboard/work-orders               | bookings.view                         | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/contracts                 | contracts.view                        | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/contract-analytics        | contracts.view                        | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /dashboard/warranties                | contracts.view                        | entity   |  ✓    |   ✓     |  ·    |  ✓    |   ·    |   ✓   |
| /membership                          | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/provider/membership       | memberships.view OR payments.view     | entity   |  ✓    |   ✓     |  ·    |  ·    |   ·    |   ✓   |
| /dashboard/installments              | payments.view                         | entity   |  ✓    |   ✓     |  ·    |  ·    |   ·    |   ✓   |
| /dashboard/messages                  | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/notifications             | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/profile                   | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/communication-preferences | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/settings                  | settings.view                         | entity   |  ✓    |   ✓     |  ·    |  ·    |   ·    |   ✓   |
| /dashboard/my-requests               | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |
| /dashboard/bookmarks                 | —                                     | personal |  ✓    |   ✓     |  ✓    |  ✓    |   ✓    |   ✓   |

Legend: ✓ visible, · hidden. Manager = `business_manager`. "Admin" = platform.

---

## Phase B — Target Access Model

Roles map onto the existing `WORKSPACE_ROLES` catalog:

- **Entity Owner** → `owner` (DB-derived). Full access; cannot bypass platform admin.
- **Account Manager** → `business_manager` / `entity_admin`.
- **Branch / Site Manager** → `site_manager` (scoped to `location_staff_assignments`).
- **Operations Staff** → `operations_manager`, `staff`.
- **Viewer / Auditor** → `viewer`.
- **Platform Admin / Super Admin** → `user_roles` (`admin`, `super_admin`).

No new role keys introduced. Permission semantics live in
`permissions_catalog` + `role_permissions` (DB) and mirrored in
`src/modules/workspace/permissions/catalog.ts`.

---

## Phase C — Central Route Permission System

Implemented in `src/modules/workspace/permissions/routePermissions.ts`:

- `WORKSPACE_ROUTE_PERMISSIONS` — single source of truth (see Phase A table).
- `canViewWorkspaceRoute(route, { workspace, isAdmin })` — owner/admin short-circuit, explicit override → catalog fallback → safe deny when mapped, **safe allow** when unmapped (additive migration).
- `getWorkspaceRouteDescriptor`, `listWorkspaceRouteKeys` for tests/audits.

---

## Phase D — Sidebar Visibility (additive)

`DashboardSidebar` now consults `canViewWorkspaceRoute` for every workspace
menu item. Admin sidebar (`adminBaseGroups`) is unchanged — admins still
receive the admin override automatically. No routes were removed; no direct
navigation was hard-blocked; only sidebar entries are hidden when the active
role lacks the permission.

No duplicated visibility logic remains in `DashboardSidebar`; all rules live
in `routePermissions.ts`.

---

## Phase E — Location / Branch Scoping (readiness)

| Module        | Reads `active_location_id` today? | Notes                                                                              |
|---------------|:--------------------------------:|------------------------------------------------------------------------------------|
| Work Orders   | ◐ partial                        | Overview & feed use entity scope; per-location filtering not yet wired.            |
| Bookings      | ◐ partial                        | Some queries respect location; many fall back to entity.                            |
| Leads         | ✗                                | Entity-scoped only. Site managers see all entity leads.                             |
| Contracts     | ✗                                | Entity-scoped only.                                                                 |
| Tasks         | n/a                              | No dedicated tasks module yet.                                                      |

**Cross-location leakage risk inside same entity:** Leads, Contracts.
Mitigation deferred — the routePermissions map already tags these routes as
`scope: 'entity'` so a future location filter can be added without changing
visibility rules.

No heavy filtering implemented in this phase.

---

## Phase F — Safe UI Enforcement

`<PermissionHint>` and `useCan` continue to gate buttons/forms. The new
route map gives future contributors a single place to mirror that gating
at the page level. Existing inline gates were **not** removed.

---

## Security / RLS notes

- This phase changes **no** RLS policies, **no** RPCs, **no** edge functions.
- Sidebar visibility is advisory only.
- A user who pastes a URL directly still hits the existing route guards
  (`ProtectedRoute` + RLS). Hiding a sidebar entry never grants or removes
  data access.

---

## Deferred RLS-enforcement roadmap

Sequenced so each step is observable before the next:

1. **Parity logging** — wire `useHasPermission` (server `has_permission`) in
   shadow mode next to every `useCan` call already deployed, log
   divergences for ≥ 1 release.
2. **Page-level guards** — promote `routePermissions` into a
   `<RouteGuard permission="…">` wrapper for the manage-level entity routes
   (`/dashboard/business-edit`, `/dashboard/badge`, `/dashboard/promotions`,
   `/dashboard/installments`, `/dashboard/provider/membership`,
   `/dashboard/settings`). UI 403 only — no data-shape change.
3. **Location scoping** — add `location_id` predicates to Leads & Contracts
   queries for `site_manager`, gated by `active_location_id`. Add RLS
   policies that mirror.
4. **Server enforcement** — once parity is clean, fold `has_permission`
   checks into the relevant RLS policies (`leads`, `quotes`, `contracts`,
   `bookings`, `work_orders`). Owner-of and admin policies stay as the
   broad fallback.
5. **Audit** — extend `operations-isolation-audit` and a new
   `workspace-rbac-audit` to fail CI when a new dashboard route is added
   without a `routePermissions` entry.