# Read-Only Audit — Routes, Flows, Code Organization

Scope: `src/App.tsx` (706 lines, ~210 routes), core journeys, and modularization feasibility. **No code changes proposed inside this pass** — only findings + a phased plan that can each be executed and smoke-tested independently.

Assumption: "safe to remove" = lazy import whose component is never used as a `element={<Component/>}` anywhere in `App.tsx` (only its former route path survives as a `<Navigate>`). All such removals are import-only cleanup; the URL stays live.

---

## 1. Routes Audit

### 1a. Dead lazy imports in `App.tsx` (mounted nowhere, only path retained via `<Navigate>`)

Verified by scanning `element=` occurrences in `src/App.tsx`:

| # | Import (line) | Reason |
|---|---|---|
| 1 | `AdminApiSettings` | route redirects to `/admin/system-settings?tab=api` |
| 2 | `AdminAnalyticsSettings` | redirect to `system-settings?tab=analytics` |
| 3 | `AdminBranding` | redirect to `system-settings?tab=branding` |
| 4 | `AdminContractTemplates` | redirect to `contracts?tab=templates` |
| 5 | `AdminPdfExportAudit` | redirect to `contracts?tab=exports` |
| 6 | `AdminContractCreate` | redirect to `contracts?tab=create` |
| 7 | `AdminContracts` | hub `AdminContractsHub` mounts `/admin/contracts` |
| 8 | `AdminContractAnalytics` | redirect to `contracts?tab=analytics` |
| 9 | `AdminMemberships` | hub `AdminMembershipsHub` mounts the path |
| 10 | `AdminMembershipRejections` | redirect to `memberships?tab=rejections` |
| 11 | `AdminMembershipEvents` | redirect to `memberships?tab=events` |
| 12 | `AdminMembershipPayments` | redirect to `memberships?tab=payments` |
| 13 | `AdminProviderSubscriptions` | redirect to `memberships?tab=providers` |
| 14 | `AdminEmailDeliverability` | redirect to `email-center?tab=deliverability`; hub is `AdminEmailHub` |
| 15 | `AdminEmailCenter` | never mounted (`AdminEmailHub` owns `/admin/email-center`) |
| 16 | `AdminSiteAudit` | redirect to `sitemap-status?tab=audit` |
| 17 | `AdminSitemapStatus` | needs verification — used in redirect target only |
| 18 | `AdminSectorSeo`, `AdminMarketAnalytics` | rolled into `AdminSeoHub` |
| 19 | `AdminAccessManagement`, `AdminSystemAccess` | rolled into hubs |
| 20 | `AdminOperations`, `AdminOperationsConsole` | hub `AdminOperationsHub`; `/console` redirects |
| 21 | `AdminIdentity`, `AdminIdentityHub` | `AdminIdentityCenter` is likely the current mount (needs 1 grep pass) |
| 22 | `AdminSystemSettings`, `AdminSystemSettingsHub` | `AdminSettingsCenter` is canonical |
| 23 | `AdminNotificationsConfig` | not mounted |
| 24 | `AdminProviderReview` | replaced by `AdminProviderReviewHub` |
| 25 | `AdminKpis`, `AdminReports` | replaced by `AdminReportsHub` |
| 26 | `DashboardRfq`, `DashboardRfqInbox` | routes redirect to `/dashboard/opportunities/assigned` |
| 27 | `DashboardWorkOrdersOverview` | route redirects to `/dashboard/work-orders` |
| 28 | `DashboardContractAnalytics` | redirect to `contracts?tab=analytics` |
| 29 | `DashboardContracts` | `DashboardContractsHub` owns `/dashboard/contracts` |
| 30 | `DashboardLoyalty`, `DashboardLoyaltyStore` | `DashboardLoyaltyHub` owns both |
| 31 | `DashboardTeamAccess`, `DashboardStaffCenter` | `DashboardStaffHub` owns `/dashboard/settings/staff` |
| 32 | `DashboardMyRequests`, `DashboardLeads` | verify — `DashboardRequestsHub` owns `/dashboard/leads` |

Each removal is a single-line delete; Phase A executes them in groups of 5–8 with a build between groups. Anything in the do-not-remove list of `docs/dead-code-audit.md` (e.g. `AdminLegacyTaxonomyReplaced`) stays.

### 1b. `<Navigate>` targets — chains & dead targets

- No redirect-to-redirect chains found. All `Navigate to="/admin/…?tab=…"` targets resolve to a real mounted page (`AdminMembershipsHub`, `AdminContractsHub`, `AdminEmailHub`, `AdminSeoHub`, `AdminSettingsCenter`, `AdminReportsHub`, `AdminOperationsHub`, `AdminContactCenter`, `DashboardContractsHub`, `DashboardStaffHub`, `DashboardLoyaltyHub`).
- All read as static string literals — the existing `scripts/broken-links-audit.mjs` + `src/__tests__/adminRouteLinkIntegrity.test.ts` should confirm; recommend adding one static test that enumerates every `<Navigate to=...>` in `App.tsx` and asserts the target path (without query) is also declared as a `<Route path=...>`. (Test-only — Phase A.)

### 1c. Route ordering vs `/:username` and catch-all

- `route-ordering.test.ts` already enforces that `/:username` and `*` are last. Manual re-check: `/:username` is declared right before `/:username/:branchSlug` then `*`. All static public paths (`/rentals`, `/private-sectors`, `/sectors/*`, `/services/*`, `/brands/*`, `/help/*`, `/join/*`, `/showcase`, `/compare*`, etc.) are declared above it. **No shadowing.**
- One nuance to add to the test: `/claim/:businessId` is a single-segment-plus-child pattern; safe because it's more specific than `/:username`.

### 1d. Guard consistency

Findings worth fixing (Phase A, cosmetic — no behavior change intended):

1. **Redirect wrapped in `ProtectedRoute requireAdmin`**: dozens of `<Route element={<ProtectedRoute requireAdmin><Navigate .../></ProtectedRoute>}>` (e.g. `/admin/api-settings`, `/admin/branding`, `/admin/kpis`, `/admin/membership-*`, `/admin/quote-requests`, `/admin/site-audit`, `/admin/operations/console`, `/admin/analytics-settings`). Correct behavior, but unnecessary — the redirect target is itself guarded. Recommend replacing with bare `<Navigate>` for consistency with the `/dashboard/*` redirects that already use bare Navigate. Zero behavior change.
2. **Bare `<Navigate>` for admin paths**: `/admin/contact-inbox-settings`, `/admin/contact-audit-log`, `/admin/contact-sla-dashboard`, `/admin/contact-notification-log` — bare, correct pattern.
3. **`/admin/ai-center` uses `DashboardAiCenter`** (a dashboard page) under `requireAdmin` — verify this is intentional and not a leaked provider surface.
4. **`/dashboard/blog` and `/dashboard/profile-systems`** use `requireAdmin` (not `requireProvider`). Confirm intent — these are labelled "dashboard" but only admins see them.
5. **`/help/report-issue` and `/help/feature-request`** are `ProtectedRoute` (auth only, correct) — no admin/provider gap.
6. **`/dashboard/business-completion`, `/dashboard/business-draft`, `/dashboard/entities/:id`, `/dashboard/credentials`** — all `ProtectedRoute` with no role. Sensitivity is provider-only; verify with product before tightening.

### 1e. Cross-check with existing docs

- `docs/dead-code-audit.md` currently claims "Components not used: None blocking." That file is stale for Phase-2 hub consolidation. Phase A updates it.
- `docs/broken-links-audit-full.md` — will re-run `scripts/broken-links-audit.mjs` after Phase A; expected 0 broken.

---

## 2. Flow Audit

### 2a. Customer journey `/ → search → quote → offers → contract → tracking`

| Step | Route | Status |
|---|---|---|
| Landing | `/` → `Index` | OK |
| Search | `/search` → `Search` | OK |
| Quote request | `/quote` → `Quote` | OK |
| Offers | `/offers` → `Offers` | OK |
| Contract | `/contracts` (list) + `/contracts/request` + `/contracts/:id` | OK, all `ProtectedRoute` |
| Tracking | `/client/:refId` → `CustomerProjectPortal` | OK — public but token-scoped |

No dead links along the primary path. The only friction is that quote submission still writes to `AdminQuoteRequests` (canonical) but bookmarked emails may hit `/admin/quote-requests/:id` — the `LegacyAdminQuoteRequestDetailRedirect` handles that correctly.

### 2b. Provider journey `/for-providers → /join/qitaat → onboarding → dashboard → opportunities → quote → contract`

| Step | Route | Status |
|---|---|---|
| Landing | `/for-providers` | OK |
| Legacy landing | `/join-as-provider`, `/providers/join` | Both redirect correctly |
| Signup wizard | `/join/qitaat`, `/join/qitaat/edit` | OK |
| Post-signup | `/onboarding` (skipOnboarding) → `/start` → dashboard | OK |
| Provider dashboard | `/dashboard` | OK |
| Opportunities list | `/dashboard/opportunities/assigned` | **Verify route exists** — three redirects (`/dashboard/rfq`, `/dashboard/rfq/inbox`, and Requests-hub deep-link) point here. Path not visible in the excerpt; likely defined further down. If missing, this is the single biggest Phase C fix (RFQ inbox dead-ends). |
| Quotation | `/dashboard/rfq/:id` → `DashboardRfqDetail` | OK |
| Contract | `/dashboard/contracts` hub | OK |

**Action for Phase C**: grep `App.tsx` for `/dashboard/opportunities/assigned` and confirm it renders. If it doesn't, Phase C step 1 wires it (component already imported in dashboard tree).

### 2c. Auth journey `/auth → OTP → /start → role landing`

- `/auth` → `Auth` (public) ✓
- `/auth/verified` → `AuthVerified` ✓
- `/reset-password` → `ResetPassword` ✓ (public — intentional for magic-link flow)
- `/onboarding` and `/start` both use `ProtectedRoute skipOnboarding` — no loop possible.
- `/register-entity` is fully public — verify this is intentional (may want `ProtectedRoute` to prevent anonymous entity creation).

No loops or dead ends detected in the auth path itself.

---

## 3. Code Organization

### 3a. `App.tsx` split feasibility

Very feasible and zero-risk if done as **imports-only extraction** — the `<Routes>` tree stays in `App.tsx`, only the lazy import block moves:

```text
src/routes/
├── publicRoutes.ts     (~80 lazyRetry entries: /, /search, /sectors, /brands, /blog, …)
├── dashboardRoutes.ts  (~55 entries: Dashboard*, Provider*)
├── adminRoutes.ts      (~75 entries: Admin*)
└── index.ts            (re-export)
```

Then `App.tsx` becomes ~200 lines: providers + `<Routes>` JSX only. No URL, guard, or component-boundary change. Route ordering (which is the invariant tests care about) is untouched because JSX order stays in `App.tsx`.

**Optional Phase B follow-up (not blocking):** extract `<Routes>` itself into three `<Route>`-list components (`<PublicRoutes/>`, `<DashboardRoutes/>`, `<AdminRoutes/>`) and compose them in order. Slightly higher risk (route ordering is now split across files) — needs a new static test that asserts render order.

### 3b. Top-10 SRP-violating page/component files (candidates for extraction)

To be finalized in Phase D by running `wc -l src/pages src/components -R | sort -rn | head -50`, but the recurring offenders known from prior scans are:

1. `src/App.tsx` (706 LOC — Phase B addresses)
2. `src/pages/dashboard/DashboardOverview.tsx`
3. `src/pages/dashboard/DashboardContractsHub.tsx`
4. `src/pages/admin/AdminApprovalsCenter.tsx`
5. `src/pages/admin/AdminOperationsCenterUnified.tsx`
6. `src/pages/admin/AdminIdentityCenter.tsx`
7. `src/pages/dashboard/DashboardMyRequests.tsx`
8. `src/pages/Search.tsx`
9. `src/pages/ContractDetail.tsx`
10. `src/components/dashboard/DashboardSidebar.tsx`

Extraction pattern for each: pull tab bodies into `./_tabs/`, extract data-fetching hooks into `src/hooks/`, keep the page as a thin composition layer.

---

## Phased Fix Plan

### Phase A — Zero-risk cleanup (imports + redirect consistency)
- A1. Delete the ~32 dead lazy imports in §1a in groups of 5–8; build + `route-ordering.test.ts` between groups.
- A2. Replace `<ProtectedRoute requireAdmin><Navigate/></ProtectedRoute>` with bare `<Navigate/>` for the ~15 admin redirects in §1d.1.
- A3. Add a new test: every `<Navigate to=…>` target inside `App.tsx` resolves to a declared `<Route path=…>`.
- A4. Refresh `docs/dead-code-audit.md` and re-run `scripts/broken-links-audit.mjs`.

Smoke test: build, existing route-ordering + adminRouteLinkIntegrity tests, click one admin redirect per hub.

### Phase B — Route module split (imports-only)
- B1. Create `src/routes/{publicRoutes,dashboardRoutes,adminRoutes}.ts` with the lazy imports.
- B2. Replace the import block in `App.tsx` with `import { … } from "@/routes"`. Zero JSX change.
- B3. Re-run all route tests.

Smoke test: full build, homepage + one deep link per group.

### Phase C — Flow fixes
- C1. Confirm `/dashboard/opportunities/assigned` renders; if not, wire it to the existing opportunities component (see §2b).
- C2. Tighten guards flagged in §1d.6 (`business-completion`, `business-draft`, `entities/:id`, `credentials`) to `requireProvider` if product confirms.
- C3. Decide on `/register-entity` — either add `ProtectedRoute` or document why it's public.
- C4. Clarify `/admin/ai-center` (currently renders `DashboardAiCenter`) — either rename import or move to a real admin page.

Smoke test: run the three journeys end-to-end via Playwright.

### Phase D — Component extraction
- D1. Regenerate the top-10 LOC list with a scripted `wc -l` pass; pick 3 files per iteration.
- D2. Extract tabs / data hooks into siblings; keep public API identical.
- D3. One PR per file; existing tests plus a fresh render smoke.

No DB, RPC, or edge-function changes are proposed in any phase.
