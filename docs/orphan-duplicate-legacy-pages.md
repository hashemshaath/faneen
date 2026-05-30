# Orphan / Duplicate / Legacy Page Inventory

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_

No page is **removed** in this phase. Each entry below is classified:
`keep+link` · `keep-hidden` · `merge-candidate` · `deprecate-later` · `remove-after-proof`.

## Orphans (reachable only by direct URL or admin actions)

| Route | Reason kept | Class |
|---|---|---|
| `/compare`, `/compare-profiles` | Deep-linked from share / Cmd+K; future feature for search-result comparison | keep+link (backlog: add CTA in search results) |
| `/diagnostics` | Public self-serve account check linked from `/forbidden` | keep-hidden |
| `/forbidden` | RBAC fallback | keep-hidden |
| `/unsubscribe` | Email link only | keep-hidden |
| `/v/c/:number`, `/v/b/:username` | Verification micro-pages shared externally | keep-hidden |
| `/dashboard/no-access`, `/dashboard/account-diagnostics` | Self-serve fallbacks | keep-hidden |
| `/dashboard/badge`, `/dashboard/loyalty-store` | Reached from provider tools and loyalty CTAs | keep+link (already wired) |

## Duplicate-candidates (NOT merging in this phase)

| Pair | Recommendation | Class |
|---|---|---|
| `/dashboard/operations` vs `/dashboard/operations-center` | Different scope: snapshot widget vs full observability layer. Keep both; future phase may rename the former to `daily-ops`. | merge-candidate |
| `/sectors/:slug` vs `/sector/:slug` | Singular kept for legacy SEO redirects. | deprecate-later (needs redirect proof) |
| `/dashboard/work-orders` vs `/dashboard/work-orders/overview` | Overview is a curated digest, list is the operational surface. | keep |
| `/contracts` vs `/dashboard/contracts` | Customer surface vs provider surface; both required. | keep |

## Legacy / superseded

| Route | Replaced by | Status |
|---|---|---|
| `/admin/contact-inbox-settings` | `/admin/contact-messages?tab=settings` | Already `<Navigate>` redirect — verified |
| `/admin/contact-audit-log` | `/admin/contact-messages?tab=audit` | redirected |
| `/admin/contact-sla-dashboard` | `/admin/contact-messages?tab=sla` | redirected |
| `/admin/contact-notification-log` | `/admin/contact-messages?tab=notifications` | redirected |
| `/admin` | `/admin/operations` | redirected |
| Legacy `/admin/identity?view=...` deep links | New tab structure | Cleansed in NAVIGATION-ARCHITECTURE-REBUILD-1 |

## Phase-added pages confirmed wired

| Page | Wired via |
|---|---|
| `DashboardOperationsCenter` (Observability) | Sidebar (Operations & Insights), `/admin/operations` cross-link |
| `DashboardHelpCenter` (Help Center) | Sidebar (Help), `<HelpLauncherFloating>` |
| `DashboardStaffCenter` (Provider Growth) | Sidebar (Settings), staff invite acceptance |
| `DashboardOperationsFeed` | Activity ref-id deep-links + `OPS` quick filter |
| `AdminBulkReferenceTriage`, `AdminReferenceInspector` | Sidebar (Admin → Reference) + `/r/:refId` resolver |
| `ProductionBoardPage` | Sidebar (Production & Operations), work-order quick link |

## Components flagged for cleanup (not pages — informational)

None added this phase. See `docs/codebase-modularization-plan.md` for component-level cleanup.

## Recommendation

No deletions before pilot. All routes have purpose or intentional hidden-utility status.