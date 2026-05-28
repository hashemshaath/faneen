# APP-SHELL-REARCHITECTURE-1 — Unified Adaptive Workspace Shell

Additive UX architecture phase. Wraps the existing `DashboardLayout` with workspace-aware primitives. **Zero changes** to routes, RLS, auth, payments, membership, realtime, cron, or business logic.

## Guardrails

- `DashboardLayout` stays canonical. New primitives mount **inside** it.
- No `supabase.from(...)` inside any shell primitive. Workspace data comes from existing hooks (`useActiveWorkspace`, `useAuth`, `useVisibilityEngine`).
- No new routes, no renamed routes, no removed sidebar items.
- Existing tests (NAV-LAYOUT-CONSISTENCY-1, ORG-RBAC-STRUCTURE-*) must remain green.
- All localStorage keys prefixed `qitaat_shell_*`.

## 1. Workspace Header System

Create `src/components/workspace/shell/`:
- `WorkspaceHeader.tsx` — business/entity label, active role badge, quick actions slot, breadcrumbs slot, compact mode under `md`. Pure presentation; data via `useActiveWorkspace` + `useAuth`.
- `WorkspaceContextBar.tsx` — sticky bar (`top-14`), collapsible (state in `qitaat_shell_ctxbar_open`), permission-aware via `usePermissionMatrix`.
- `useBreadcrumbs.ts` — derives crumbs from `useLocation` + route descriptors in `WORKSPACE_ROUTE_PERMISSIONS`.

Mount inside `DashboardLayout` behind a feature flag prop `enableWorkspaceShell` (default `true`); flag is local to the layout so we can A/B fall back without route changes.

## 2. Adaptive Sidebar (refactor, non-breaking)

Split `DashboardSidebar.tsx` internals into co-located primitives under `src/components/dashboard/sidebar/`:
- `SidebarSection.tsx`, `SidebarItem.tsx`, `SidebarGroup.tsx`, `SidebarWorkspaceSwitcher.tsx`.

Behavior:
- Auto-hide empty groups via existing `useVisibleSidebarGroups`.
- Collapsed state persisted in `qitaat_shell_sidebar_collapsed` and per-group `qitaat_shell_sidebar_group_{key}`.
- Badge counter slot (rendered only when caller supplies a count; no fetch).
- Public API of `DashboardSidebar` unchanged — internal refactor only.

## 3. Global Command Palette

Create:
- `src/components/workspace/shell/CommandPalette.tsx` (uses existing `cmdk` via `@/components/ui/command`).
- `src/hooks/useCommandPalette.ts` — open/close + `⌘K` / `Ctrl+K` (reuses pattern from `useGlobalSearch` but does not break it; new shortcut is `⌘K` when palette mounted, falls back to global search otherwise via priority check).

Content sources (all in-memory, no network):
- Visible routes from `useVisibleRoutes`.
- Recent refs from `RecentWorkspaceContext` store.
- Static action registry filtered by `usePermissionMatrix`.

Mounted once inside `DashboardLayout`.

## 4. Workspace Search Launcher

- `src/components/workspace/shell/WorkspaceSearchLauncher.tsx` — button + input that detects ref prefixes (`WO-`, `TASK-`, `CNT-`, `QTE-`, `LED-`, `BKG-`, `TEAM-`, `STF-`) and routes to the existing reference resolver / search pages. No DB calls.
- Ref → route map in `src/modules/workspace/shell/refRouteMap.ts`.

## 5. Recent Context Dock

- `src/components/workspace/shell/RecentWorkspaceContext.tsx` + `src/modules/workspace/shell/recentContextStore.ts`.
- LocalStorage key `qitaat_shell_recent_v1`, capped at 20 entries, schema-versioned.
- Hook `useRecordRecentContext(ref, label, path)` callable from pages later (no page edits this phase beyond minimal wiring on work-order/contract detail if trivial — otherwise deferred).

## 6. Quick Actions System

- `src/components/workspace/shell/QuickActionGrid.tsx`.
- Action registry `src/modules/workspace/shell/quickActions.ts` with filters: role (`admin`/`provider`/`user`), permission key, route-context predicate.
- Examples wired: Create Work Order, Operations Feed, Staff Center, Bulk Reference Triage, Operations Console, Contracts, Leads — all link to existing routes.

## 7. Mobile UX

In `DashboardLayout` + new shell:
- Body scroll lock when offcanvas sidebar open (`overflow-hidden` on `<html>`).
- `env(safe-area-inset-*)` padding on header + sticky action rows.
- 44px min touch targets (reuse `h-ctrl-md`).
- `useIsMobile` drives compact header + bottom-sheet command palette via existing `Drawer`.

## 8. Layout consistency

Audit + ensure these already-wrapped pages get the new header/context bar automatically (because they use `DashboardLayout`):
- `admin/*`, `dashboard/work-orders/*`, `dashboard/settings/staff`, operations/triage/reference inspector pages.

No new wrapping required if `DashboardLayout` already wraps them (NAV-LAYOUT-CONSISTENCY-1 already enforces this). New test extends that guard to assert no page renders `WorkspaceHeader` directly (it must come from `DashboardLayout`).

## 9. Tests (new file per concern under `src/__tests__/`)

- `appShellRearchitecture1.commandPalette.test.tsx` — ⌘K opens/closes, fuzzy match, permission filter.
- `appShellRearchitecture1.sidebarPersistence.test.tsx` — localStorage restore + group collapse.
- `appShellRearchitecture1.quickActions.test.tsx` — role + permission filtering.
- `appShellRearchitecture1.recentContext.test.ts` — store cap, versioning, dedupe.
- `appShellRearchitecture1.refRouteMap.test.ts` — prefix → route resolution.
- `appShellRearchitecture1.noDuplicateShell.test.ts` — source scan: no page imports `WorkspaceHeader` or `WorkspaceContextBar` directly.
- `appShellRearchitecture1.noDirectDb.test.ts` — source scan: shell primitives contain no `supabase.from` / `.rpc(`.
- `appShellRearchitecture1.noForbiddenImports.test.ts` — shell files do not import payments/membership/realtime/cron modules.
- `appShellRearchitecture1.mobileShell.test.tsx` — offcanvas + scroll lock.

## 10. Validation

`tsc`, full vitest, `broken-links-audit`, NAV-LAYOUT-CONSISTENCY-1, identity/businesses/operations isolation audits.

## Files created

```
src/components/workspace/shell/
  WorkspaceHeader.tsx
  WorkspaceContextBar.tsx
  CommandPalette.tsx
  WorkspaceSearchLauncher.tsx
  RecentWorkspaceContext.tsx
  QuickActionGrid.tsx
  index.ts
src/components/dashboard/sidebar/
  SidebarSection.tsx
  SidebarItem.tsx
  SidebarGroup.tsx
  SidebarWorkspaceSwitcher.tsx
  index.ts
src/hooks/useCommandPalette.ts
src/hooks/useBreadcrumbs.ts
src/modules/workspace/shell/
  quickActions.ts
  refRouteMap.ts
  recentContextStore.ts
  index.ts
src/__tests__/appShellRearchitecture1.*.test.{ts,tsx}  (9 files)
```

## Files modified

- `src/components/dashboard/DashboardLayout.tsx` — mount header/context bar/palette/launcher.
- `src/components/dashboard/DashboardSidebar.tsx` — delegate to new sidebar primitives (behavior preserved).
- `src/modules/workspace/permissions/index.ts` — re-export new helpers if needed.

## Out of scope / deferred

- Wiring `useRecordRecentContext` into every detail page (separate phase).
- Server-backed search (Phase 2 of search).
- Badge counters fetching live data.
- Workspace switcher actually switching businesses (UI only, action deferred to staff-center phase).

## Risk

Low. All additive; flagged mount points; refactor preserves `DashboardSidebar` public API; new tests prevent regressions in shell duplication and DB access from shell.
