# Admin Businesses Refactor — PR-1: Inventory & Safe Extraction Plan

_Status_: 📋 Planning. No code shipped in PR-1.
_Target file_: `src/pages/admin/AdminBusinesses.tsx` (**3,069 LOC** today)
_Goal_: bring `AdminBusinesses` under the governance contract
(`05-governance-and-migration.md`) without a single risky rewrite. Mirrors
the PR-by-PR recipe that successfully landed for `AdminUsers`
(2,790 → 1,858 LOC, 33% reduction, zero behavior regressions).

---

## 1. Why a multi-PR refactor

`AdminBusinesses` is the second-largest admin surface and the most
modeled (membership tier changes, provider-service status toggles, owner
linking by ref-id, national-address autofill, multi-branch map picker,
verification gating). It has the densest *side-effect graph* in the
admin codebase:

- 58 hook calls (`useState` / `useQuery` / `useMutation` / `useEffect`)
- Leaflet map picker mounted inline in the create + edit flows
- AI-assisted bilingual field actions (`FieldAiActions`)
- Cross-module mutations: `setBusinessMembershipTier`,
  `setProviderServiceStatus`, `notifyMembershipChangeForBusiness`,
  `sendTransactionalEmail`
- One `AlertDialog` (verify confirm) — the **only** allowed exception
  per UX rule (destructive confirm)
- A local `StatCard` that reinvents `<AdminKpiCard>`
- A local `LocationPicker` (~80 LOC) used by 3 different forms

A monolithic rewrite would defeat code review and risk breaking flows
that have no integration coverage. The plan below carves the page into
small PRs, **lowest risk first**, so the team can pause at any boundary
and still ship.

---

## 2. Current state — quick inventory

### Locally defined components

| Component        | Lines  | Role                                                 |
| ---------------- | ------ | ---------------------------------------------------- |
| `LocationPicker` | 142–   | Leaflet map picker; reused by create + edit + branch |
| `StatCard`       | 227–   | Reinvents `<AdminKpiCard>`                           |
| `AdminBusinesses`| 250–end| Default export — everything else                     |

### Already compliant

- ✅ Renders inside `<DashboardLayout>` (via `MaybeDashboardLayout`).
- ✅ Uses `<AdminPageHeader>` for the hero header.
- ✅ Uses `<Bi>` / `pickBi` for bilingual text (no inline `isRTL ? …`).
- ✅ Verify destructive flow uses `<AlertDialog>` (allowed exception).

### Gaps vs. governance contract

1. Does **not** compose `<AdminListPageTemplate>` — header, KPIs, filters,
   bulk bar and pagination are hand-rolled.
2. KPIs render via local `StatCard` instead of `<AdminKpiCard>`.
3. Filters are an ad-hoc card; should use `<AdminFiltersBar>` +
   `<SavedViewsMenu>`.
4. Status chips are bespoke `<Badge>` variants; should be
   `<AdminStatusBadge>`.
5. Create + Edit flows are inline blocks inside the page body — correct
   per "no popups" rule, but they should be **extracted** into siblings
   under `src/pages/admin/businesses/` to mirror the `users/` layout.
6. `LocationPicker` should move to `src/components/admin/LocationPicker.tsx`
   so the same primitive can be reused in branches + ops pages.

---

## 3. PR plan (lowest risk first)

| PR     | Scope                                                                                        | LOC moved | Risk |
| ------ | -------------------------------------------------------------------------------------------- | --------- | ---- |
| **PR-1** _(this doc)_ | Inventory + extraction plan. No code.                                            | 0         | None |
| **PR-2** ✅ shipped | **Dead-code removal**: local `LocationPicker` was never rendered. Deleted it along with `import L from 'leaflet'`, `leaflet/dist/leaflet.css`, and the leaflet icon-default mutation. Net: −59 LOC (3,069 → 3,010) and leaflet fully removed from this route's bundle (CWV win — see `mem://tech/performance/cwv-public-routes`). | ~60 removed | Low |
| **PR-3** ✅ shipped | Extracted `TIERS` constant, `reverseGeocode` helper, and `exportBusinessesCsv` into `src/pages/admin/businesses/_shared.tsx` with proper typed signatures (`TierMeta`, `ReverseGeocodeAddress`). Parent re-imports under the original local names to keep call sites untouched. Net: 3,010 → 2,972 LOC. | ~40 moved | Low |
| **PR-4 (table view)** ✅ shipped | Extracted the table-mode JSX (~85 LOC) into `businesses/BusinessTableView.tsx` as a memoized presentational component. Parent passes paged rows + selection state + callbacks (`onEdit`, `onOpenServices`, `translationCompleteness`). Net: 2,948 → 2,865 LOC. Card-mode view still inline — deferred to PR-4b. | ~85 moved | Med  |
| **PR-4b (card view)** ✅ shipped | Extracted the card-mode grid view (~160 LOC) into `businesses/BusinessCardView.tsx`. Same presentational pattern as PR-4: parent owns all mutations (tier, approval, verify toggle, active toggle) and passes them as callbacks. `BusinessCardRow` extends `BusinessTableRow` with `phone`, `email`, `approval_status`. Net: 2,865 → 2,727 LOC. | ~160 moved | Med  |
| **PR-5** ✅ already done | `BusinessFiltersToolbar` already extracted to `@/components/admin/businesses/BusinessFiltersToolbar` and adopted by the parent. No work needed. | 0 | None |
| **PR-6** ✅ shipped | Extracted the inline create panel (~330 LOC JSX + ~42 LOC owner-search `useEffect`) into `businesses/CreateBusinessPanel.tsx`. Child owns local UI state (owner-search dropdown, results, loading) while parent keeps `createForm` + `createBizMutation`. Removed dead `resolveOwner` callback and unused imports (`getProfileByEmail`, `getProfileByRefId`, `searchProfilesByOr`, `BilingualNameField`, `getProfileDisplayName`, 4 lucide icons). Net: 2,727 → 2,321 LOC. | ~410 moved | Med  |
| **PR-7** | Extract `EditBusinessPanel` (tabs: Profile, Owner, Membership, Services, Branches).         | ~750      | High |
| **PR-4 (early-win)** ✅ shipped | **Dead-code removal**: local `StatCard` was unreferenced (KPI tiles already use `<AdminKpiCard>`). Removed component + `TrendingUp` import. Net: 2,972 → 2,948 LOC. Defers the bulk `BusinessTable` extraction to PR-4-main. |
| **PR-8** | Governance pass — wrap shell in `<AdminListPageTemplate>`, bespoke badges → `<AdminStatusBadge>`. | ~200 | Low |

Each PR keeps **all** state + mutations in the parent (`AdminBusinesses`)
and passes them as props to the extracted child. This mirrors the
"controlled view" pattern that worked for `AdminUsers` — children stay
presentational, parent owns URL-param effects and mutation onError
routing.

---

## 4. Out of scope (deferred)

- Splitting `setBusinessMembershipTier` / `setProviderServiceStatus`
  call sites into a dedicated `businessAdminService.ts` — handled by
  the broader `businessService.ts` migration (see core memory).
- Replacing Leaflet with a lighter map — performance work, separate PR.
- Merging into `AdminApprovalsCenter` — explicitly forbidden by
  `mem://features/admin/unified-approvals-center`.

---

## 5. Definition of done (whole refactor)

- [ ] `AdminBusinesses.tsx` < 1,200 LOC.
- [ ] Shell is `<AdminListPageTemplate>`; KPIs are `<AdminKpiCard>`;
      filters use `<AdminFiltersBar>`; status chips use `<AdminStatusBadge>`.
- [ ] No `Dialog` / `Sheet` for primary flows; verify `AlertDialog`
      retained as destructive-confirm exception.
- [ ] `tsc --noEmit` ✅; zero `any`; no behavior regressions.

Next `next` starts **PR-2** (extract `LocationPicker`).