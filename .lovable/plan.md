
# Deep Code-Quality Audit — Findings & Phased Plan

Read-only pass. Scope excludes DB/RPC/edge functions and the three pending Phase-C route-guard decisions.

## 1. Code Quality & Duplication

### 1.1 Oversized page files (top 15 by LOC, real `wc -l`)
```text
3425  src/pages/ContractDetail.tsx
3190  src/pages/dashboard/DashboardContracts.tsx
2132  src/pages/dashboard/DashboardRentals.tsx
1615  src/pages/dashboard/DashboardMessages.tsx
1612  src/pages/admin/AdminContactMessages.tsx
1516  src/pages/dashboard/DashboardSites.tsx
1514  src/components/admin/data-enrichment/LegacySingleRowEnrichment.tsx
1477  src/pages/dashboard/DashboardAiCenter.tsx
1448  src/pages/admin/AdminBusinesses.tsx
1390  src/pages/Onboarding.tsx
1343  src/pages/dashboard/DashboardInstallments.tsx
1336  src/pages/admin/AdminBarcodeRegistry.tsx
1324  src/pages/dashboard/DashboardBlog.tsx
1319  src/pages/Quote.tsx
1280  src/pages/dashboard/DashboardBusinessEdit.tsx
```
All 15 mix data-fetching, mutations, JSX, and inline sub-components.

### 1.2 Oversized hooks (>150 LOC)
```text
259 useActiveWorkspace.ts     251 useContractDraftAutosave.ts
230 useThemeColors.ts         186 use-toast.ts
178 useAdminFavorites.ts      174 useVisibleModules.ts
167 usePageMeta.ts            153 useWorkspaceContext.ts
```

### 1.3 Duplication hotspots
- **Direct supabase client calls in UI**: 200 files under `src/components` + `src/pages` import `@/integrations/supabase/client` vs only 10 in `src/services/`. Same query patterns (my-business, profile, roles, memberships) are re-implemented in many pages.
- **Silent catches**: ~155 empty `catch {}` / `catch { /* ignore */ }` blocks across `src/` — logs swallowed, no toast.
- **`any` in critical paths**: 237 occurrences outside tests; concentrated in contracts, payments, RFQ pages.
- **Formatting**: `src/lib/format.ts` exists but many pages still call `toLocaleString` / `new Intl.NumberFormat` inline (esp. `ContractDetail`, `DashboardInstallments`, `DashboardContracts`).

## 2. Performance

- **React Query**: 661 `useQuery` call sites, only 286 declare `staleTime`. Global default is 5 min, so most are fine, but personal dashboards (already user-scoped keys) still often refetch too aggressively on remount because `gcTime` isn't tuned per hot key.
- **Heavy libs imported eagerly** (candidates for lazy/dynamic import):
  - `recharts` in `UserDashboardView`, `TrendsWidget`, `SmartMetricCard`, `IdentitySignupsChart`, `DashboardInstallments`, `AdminActivityLog`, `AdminCronRuns`, `AdminProviderLanding`
  - `jspdf` + `jspdf-autotable` in `lib/export/exportTable.ts`, `DashboardRentalsAnalytics`, `exportLeadPdf.ts`
  - `leaflet` in `LocationPicker`, `SearchMapV3`
  - `qrcode` in `lib/badge/qr.ts`, `DashboardSitePrint`, `AdminSiteQrManager`, `BarcodeWidget`
- **Re-render risk**: `LanguageContext` + `AuthContext` consumers span the whole app; large lists (DashboardContracts, DashboardRentals, DashboardSites) lack row-level `memo`.

## 3. Error handling & resilience

- 155 silent catches (see above) — biggest offenders in contract/rfq/messages pages.
- Mutations: many `useMutation` sites lack `onError` toast and none use `onMutate`/rollback (checked contracts, installments, rentals pages).
- **ErrorBoundary coverage** is thin: only `App.tsx` (root), `Index.tsx`, `Auth.tsx`. Dashboard and Admin shells are **not** wrapped — one crash in a hub tears the whole authenticated view down to root fallback.

## 4. Consistency

- **Service-layer bypass**: 200 UI files vs 10 service files (95% direct-call ratio). No enforcement lint.
- **Loading states**: mix of `<Loader2>` spinners, shadcn `Skeleton`, and bare nulls across dashboard pages.
- **i18n leakage** — files with the most inline Arabic literals outside `t()`:
  ```text
  360 ContractDetail.tsx            256 DashboardRentals.tsx
  240 DashboardContracts.tsx        194 DashboardAiCenter.tsx
  172 LegacySingleRowEnrichment.tsx 163 ProviderJoin.tsx
  158 DashboardSites.tsx            157 Quote.tsx
  152 DashboardBadge.tsx            151 AdminContactMessages.tsx
  ```
  Pattern is usually `{isRTL ? 'ع' : 'en'}` literals — should go through `translations` or at least `<Bi>` from `src/components/common/Bilingual.tsx`.

## 5. Frontend security

- **Cache-clear on signout**: OK. `AuthContext.resetForUser` + `signOut` both call `queryClient.clear()`, and account-switch cache isolation is covered by tests.
- **localStorage**: audited keys are non-sensitive (language, saved searches, compare selection, recent routes, sidebar favorites, onboarding draft, lockout counter, chat draft). No tokens, PII, or role data stored client-side. ✅
- **`dangerouslySetInnerHTML`**: every project call site already routes through `sanitizeBlogHtml` / `sanitizeSvgMarkup` / `sanitizeBadgeHtml`. The only unsanitized one is `src/components/ui/chart.tsx:70` — that's shadcn's CSS-vars string (recharts theme), built from a typed `config` object, not user input. ✅

## Phased Plan (safest → riskiest, each independently smoke-testable)

### Phase B1 — Silent-catch triage (zero UI risk)
Replace `catch {}` / `catch { /* ignore */ }` with a shared `logDiag('warn', ...)` helper in **non-UI** paths only (services, hooks). Keep behavior identical (no toast added yet). Target ~60 sites in `src/hooks` + `src/services`. Add a lint-style vitest that greps for bare-empty catches in those two folders.
**Smoke test**: build + existing vitest suite; nothing user-visible changes.

### Phase B2 — Lazy-load heavy libs
Convert the 4 heavy libs to dynamic imports at their call sites:
- Wrap all `recharts` chart components in `React.lazy` + `<Suspense fallback={<Skeleton/>}>`.
- Move `jspdf` + `jspdf-autotable` behind `await import(...)` inside the export functions.
- Move `qrcode` behind `await import(...)` in `lib/badge/qr.ts` and the three call sites.
- Move `leaflet` behind `React.lazy` for `LocationPicker` + `SearchMapV3`.
**Smoke test**: open each affected page (dashboard overview, installments, admin activity, rentals analytics, badge, sites map, search map) and confirm charts/PDF/QR/map render.

### Phase B3 — ErrorBoundary coverage
Wrap the three main shells:
- `DashboardLayout` (or the `dashboard/*` outlet) in an `<ErrorBoundary>`.
- `AdminLayout` outlet in an `<ErrorBoundary>`.
- `ContractDetail` (largest page, highest crash blast radius) in a page-local boundary.
No new components; reuse existing `ErrorBoundary`. Add a test asserting each layout renders an `ErrorBoundary` in its tree.
**Smoke test**: throw in a stub child, confirm boundary catches without unmounting nav.

### Phase B4 — Shared query hooks for the 3 hottest duplicated fetches
Extract to `src/services/`:
- `useMyBusiness(userId)` — currently redone in ~20 pages.
- `useMyRoles(userId)` — duplicated alongside `AuthContext.roles` in several admin pages.
- `useMyMembership(userId)` — duplicated in dashboard hubs.
Migrate call sites in a follow-up (don't touch UI here — just introduce hooks + one pilot page: `DashboardOverview`).
**Smoke test**: pilot page still renders identical data; unit test on the new hooks.

### Phase B5 — Formatting + i18n literal cleanup (top 5 offenders)
Pure text substitution — no logic change:
- Replace inline `toLocaleString` with `fmtNum/fmtDate/fmtCurrency` in `ContractDetail`, `DashboardInstallments`, `DashboardContracts`.
- Replace inline `{isRTL ? 'ع' : 'en'}` literals with `<Bi>` / `useBi()` in the top 5 files from §4. Do NOT add new `translations` keys yet — that's a separate content pass.
**Smoke test**: language toggle on each touched page; visual diff.

### Phase B6 — Component extraction (largest files only)
Split — imports-only, no behavior change — the two biggest:
- `ContractDetail.tsx` (3425 LOC) → extract per-tab sections (`ContractHeader`, `ContractPartiesPanel`, `ContractMilestonesPanel`, `ContractFinancialsPanel`, `ContractDocumentsPanel`).
- `DashboardContracts.tsx` (3190 LOC) → extract list rows + filter bar + KPI strip.
Everything stays under the same route, same props, same queries. Snapshot/route tests unchanged.
**Smoke test**: contract detail + contracts list render; e2e navigation spec passes.

### Explicitly out of scope
- No DB / RPC / edge-function changes.
- No route path or route-guard changes (Phase-C decisions on `register-entity`, `business-draft`, `ai-center` remain pending).
- No new i18n translation keys or admin/permissions changes.
- No package additions.

Each phase is one PR-sized change, individually revertible, and can ship in the order listed.
