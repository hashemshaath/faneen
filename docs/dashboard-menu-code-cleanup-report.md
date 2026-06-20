# DASHBOARD + MENU CODE CLEANUP REPORT

Structural refactor of the dashboard navigation surface. Behaviour unchanged.

---

## 1. Where the duplication was

| Place | Duplication |
|-------|-------------|
| `src/components/dashboard/DashboardSidebar.tsx` | 240+ lines of inline `userGroups` / `providerGroups` arrays mixing labels, routes, icons, badges |
| `DashboardSidebar.tsx` again | Inline registry-mapping for admin groups (re-derived from `ADMIN_NAV_GROUPS` on every import) |
| `DashboardSidebar.tsx` again | Inline audience-selection ternary (`isAdmin ? … : isProvider ? … : hasBusiness ? …`) + the «filter `business` group» logic next to JSX |
| `MobileDashboardMenu` (consumes same component) | Inherited the same coupling because the data was not exported |

## 2. Where labels were duplicated

Already collapsed by Phase A/B via `unifiedLabels.ts`, but the file was
only consumed by one component. After this phase, **every** navigation
consumer (sidebar, future mobile menu, tests) reads from a single
barrel: `@/modules/dashboard/navigation`.

## 3. Where visibility rules were scattered

| Before | After |
|--------|-------|
| Audience pick inside JSX (`baseGroups = isAdmin ? … : …`) | `getVisibleDashboardNavGroups(ctx)` |
| «Hide Business group when `!hasBusiness`» as a one-off `.filter()` in component body | Same rule inside `dashboardNavigation.visibility.ts` |
| Per-item route auth | Untouched — still `canViewWorkspaceRoute()` + RLS (server-authoritative) |

## 4. Files modified

- `src/components/dashboard/DashboardSidebar.tsx` — removed ~250 lines of inline config; now imports from the navigation module.
- `src/__tests__/unifiedDashboardNavigationIa.test.tsx` — updated assertions to read from the new module locations.
- `src/__tests__/dashboardMenuBrokenLinksGuard.test.tsx` — URL extractor now scans both the sidebar and the config module.

## 5. Files added

```
src/modules/dashboard/navigation/
  dashboardNavigation.types.ts        # DashboardNavItem / DashboardNavGroup / DashboardNavContext
  dashboardNavigation.labels.ts       # re-exports the unified glossary (single source)
  dashboardNavigation.config.ts       # userNavGroups + providerNavGroups + adminNavGroups
  dashboardNavigation.visibility.ts   # getVisibleDashboardNavGroups(ctx)
  index.ts                            # barrel

src/__tests__/
  dashboardNavigationConfig.test.ts            # 6 tests — structural integrity
  dashboardNavigationVisibility.test.ts        # 6 tests — audience + business gating
  dashboardNavigationVisualConsistency.test.tsx# 7 tests — class strings + no hex / no suppressions
```

## 6. Unified menu config?

**Yes.** All three audiences live in `dashboardNavigation.config.ts`. The
admin audience is still registry-derived from `@/modules/admin-shell` so
the admin shell remains the single source for admin entries.

## 7. Labels from one source?

**Yes.** `dashboardNavigation.labels.ts` re-exports `UNIFIED_GROUP_LABELS`
and `UNIFIED_ITEM_LABELS`. The sidebar no longer imports `unifiedLabels`
directly; it goes through the navigation barrel.

## 8. Desktop / Mobile share the same source?

**Yes.** `DashboardSidebar.tsx` is the shadcn `Sidebar` and is rendered
by the dashboard shell in both desktop and mobile (`useSidebar()` +
`isMobile` branch). Both render paths now consume
`getVisibleDashboardNavGroups()`; there is no separate mobile config.

## 9. Admin / Provider / User share the same structure?

**Yes.** All three return `DashboardNavGroup[]` with identical shape
(`key`, `groupLabel`, `icon`, `description?`, `items: DashboardNavItem[]`).
Audience selection happens once, in `getVisibleDashboardNavGroups()`.

## 10. Behaviour changes

**None.** Same routes, same labels, same auth gates, same active-route
resolver, same mobile/desktop branches, same Quick Create + Favorites +
Admin Favorites blocks, same CTA card for users without a business.

## 11. DB / RLS / RPC / migrations / edge

**None.** Pure frontend refactor.

## 12. Auth / RFQ / membership / onboarding

**None.** No `AuthContext`, no `quote_requests`, no membership hook, no
`STEP_ORDER`, no `/onboarding` save/submit path touched.

## 13. Broken links

**0 broken** out of 116 sidebar URLs (`/tmp/cr.py`: `Links: 116 | Broken: 0`).
`dashboardMenuBrokenLinksGuard.test.tsx` enforces this in CI against
both `DashboardSidebar.tsx` and `dashboardNavigation.config.ts`.

## 14. `tsc --noEmit`

```
exit 0  (0 errors)
```

## 15. Test results

Focused navigation suite — `vitest run` on the 6 relevant files:

```
 ✓ dashboardNavigationConfig.test.ts            (6)
 ✓ dashboardNavigationVisibility.test.ts        (6)
 ✓ dashboardNavigationVisualConsistency.test.tsx(7)
 ✓ unifiedDashboardNavigationIa.test.tsx        (11)
 ✓ dashboardMenuBrokenLinksGuard.test.tsx       (11)
 ✓ dashboardMenuVisualConsistency.test.tsx      (11)
 Test Files  6 passed (6)
      Tests  52 passed (52)
```

## 16. Full suite

Not re-run in this phase (scope was navigation-only). Phase A/B baseline
remained 7664/7664; this phase only adds 19 new tests and rewrites
assertions in two existing files, all of which now pass.

## 17. Decision

✅ **`DASHBOARD + MENU CODE CLEANUP PASS`**