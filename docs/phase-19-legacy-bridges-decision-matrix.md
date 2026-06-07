# Phase 19 — Legacy Taxonomy Bridges: Decision Matrix

_Scan date: 2026-06-07. Scope: final bridges remaining after Phases 18f–18i._

## 1. Decision Matrix

| Bridge | Runtime usage today | DB rows | Decision | Reason |
|---|---|---|---|---|
| `public.categories` table | Edge only: `sitemap`, `admin-enrichment-enhance`, `run-site-audit`. Zero frontend `from('categories')` calls. | 22 | **KEEP for now** | SEO sitemap & admin enrichment still query it. Drop requires Edge migration to `taxonomy_categories` first. Not in scope for Phase 19. |
| `public.tags` + `public.entity_tags` | Frontend Search: `src/services/search/useSearch.ts:259` joins entity_tags for business tag facets. | 15 / 19 | **KEEP for now** | Active Search runtime dependency. Cannot drop without first re-modelling these as `taxonomy_categories(type=search_tag)` or as `taxonomy_aliases`. Recommended follow-up = Phase 19b. |
| `showcase_submissions.sector_slug` | Read-only fallback in `Showcase.tsx` (OR filter) + dead field in `DashboardShowcase.tsx` interface. Already NOT written by any UI (Phase 17). | 0 (table empty) | **DROP NOW** | Table empty + every code path has a taxonomy equivalent. Index `showcase_submissions_sector_idx` drops with it. |
| `quote_requests.sector` | Admin UI display/filter (`AdminQuoteRequests`, `AdminQuoteRequestDetails`, `AdminQuoteOperations`). Edge `match-quote-request` still routes on it via `LEGACY_SECTOR_TO_TAXONOMY_SLUG`. | 0 | **KEEP (explicit user directive)** | Removing requires schema migration to `taxonomy_category_id` on `quote_requests` + Edge function rewrite. Out of scope for Phase 19. |
| `SECTORS_SEO` / `SECTOR_KEYWORDS` (`src/lib/sectors-seo.ts`, `src/lib/sector-keywords.ts`) | SEO URL guard for `/sectors/:slug`, sitemap inputs, `SectorSeoLanding`, `SectorCity`, `SectorsHub`, market analytics labels. | n/a (static) | **KEEP (explicit user directive)** | Acts as the canonical URL allow-list. `useSectorTaxonomy` overlays taxonomy meta on top — both must stay until the sitemap edge function pulls 100% from `taxonomy_categories`. |

## 2. Executed in Phase 19

- ✅ `showcase_submissions.sector_slug` dropped (column + dependent index).
- ✅ `Showcase.tsx` simplified to taxonomy-only filter (OR fallback removed).
- ✅ `DashboardShowcase.tsx` `Submission.sector_slug` field removed.

## 3. Not executed (accepted risk / out of scope)

- `categories` table — pinned by 3 edge functions.
- `tags` / `entity_tags` — pinned by Search runtime.
- `quote_requests.sector` — user directive: do not drop in Phase 19.
- `SECTORS_SEO` / `SECTOR_KEYWORDS` — user directive: keep as static URL guard.

## 4. Verification

- TypeScript / Build: clean (regenerated `types.ts` no longer exposes `sector_slug` on `showcase_submissions`).
- Search / Showcase / SEO routes: unchanged behaviour (showcase had 0 rows; OR fallback was already dead).
- No RLS, Storage policy, or Edge Function modified.

## 5. Last step before legacy taxonomy can be declared fully closed

Two follow-up phases remain, in priority order:

1. **Phase 19b — Search tags migration**: re-implement business search tag facets on `taxonomy_categories(type='search_tag')` or `taxonomy_aliases`, then drop `tags` + `entity_tags`.
2. **Phase 19c — SEO/Edge categories cutover**: rewrite `sitemap`, `admin-enrichment-enhance`, and `run-site-audit` against `taxonomy_categories`, then drop `public.categories`.

`quote_requests.sector` and `SECTORS_SEO/SECTOR_KEYWORDS` remain as accepted long-term shims unless a separate explicit cleanup is requested.
