# Identity Permission Audit — Part G

Status: PASS · Generated: 2026-05-30

## Role model (authoritative)

`app_role` enum: `super_admin`, `admin`, `provider`, `user`.
Storage: `public.user_roles` (separate table — never `profiles`).
Check function: `public.has_role(uuid, app_role)` SECURITY DEFINER.

## Route permission map

Source: `src/modules/workspace/permissions/routePermissions.ts`
(`WORKSPACE_ROUTE_PERMISSIONS`). Guards: `ProtectedRoute` (role) +
`PermissionRouteGuard` (workspace permission).

| Surface | Individual | Provider | Staff | Manager | Admin | SuperAdmin |
|---|---|---|---|---|---|---|
| `/dashboard` (overview) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Provider business pages | — | ✓ | scoped | ✓ | ✓ | ✓ |
| `/admin/**` | — | — | — | — | ✓ | ✓ |
| Super-admin tools | — | — | — | — | — | ✓ |
| Quick-create menu | filtered | filtered | filtered | filtered | full | full |
| Command palette | filtered by `useHasPermission` | | | | | |

## Cross-checks performed

- Sidebar items vs route guards: `src/test/adminSidebarLinks.test.ts`
  guards admin-only links.
- Workspace permissions parity: `useWorkspaceState` ↔ DB roles via
  `usePermissionParity`.
- No client-side admin checks against `localStorage` (forbidden by
  Core security rule). Audited — none found.

## Findings

| ID | Severity | Finding | Action |
|---|---|---|---|
| G-1 | info | `/dashboard/no-access` exists and is reachable from denied permission routes | ok |
| G-2 | info | Forbidden page captures structured context for support | ok |
| G-3 | low | A handful of admin-only quick actions surface in command palette before role resolves; brief flicker only | tracked in backlog |

No privilege-escalation paths discovered.