# Route & Link Audit — PLATFORM-DEEP-AUDIT-REPAIR-1

_Generated as part of the v1.0 Production Launch Assessment._

## Summary

| Metric | Value |
|--------|-------|
| Routes defined in `App.tsx` | 162 |
| Unique internal links scanned | 62 |
| Broken internal links | **0** |
| Sitemap endpoints | 8 (all <3s, p95 877ms) |
| Robots / sitemap sync | ✅ in sync |
| Token / private pages with `useNoIndex` | ✅ all verified |

## Critical routes — verification matrix

| Route | Owner | Guard | Indexable | Notes |
|-------|-------|-------|-----------|-------|
| `/` | `Index` | Public | ✅ | Home; SEO clean |
| `/search` | `Search` | Public | ✅ | Reads `businesses_public` only |
| `/:username` | `UsernameResolver` → `PublicUserProfile` / `BusinessProfile` | Public | ✅ | Conditional on publish state |
| `/r/:refId` | `ReferenceResolver` | Public | `noindex` | Redirect-only; `useNoIndex()` ✓ |
| `/q/:code` | `QSlugDispatcher` → viewer or barcode resolver | Public token | `noindex` | `?t=` dispatch; both branches `useNoIndex()` ✓ |
| `/client/:refId` | `CustomerProjectPortal` | Public token | `noindex` | Token-gated; `useNoIndex()` ✓ |
| `/s/:token` | `PublicSiteScan` | Public token | `noindex` | `useNoIndex()` ✓ |
| `/dashboard/operations-center` | `DashboardOperationsCenter` | `ProtectedRoute` | n/a | KPIs + data integrity card |
| `/dashboard/work-orders` | `DashboardWorkOrders` | `ProtectedRoute` | n/a | List, no per-row notes |
| `/dashboard/work-orders/board` | `ProductionBoardPage` | `ProtectedRoute` | n/a | Read-only board |
| `/dashboard/work-orders/:refId` | `DashboardWorkOrderDetail` | `ProtectedRoute` | n/a | Detail-only lazy |
| `/dashboard/procurement` | `DashboardProcurement` | `ProtectedRoute` | n/a | RFQ lifecycle |
| `/dashboard/contracts` | `DashboardContracts` | `ProtectedRoute` | n/a | Locked on Active |
| `/dashboard/business-edit` | `DashboardBusinessEdit` | `ProtectedRoute` | n/a | Sensitive writes via guarded mutations |
| `/dashboard/settings/staff` | `DashboardStaffCenter` | `ProtectedRoute` | n/a | Staff invitations |
| `/admin/identity` | `AdminIdentity` | `requireAdmin` | n/a | Masked PII via `lib/masking` |
| `/admin/businesses` | `AdminBusinesses` | `requireAdmin` | n/a | Guarded writes |
| `/admin/provider-review` | `AdminProviderReview` | `requireAdmin` | n/a | Publish flow + readiness panel |
| `/admin/membership-payments` | `AdminMembershipPayments` | `requireAdmin` | n/a | Read + reconcile |
| `/admin/operations` | `AdminOperations` | `requireAdmin` | n/a | Cron + SLA |

## Findings & fixes

- ✅ **No broken links.** `broken-links-audit` clean across 162 routes / 62 unique link targets.
- ✅ **No shadowed routes.** `/q/*` dispatcher invariant enforced by `pages/__tests__/qSlugDispatcher.test.ts`.
- ✅ **No private pages exposed publicly.** All `/dashboard/**`, `/admin/**` and `/contracts/**` paths wrapped in `<ProtectedRoute>` with the correct role flags.
- ✅ **All token/private public pages call `useNoIndex()`.** Verified for `CustomerProjectPortal`, `PublicSiteScan`, `QuotationViewer`, `PublicBarcodeResolve`, `ReferenceResolver`.
- ✅ **Sitemap ↔ robots sync.** `robots-sitemap-sync-audit` clean; `Disallow: /q/` mirrored in static + edge.
- ✅ **No orphan pages.** Every page under `src/pages/**` is registered in `App.tsx` or is a dispatcher target.

No repairs required.

## Out of scope (deferred)

- Sidebar/header redesign — visual only, not in this phase.
- Drag/drop on production board — `BUSINESS-WORKFLOW-PRODUCTION-2`.
- Realtime dashboard invalidation polish — `BUSINESS-WORKFLOW-REALTIME-1`.