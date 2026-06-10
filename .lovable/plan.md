## SEARCH PAGE V3 — FULL REBUILD (DIRECT REPLACEMENT)

### Scope guard
- Touches only: `src/pages/Search.tsx`, `src/components/search/**`, `src/services/search/useSearch.ts` (no signature changes), search tests.
- **Not touched**: DB, RLS, taxonomy module, routes, business profile route, RFQ, Home, `/ajanetworking`, assets, favicons, `useSearch` query shape, `useDirectoryRealtimeInvalidation`, taxonomy display batch hook, SEO/JSON-LD logic.

### Strategy
Rebuild the **UI layer** from scratch (page + presentational components). **Keep** the data layer (`useSearch.ts`, taxonomy integration, SEO/JSON-LD) intact — it was just stabilised by the Live Data fix and is already enforced by many CI guards (taxonomy regression, doors-architecture, usernameResolver-freshness, etc.). Replace `/search` directly; no flag, no parallel route.

### Files — new (V3)
- `src/pages/SearchV3.tsx` — new page shell (replaces `Search.tsx` content; the file `Search.tsx` becomes a thin re-export so router doesn't change).
- `src/components/search/v3/SearchHeaderV3.tsx` — sticky bar: logo nav + big search + sort + share + mobile filter trigger.
- `src/components/search/v3/SearchFiltersV3.tsx` — desktop sidebar (sticky).
- `src/components/search/v3/MobileFiltersSheet.tsx` — mobile Sheet/Drawer (inline, no popup violation — bottom sheet pattern already used elsewhere).
- `src/components/search/v3/ActiveFiltersBarV3.tsx` — chips + clear all.
- `src/components/search/v3/SearchResultsV3.tsx` — grid/list switch, pagination footer.
- `src/components/search/v3/SearchResultCardV3.tsx` — new card design using `getBusinessProfileHref`, `<VerifiedBadge>`, `<Bi>`, taxonomy display map, `dir="auto"`.
- `src/components/search/v3/SearchSkeletonV3.tsx`, `SearchEmptyStateV3.tsx`, `SearchErrorStateV3.tsx`.

### Files — kept (data + cross-cutting)
- `src/services/search/useSearch.ts` — unchanged.
- `src/modules/taxonomy/search-integration.ts` — unchanged.
- `src/lib/business/profileHref.ts` — unchanged.

### Files — removed after replacement (no longer imported)
- `src/components/search/SearchHeader.tsx`
- `src/components/search/SearchFilters.tsx`
- `src/components/search/SearchResults.tsx` + `SearchResults.integration.test.tsx` (rewritten as V3 integration test)
- `src/components/search/BusinessCard.tsx` + `BusinessCard.test.tsx` (rewritten as V3 card test)
- `src/components/search/ActiveFilterChips.tsx`
- `src/components/search/SearchResultsSkeleton.tsx`
- `src/components/search/SearchPagination.tsx`
- `src/components/search/SearchMap.tsx` — V3 drops the map view (heavy, not in spec)
- `src/components/search/SearchInsightsBar.tsx`
- `src/components/search/SavedSearchesBar.tsx` (kept only if referenced outside search; check before delete)
- `src/components/search/RecentlyViewedStrip.tsx` (same — check)

### Files — kept inside search/
- `SearchAutocomplete.tsx` (reused inside `SearchHeaderV3`; already canonical input).
- `index.ts` re-exports updated.

### View modes
V3 ships **grid + list only**. Map/split removed (spec: "لا maps/charts/heavy libraries"). URL `view` param accepts `grid|list`; old `map`/`split` values normalize to `grid` for back-compat.

### Filters retained (canonical taxonomy only)
query, city, region, category (sector), serviceCategory, verifiedOnly, minRating, sort, clear-all. Price range + favorites dropped from V3 UI (still respected if URL param present — to avoid breaking shared links).

### Card V3 rules (enforced by new tests)
- Link via `getBusinessProfileHref(business)` only — never `/q/...`.
- Name: `<span dir="auto">`.
- Verified: `<VerifiedBadge />`.
- Primary activity + ≤3 secondary chips from `taxonomyDisplayMap`; never raw slug; never literal `غير مصنّف` (filter it out at render).
- Phone/website/code: `.tech-content` + `dir="ltr"`.
- Latin digits via `fmtNum`.
- Two CTAs: "عرض الملف / View profile" (primary, links to profileHref) + "تواصل / Contact" (links to `${profileHref}#contact`).

### Data freshness
- Reuses fixed invalidation (Live Data PASS). No new staleTime changes.
- V3 page calls `useDirectoryRealtimeInvalidation()` (kept) — fresh after edit, no hard refresh.

### Tests
New / replaced:
- `src/components/search/v3/__tests__/SearchResultCardV3.test.tsx` — href uses `getBusinessProfileHref`; no `/q/`; no `غير مصنّف`; no raw slug; verified badge bilingual; dir=auto on name; LTR on phone.
- `src/components/search/v3/__tests__/SearchResultsV3.test.tsx` — loading/empty/error/results states, retry button, pagination.
- `src/pages/__tests__/searchV3.page.test.tsx` — `/search` renders; query param drives input; filter change updates URL; clear-all resets URL; mobile sheet opens.
- `src/components/search/v3/__tests__/searchV3.noLegacy.test.ts` — static guard: V3 source contains no `/q/`, no `'غير مصنّف'`, no raw slug literals.
- Update `e2e/search.spec.ts` to assert grid/list buttons (drop map/split assertions).

Kept guards (must stay green):
- publicAssetsAudit, doors-taxonomy-architecture, taxonomy regression sweep, provider-taxonomy E2E files, business-profile-direction, form-controls-direction-hygiene, usernameResolver-freshness, homepage.integrity, Phase 5C-4 / 5C-5 bilingual guards, scope-numbers-policy.

### Sequencing (single PR, but ordered commits in one apply pass)
1. Add new V3 components + page (no router change yet — `SearchV3` exported but unused).
2. Add new tests; run vitest scoped to search + v3 + freshness.
3. Flip `src/pages/Search.tsx` to re-export `SearchV3`.
4. Delete old components confirmed unused via `rg`.
5. Update `src/components/search/index.ts` exports.
6. Run full `bunx vitest run` + `tsc --noEmit`.
7. Manual QA on preview: `/search`, `/search?q=aja`, `/search?city=...`, `/ajanetworking` link from a result, 390 px mobile, RTL+LTR.

### Risk acknowledgement
This is a large change touching ~12 files and removing ~10. The legacy data hook is intentionally preserved to avoid regressing the live-data fix and all taxonomy guards. Map/split/insights/saved-searches/recently-viewed are dropped from V3 by design (spec excludes heavy libs and demands a clean rebuild).

### Decision criteria
PASS only if: `/search` renders new design, all kept guards green, new V3 tests green, `tsc --noEmit` clean, no `/q/` in card hrefs, no `غير مصنّف` rendered, manual QA on 390 px + desktop + `/ajanetworking` opens from a result.
