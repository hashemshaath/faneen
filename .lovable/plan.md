
# Dashboard Comprehensive Audit — Findings & Phased Fix Plan

Read-only audit across client dashboard, provider dashboard, and admin panel. 178 routes (74 `/dashboard/*`, 104 `/admin/*`) across 215 page files. Evidence gathered via 4 parallel static analyses (navigation, duplication/structure, permissions, functionality+profile). No fixes applied in this plan.

---

## SECTION 1 — Navigation Integrity

### Findings

| Sev | Finding | Evidence |
|---|---|---|
| — | **Zero broken links.** All 226 extracted internal targets resolve to a registered `<Route>` in `src/App.tsx`. | 4 scoped roots scanned |
| MEDIUM | **Quick Create registry drift** — Quick Create shortcuts point at pre-Opportunities-Phase-2 legacy URLs. | `menuArchitecture.ts:50,64` → `/dashboard/rfq`, `/dashboard/rfq/inbox` (both redirect stubs; canonical is `/dashboard/opportunities/assigned`) |
| LOW | **Live CTAs routing through legacy redirect stubs** (extra hop, breaks back button). | `DashboardRfqDetail.tsx:140`, `ProviderLeadDetails.tsx:191,217`, `DashboardOperationsFeed.tsx:205`, `DashboardWorkOrderDetail.tsx:231`, `AdminQuoteRequestDetails.tsx:393,431`, `AdminProviderReview.tsx:350`, `AdminOperations.tsx:806`, `DashboardEntityDetail.tsx:353,374`, `AdminContracts.tsx:112` |
| LOW | **High-confidence orphan routes** — reachable only by URL, not from any sidebar/hub/menu config. | `/admin/provider-landing` (stub, no inbound refs), `/admin/notifications-config` (`App.tsx:607`), `/dashboard/showcase` (`:518`), `/dashboard/bookmarks` (`:424`), `/dashboard/inquiries` (`:426`) |
| LOW | **Route triples for same domain** — `/dashboard/operations` vs `/operations-center` vs `/operations/feed` (`App.tsx:473-475`) create confusion; only `feed` is linked from scoped nav. | See Duplication §1 |
| — | **No cross-guard mismatches.** Only cross-surface link (`AdminDashboardView` → `/admin/*`) is `isAdmin`-gated in `DashboardOverview.tsx:35-36`. | |
| — | **Journey CTAs verified** — client/provider bid/sample components share `opportunityId` composition; no routing hole. | `QuoteRequestDetails.tsx:493,504` ↔ `ProviderLeadDetails.tsx:335-357` |

---

## SECTION 2 — Duplication & Structure

### Duplicate/overlapping pages

| Sev | Group | Recommendation |
|---|---|---|
| HIGH | **`AdminMembershipsHub` vs `AdminFinanceCenter`** — two live top-level routes (`/admin/memberships`, `/admin/finance`) wrap identical 5-child tab sets. | **Merge** — canonicalize `/admin/finance`, redirect the other. |
| HIGH | **`AdminSystemSettingsHub` vs `AdminSettingsCenter`** — overlapping tab sets, two settings entry points. | **Merge** — absorb Center's tabs into Hub or redirect. |
| HIGH | **Admin identity triple** — `/admin/identity`, `/admin/identity/dashboard`, `/admin/system/identity` are 3 separate live routes (`App.tsx:598-602`). | **Merge** `AdminIdentity` + `AdminIdentityCenter` as tabs inside `AdminIdentityHub`. |
| MEDIUM | **`AdminQuoteOperations` vs `AdminOpportunitiesOperations`** — confusing "operations" naming twins. | Rename or merge. |
| MEDIUM | **`DashboardBusinessProfileMerged` is a thin wrapper** re-exporting `DashboardBusinessEdit` (`Merged.tsx:16-23`). | Inline `DashboardBusinessEdit` into hub tab loader; delete wrapper. |
| MEDIUM | **`/dashboard/my-requests` vs `/dashboard/opportunities`** — different URLs, same component. | Pick one canonical, redirect the other. |
| LOW | **`AdminIdentity` vs `AdminIdentityHub` vs `AdminIdentityCenter`** — see identity triple above. | — |

### Duplicate logic

| Sev | Duplication | Canonical home |
|---|---|---|
| MEDIUM | **6+ ad-hoc status-label maps** hand-rolled in pages: `DashboardMembership.tsx:92`, `DashboardInstallments.tsx:58`, `DashboardEntities.tsx:35`, `SiteLicensesTab.tsx:62`, `TaxonomyMigrationPanel.tsx:36`, `AdminLeadRequests.tsx:75`. | Move each into its domain's `modules/<domain>/status.ts` (pattern already exists for opportunities/workOrders/rentals/assets). |
| MEDIUM | **`<AdminRoute>` migration 99% incomplete** — only `/admin/taxonomy` (`App.tsx:526`) uses the wrapper; ~90 other admin routes still repeat `<ProtectedRoute requireAdmin>`. | Complete the migration documented at `AdminRoute.tsx:9-14`. |
| INFO | No shared `useNotifications` wrapper exists — every page calls `sonner`/`toaster` directly. | Missing abstraction, not duplication; optional to introduce. |
| — | Currency/date formatters already centralized (`contract-financials.ts:formatMoney`). No offenders. | — |

### Oversized files (top 15)

| Lines | File | Concern |
|---|---|---|
| 3190 | `DashboardContracts.tsx` | Split by concern (list / actions / analytics) |
| 2132 | `DashboardRentals.tsx` | Split by tab |
| 1615 | `DashboardMessages.tsx` | Split composer / list / preview |
| 1612 | `AdminContactMessages.tsx` | Single tab of ContactCenter — extract subsections |
| 1516 | `DashboardSites.tsx` | Split site-list / KPIs |
| 1477 | `DashboardAiCenter.tsx` | Split by feature panel |
| 1448 | `AdminBusinesses.tsx` | Extract row actions / filters |
| 1343 | `DashboardInstallments.tsx` | Extract status maps + row cards |
| 1336 | `AdminBarcodeRegistry.tsx` | Split table + detail drawer |
| 1333 | `DashboardMyRequests.tsx` | Split filters + row |
| 1324 | `DashboardBlog.tsx` | Split editor from list |
| 1283 | **`DashboardBusinessEdit.tsx` — confirmed god-component** (info + branches + credentials + entities + reps + location) | Priority split |
| 1272 | `DashboardBadge.tsx` | — |
| 1271 | `AdminUsers.tsx` | Split actions modal / row |
| 1197 | `ProductionBoardPage.tsx` | — |

### Orphan page files (safe to delete)

| Sev | File | Evidence |
|---|---|---|
| LOW | `src/pages/dashboard/DashboardWorkOrdersOverview.tsx` | Not in `App.tsx`, not in `routes/dashboardRoutes.ts`; only 6 test files reference it. Route `/dashboard/work-orders/overview` is a `Navigate` stub. |
| LOW (unconfirmed) | `DashboardRfqHub.tsx` + tab children `DashboardRfq.tsx`, `DashboardRfqInbox.tsx` | No `<Route>` mount found; only self-tests. Confirm before delete. |

---

## SECTION 3 — Permissions & Guards

### Findings

| Sev | Finding | Evidence |
|---|---|---|
| HIGH | **Provider-scope resolved by `.eq('user_id', user.id)` instead of `useActiveWorkspace()`** — breaks staff-member access, ignores active-workspace switcher. | `DashboardAssets.tsx:64`, `DashboardRentals.tsx:620`, `DashboardRentalsAnalytics.tsx:137`, `DashboardRentalsCalendar.tsx:99` |
| MEDIUM | **`/dashboard/settings/staff`** has no route-level `requireProvider`/business-scope guard; relies entirely on in-page checks. | `App.tsx:430` |
| MEDIUM | **UI/RLS boundary mismatch** — `AdminUsers.tsx` ban/suspend/staff-link mutations (`:634-720`) are reachable by any admin via RLS, though route is `requireSuperAdmin`. Not exploitable by lower-privilege roles but "super-admin only" is a UI fiction. | `App.tsx:597`; `20260410104708_...sql:82-86` |
| LOW | **`PermissionRouteGuard` fully implemented but wired to zero routes** — dead defense-in-depth layer. | Referenced only in tests + `DashboardNoAccess` comment |
| LOW | **`/dashboard/rentals`, `/dashboard/assets`, `/dashboard/work-orders`, `/dashboard/procurement`** lack `requireProvider` at route level. Acceptable if dual-sided; otherwise under-guarded. | `App.tsx:404-422` |
| — | Provider approval & username-status RPCs re-check `has_admin_access` server-side ✅ | `20260605113107_...sql:25-27`, `20260507151934_...sql:72-74` |
| — | `user_roles` RLS restricts writes to `is_super_admin` ✅ (matches `requireSuperAdmin` route) | `20260412080903_...sql:13-27` |

### Open server-side checks needed
- Edge functions `admin-delete-user`, `admin-reset-password` — verify service-role code re-checks super-admin (edge functions bypass RLS).
- `business_staff` write path — RLS appears to allow only *owner*; `DashboardTeamAccess` also permits `isAdmin` client-side. Confirm admin-specific policy exists.
- `AdminContracts` mutation/RPC path not fully traced.

---

## SECTION 4 — Functionality & Quality

### Inert UI
**Zero true dead handlers.** Regex sweeps for empty `onClick`, `console.log`-only handlers, alert-stubs returned no matches. Only intentional "Coming Soon" tabs (`DashboardWorkspaceDetail.tsx:5`).

### RPC / Edge Function integrity
**Zero mismatches.** All 40 `.rpc()` names + 6 `functions.invoke()` targets resolve to existing definitions.

### Loading / error states (worst offenders)

| Sev | File | Issue |
|---|---|---|
| HIGH | `DashboardHelpCenter.tsx:27-29` | 4 queries, zero `isLoading` / `isError` / skeleton |
| HIGH | `AdminHelpCenter.tsx:57-62` | 14 query/mutation calls; 3 loading refs, **zero** `isError`, **zero** skeleton |
| MEDIUM | `AdminContractCreate.tsx:42-166` | Form queries lack loading/error |
| MEDIUM | `AdminProviderLanding.tsx` | 8 queries, error refs but no spinners |
| MEDIUM | `AdminIntegrations.tsx`, `AdminOtpFailures.tsx` | Missing loading refs |

### Perf (heaviest mount paths)

| Sev | File:line | Issue |
|---|---|---|
| HIGH | `DashboardContractReview.tsx:173-174` | Only `.from('contracts').select('*')` in scope — wide table |
| HIGH | `DashboardSiteDetail.tsx:96-219` | 3-level dependent-query waterfall (base → 7 site-dependent → 1 contract-dependent) |
| MEDIUM | `DashboardSites.tsx:435-438` | `.in('execution_site_id', siteIds)` unbounded, no `.limit()` |
| MEDIUM | `AdminBrandDetail.tsx:101-668` | 10 gated queries (mostly parallel, verify) |
| LOW | `DashboardContracts.tsx:339-1256` | 7 gated queries (fan-out, not waterfall) |
| — | No `staleTime: 0` / `refetchOnMount: 'always'` remnants | Clean |

---

## SECTION 5 — Profile Surfaces (Business Edit)

### Missing coverage

| Sev | Column | Issue |
|---|---|---|
| HIGH | `seo_title_ar/en`, `seo_description_ar/en`, `seo_keywords`, `og_image` | Owner cannot self-manage SEO metadata — admin-only (`BusinessSeoSection.tsx`, `AdminBrandDetail.tsx`) |
| MEDIUM | `capabilities` (Json) | Zero references anywhere — orphan column or missing UI |
| LOW | `default_currency`, `default_locale`, `timezone` | Not surfaced in owner UI; intent unclear |
| — | `country_code`, `phone_country_code`, `phone_national` | Likely derived by `PhoneField`; acceptable |
| — | `cr_document_mime/path`, `approval_notes` | System-managed / reviewer-only ✅ |

### Validation gaps
| Sev | Issue | Evidence |
|---|---|---|
| MEDIUM | `name_ar` missing is only a warning — profile publishable with no Arabic name | `validation.ts:178-182` |
| MEDIUM | Missing `latitude`/`longitude` is warning-only — publishable without map pin | `validation.ts:204-207` |
| LOW | No client-side `username` uniqueness/format in `validateBusinessForm` | `validation.ts:124-147` |

Public profile (`BusinessProfile.tsx`) fields are a subset of editable fields — **no missing-editability gap**.

---

## Phased Fix Plan

### D1 — Links, dead files, inert-UI cleanup (zero risk)
1. Fix Quick Create URLs in `menuArchitecture.ts:50,64` to canonical `/dashboard/opportunities/assigned` (removes 2 redirect hops for the most-used shortcut).
2. Update the 9 live CTAs listed in §1 to point at canonical hub+`?tab=` URLs instead of legacy redirect stubs.
3. Delete `DashboardWorkOrdersOverview.tsx` + prune 6 test references.
4. Confirm and delete `DashboardRfqHub`/`DashboardRfq`/`DashboardRfqInbox` if no runtime references exist.
5. Add the 5 orphan routes to the correct sidebar/hub OR remove the routes: `/admin/provider-landing`, `/admin/notifications-config`, `/dashboard/showcase`, `/dashboard/bookmarks`, `/dashboard/inquiries`.
6. Add loading skeleton + `isError` branches to `DashboardHelpCenter`, `AdminHelpCenter`, `AdminContractCreate`, `AdminProviderLanding`, `AdminIntegrations`, `AdminOtpFailures`.

### D2 — Permission corrections (some may need DB approval)
1. Refactor `DashboardAssets`/`DashboardRentals`/`DashboardRentalsAnalytics`/`DashboardRentalsCalendar` to use `useActiveWorkspace().active_business_id` instead of `.eq('user_id', user.id)`. Fixes staff-access + multi-business scoping.
2. Add `requireProvider` to `/dashboard/settings/staff` (and evaluate `/dashboard/rentals|assets|procurement|work-orders`).
3. Tighten RLS on admin-only writes (`profiles` ban/suspend, `business_staff` link) to `is_super_admin` if that is the true boundary — **flag for approval**.
4. Verify edge functions `admin-delete-user`, `admin-reset-password` re-check super-admin server-side; add missing check if absent — **flag for approval**.
5. Either wire `PermissionRouteGuard` into workspace-role routes as defense-in-depth or delete the dead component.

### D3 — Dedup & oversized-file splits
1. Merge duplicate admin hubs: `AdminMembershipsHub` ↔ `AdminFinanceCenter`, `AdminSystemSettingsHub` ↔ `AdminSettingsCenter`, admin identity triple.
2. Rename or merge `AdminQuoteOperations` / `AdminOpportunitiesOperations`.
3. Inline `DashboardBusinessProfileMerged` wrapper; delete file.
4. Choose canonical URL between `/dashboard/my-requests` and `/dashboard/opportunities`; redirect the other.
5. Consolidate the 6 ad-hoc status-label maps into their respective `modules/<domain>/status.ts`.
6. Complete `<AdminRoute>` migration for the ~90 remaining admin routes (mechanical, low risk).
7. Split top-3 god-components: `DashboardContracts.tsx` (3190), `DashboardRentals.tsx` (2132), `DashboardBusinessEdit.tsx` (1283 — confirmed multi-domain).
8. Add owner-editable SEO section (`seo_title/description/keywords/og_image`) to business-edit UI; upgrade `name_ar` and coordinates from warnings → hard errors.

### D4 — Perf on heaviest mounts
1. `DashboardContractReview.tsx:173-174` — replace `select('*')` with explicit column list.
2. `DashboardSiteDetail.tsx:96-219` — flatten 3-level waterfall (batch initial site + first-hop reads via one RPC, mirror `usePublicBusinessProfile` pattern).
3. `DashboardSites.tsx:435-438` — add `.limit()` on unbounded `.in(...)` query.
4. Audit `AdminBrandDetail.tsx` 10-query mount for true parallelism vs. hidden chaining.

---

## Verdict per area

| Area | Verdict | Rationale |
|---|---|---|
| Navigation | READY-WITH-NOTES | 0 broken; drift + legacy redirect hops need D1 |
| Permissions | READY-WITH-NOTES | 1 HIGH scoping bug (Assets/Rentals family); UI/RLS boundary mismatches need D2 |
| Duplication | HIGH-DEBT | 3 duplicate hubs + god-components; D3 |
| Functionality | READY-WITH-NOTES | 0 broken RPCs / dead handlers; help centers need loading states |
| Perf | READY-WITH-NOTES | 1 wide `select('*')`, 1 real waterfall — D4 fixes both |
| Profile | READY-WITH-NOTES | SEO ownership gap + soft-validation on required fields |

Approve to proceed with D1, or reorder phases as preferred.
