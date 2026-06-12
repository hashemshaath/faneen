# Admin Redesign — Phase 1 / Doc 1: Audit Report

> Read-only audit. No code touched. Source counts as of this scan.

## 1. Scope counts

| Surface                      | Files |
| ---------------------------- | ----: |
| `src/pages/admin/*.tsx`      |   103 |
| `src/pages/dashboard/*.tsx`  |    77 |
| Admin routes in `App.tsx`    |   ~95 |
| Admin Navigate-redirect aliases | ~14 |

## 2. Largest admin pages (refactor candidates)

| Page                          | KB    | Note                                                                 |
| ----------------------------- | ----: | -------------------------------------------------------------------- |
| `AdminBusinesses.tsx`         |  181  | Monolithic table + filters + inline create + CRUD. Split required.   |
| `AdminUsers.tsx`              |  175  | Same shape. Needs UserTable / UserFilters / UserDetailDrawer.        |
| `AdminContactMessages.tsx`    |   87  | Superseded by `AdminContactCenter` (route now redirects). Dead path. |
| `AdminMemberships.tsx`        |   78  | Superseded by `AdminMembershipsHub` (route alias). Tab content only. |
| `AdminDataEnrichment.tsx`     |   77  | Single page, dense. Candidate for tabs + drawer.                     |
| `AdminBrandDetail.tsx`        |   75  | Detail page; OK but oversized — extract sections.                    |
| `AdminBarcodeRegistry.tsx`    |   59  | Operational; needs filter bar + saved filters.                       |
| `AdminSystemAccess.tsx`       |   58  | Overlaps `AdminAccessManagement`.                                    |
| `AdminIdentity.tsx`           |   48  | Existing identity surface — partial; will be expanded in Phase 2.    |
| `AdminSystemSettings.tsx`     |   44  | Hosts API, integrations, etc. via `?tab=`. Becomes settings shell.   |
| `AdminActivityLog.tsx`        |   42  | Mature, keep; align with template.                                   |
| `AdminBranding.tsx`           |   33  | Overlaps `AdminIdentity` (theme colors). MERGE into Identity Center. |

## 3. Duplicate / overlapping pages

| Group                    | Files                                                                                | Action                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Identity / Branding      | `AdminIdentity`, `AdminBranding`                                                     | **Merge** → single `/admin/system/identity` (Phase 2)               |
| Operations               | `AdminOperations`, `AdminOperationsHub`, `AdminOperationsConsole`, `AdminOperationsCenterUnified`, `AdminOperationsAssets`, `AdminOperationsRentals` | Consolidate behind `AdminOperationsCenterUnified` + tabs; archive the rest |
| Contact                  | `AdminContactMessages`, `AdminContactCenter`, `AdminContactInboxSettings`, `AdminContactAuditLog`, `AdminContactSlaDashboard`, `AdminContactNotificationLog` | Already aliased to `AdminContactCenter?tab=…` — **delete the 5 superseded page files** (Phase 7) |
| Memberships              | `AdminMemberships`, `AdminMembershipsHub`, `AdminMembershipPayments`, `AdminMembershipEvents`, `AdminMembershipRejections`, `AdminMembershipPlanModules`, `AdminProviderSubscriptions` | Already aliased to `AdminMembershipsHub?tab=…` — **delete superseded** |
| Email                    | `AdminEmailCenter`, `AdminEmailHub`, `AdminEmailDeliverability`                      | Route uses `AdminEmailHub`; archive the other two                   |
| Contracts                | `AdminContracts`, `AdminContractsHub`, `AdminContractAnalytics`, `AdminContractCreate`, `AdminContractTemplates` | Promote `AdminContractsHub` as shell with tabs                      |
| Provider Review          | `AdminProviderReview`, `AdminProviderReviewHub`, `AdminProviderAnalytics`, `AdminProviderLanding`, `AdminProviderGrowth`, `AdminProviderGrowthQueue` | `AdminProviderReviewHub` is the shell; others become tabs/sections  |
| Access                   | `AdminAccessManagement`, `AdminSystemAccess`                                         | Decide one source of truth (super-admin vs admin scope). Likely merge under `/admin/system/access` |
| Catalog Governance       | `AdminCatalogGovernance`, `AdminCatalogGovernanceQueue`                              | Hub + queue tab                                                     |
| Approvals                | `AdminApprovalsCenter`, `AdminBusinesses`, `AdminEntityAccessRequests`               | Unified banner exists (memory: `unified-approvals-center`). Keep; do not merge data ownership |
| Quote ops                | `AdminQuoteRequests`, `AdminQuoteRequestDetails`, `AdminQuoteOperations`, `AdminLeadRequests`, `AdminProviderLeads` | Group under `/admin/operations/leads-quotes` shell                  |
| Taxonomy                 | `AdminLegacyTaxonomyReplaced` (categories, tags), `AdminTaxonomyCenter`              | Already redirected; delete `AdminLegacyTaxonomyReplaced` file (Phase 7) |
| Sitemap/SEO              | `AdminSitemapStatus`, `AdminSeoHub`, `AdminSiteAudit`, `AdminSectorSeo`              | Route uses `AdminSeoHub`; archive others                            |

**Total duplicate/superseded files identified: ~22.** All flagged for Phase 7 deletion AFTER inventory passes (matches our `Phase C3 knip` discipline).

## 4. Navigation problems

- **Sidebar** (`DashboardSidebar.tsx`): hardcoded route list, no search, no favorites, no recent pages, no badges/counters. Groups are inconsistent with the IA the product owner is asking for.
- **Header**: no global command palette (Cmd+K), no breadcrumb on most pages, theme toggle ad-hoc per page.
- **Breadcrumbs**: only some pages render them; no central source.
- **`?tab=` redirects**: ~14 admin routes redirect to a hub. Works, but the hub pages don't always preserve scroll/filter state when switching tabs.

## 5. Identity / theming state

Files involved today:
- `src/index.css` — full token layer (colors, fluid type, spacing, radii, elevation). **Good base.**
- `tailwind.config.ts` — token bindings.
- `src/config/brandTheme.ts` — brand color seed.
- `src/hooks/useThemeColors.ts` — reads `platform_settings.theme_overrides` JSON.
- `src/components/ThemeApplier.tsx` — injects `<style id="theme-overrides">` with **color overrides only**.
- `src/pages/admin/AdminIdentity.tsx` — current admin UI; partial coverage.
- `src/pages/admin/AdminBranding.tsx` — overlapping color-editing UI.

### Gaps
1. `ThemeApplier` only sets color CSS vars — **does not propagate typography, spacing, radii, button heights, table density**.
2. No DB row dedicated to identity tokens — overrides live inside `platform_settings.theme_overrides` JSON (no schema validation).
3. Two admin pages mutate identity (`AdminIdentity` + `AdminBranding`).
4. ~40+ admin/dashboard files still contain hex literals, `text-white`, `bg-white`, `text-black` (top offenders to be enumerated in Phase 7 before lint enforcement).
5. Icons in many places still use `size={n}` instead of `ic-*` classes (memory rule `design-tokens-system`).

## 6. Buttons / fields / tables state

- `button.tsx` has 13 variants — good coverage but `default`, `primary` are duplicates; `hero`, `heroOutline`, `urgent` are page-specific and should be consolidated.
- Form fields rely on shadcn primitives + `react-hook-form`. Density is inconsistent across admin pages.
- Data tables have no shared shell — every admin page reimplements sticky header / pagination / empty states.

## 7. Forms

- `AdminBusinesses` create flow is inline but ~2k LOC.
- `AdminUsers` and `AdminMemberships` host complex multi-section forms with no stepper.
- Field relationships (services × categories × brands) edited via nested selects — heavy. Drawer/Sheet inline editor pattern not yet adopted in admin.

## 8. Cross-cutting issues to fix in later phases

- No unified Data Table primitive (Phase 5).
- No command palette / global search in admin (Phase 3).
- No per-admin layout persistence (Phase 4).
- ESLint does not block hex literals / hardcoded font sizes (Phase 7).

## 9. What's already good (do not touch in Phase 2/3)

- Token layer in `index.css` (extend, don't rebuild).
- Shared primitives `PageHeader`, `MetricCard`, `FiltersBar`, `StatusBadge` (memory: `admin-redesign-shared-primitives`) — keep and extend.
- `<AdminRoute>` wrapper + `DashboardLayout` admin guard pattern.
- `VerifiedBadge`, bilingual primitives `<Bi>` / `useBi()`, `useNoIndex`.
- Lazy chunk splitting in `DashboardOverview`.

— End of audit.