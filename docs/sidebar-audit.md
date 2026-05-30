# Sidebar Audit — NAVIGATION-ARCHITECTURE-REBUILD-1

## Current structure (after this rebuild)

- **Brand mark** → `SidebarBrand` (active-business logo slot + "ق" fallback, dark-mode safe, collapsed-aware).
- **Admin badge** → unchanged (Super Admin / Admin pill).
- **Quick Create** → `SidebarQuickCreate` — 5 shortcuts: عقد، عرض سعر، أمر عمل، RFQ، بلاغ.
- **Favorites** → `SidebarFavorites` — up to 8 pinned routes from `useSidebarFavorites`.
- **Recent** → `SidebarRecent` — last 5 visited dashboard/admin routes from `useRecentRoutes`.
- **Role-based menu** → existing `providerGroups` / `userGroups` / `adminBaseGroups` rendered by `RenderGroups` with longest-prefix active resolution.
- **Footer** → Home, language toggle, logout.

## Findings & resolutions

| Finding | Status |
|---|---|
| Brand mark hardcoded inline, no business-logo slot | ✅ Extracted to `SidebarBrand` with `businessLogoUrl` prop + fallback |
| No discoverability for top creation actions | ✅ Added Quick Create row (5 shortcuts) |
| No pinning / personalization | ✅ Added Favorites (per-user localStorage, capped at 8) |
| No recency surface | ✅ Added Recent (last 5 distinct dashboard/admin routes) |
| `/admin/identity?view=...` legacy deep-links in sidebar/palette | ✅ Removed previously; guard test added |
| Duplicate "مراجعة المزودين" / "إدارة الوصول" entries | ✅ Already deduped — guarded by `adminSidebarRestructure.test.ts` |
| Notifications listed twice (Communication + Account) for admins | ⚠️ Intentional — Account block is the personal inbox surface |
| `/dashboard/notifications` reachable from 2 groups for users | ⚠️ Acceptable — both surfaces are role-correct |
| Settings split across "Business Profile" / "Settings" | 🟡 Backlog — recommended consolidation tracked in `page-polish-repairs.md` |
| `/dashboard/work-orders/overview` overlap with `/dashboard/work-orders` highlight | ✅ Resolved by `resolveBestMatch` longest-prefix logic |
| Provider "Membership" group mixes membership + loyalty + installments | 🟡 Backlog — split into "Billing" vs "Loyalty" |

## Visibility / role rules

- `superAdminOnly: true` items are filtered out for plain admins.
- `canViewWorkspaceRoute` (ORG-RBAC) hides items the active workspace role can't reach.
- Empty groups (all items filtered) are hidden entirely.
- Quick Create filters by audience (`provider | admin | user`) — users only see "Report issue".

## Hidden / deep-link-only routes

Documented inline in `DashboardSidebar.tsx` header comment. None of these
have sidebar entries by design (they're opened from contextual surfaces):
`/admin/users(/:id)`, `/admin/quote-requests(/:id)`, `/admin/pdf-visual-qa`,
`/admin/contracts/analytics`, `/admin/diagnostics`, `/admin/showcase`,
`/admin/locations/*` sub-pages, `/admin/contact-*` legacy redirects.

## Validation

- ✅ `navigationArchitectureRebuild1.test.ts` (19 tests) — quick-create, favorites, recent, branding, sidebar wiring.
- ✅ `adminSidebarRestructure.test.ts` (17 tests) — group structure + dedupe + protection.
- ✅ `adminSidebarLinks.test.ts` (3 tests) — every `/admin/*` link routed.
- ✅ `scripts/broken-links-audit.mjs` — 0 broken internal links across 181 routes.