# Legacy Taxonomy — Final Closeout

Status: **CLOSED**. Phases 18a–19c complete. This document is the official
seal on the legacy taxonomy system. No new work should reopen it except to
extend the unified taxonomy itself or improve the taxonomy admin center.

## What was removed

### Database (dropped)
- Table `public.categories` (Phase 19c, `DROP ... CASCADE`)
- Table `public.tags` (Phase 19b)
- Table `public.entity_tags` (Phase 19b)
- Column `businesses.category_id` (Phase 18i)
- Column `businesses.sectors` (Phase 18h)
- Column `businesses.sub_services` (Phase 18h)
- Column `business_services.category_id` (Phase 18i)
- Column `projects.category_id` (Phase 18i)
- Column `showcase_submissions.sector_slug` (Phase 19)
- FK constraints from `contract_templates`, `contracts`, `private_sectors`,
  `brand_products`, `brand_product_requests` to `public.categories`
  (cascaded with the table drop; the `*_category_id` columns are preserved
  on those tables as opaque historical references only)

### Code (removed runtime usage)
- All `supabase.from('categories' | 'tags' | 'entity_tags')` calls in
  `src/**` and `supabase/functions/**` (excluding migrations and the
  generated `types.ts`)
- Tag chips/filters in Search (`useSearch`, `SearchFilters`,
  `ActiveFilterChips`)
- `sectors` / `sub_services` form fields in business edit screens
- Showcase `sector_slug` reads/writes
- Edge functions `sitemap` and `admin-enrichment-enhance` rewritten
  against `taxonomy_categories`
- `previewServiceCategoryTaxonomyMapping` reduced to a no-op stub

## Single source of truth (current taxonomy)

| Concern | Table |
| --- | --- |
| Taxonomy roots (sectors, categories, search tags…) | `taxonomy_types` |
| Taxonomy nodes | `taxonomy_categories` |
| Business ↔ taxonomy | `business_taxonomy_categories` |
| Service ↔ taxonomy | `business_service_taxonomy_categories` |
| Project ↔ taxonomy | `project_taxonomy_categories` |
| Contract ↔ taxonomy | `contract_taxonomy_categories` |
| Backfill / id resolution map | `taxonomy_legacy_mappings` |

Public-facing aggregates live in the view `category_public_counts`, which
was rebuilt on taxonomy in Phase 18i.

Standard filter for picker/search/SEO queries:

```
is_active = true
is_public = true
is_archived = false
show_in_seo = true OR show_in_search = true
```

## Intentionally retained (not legacy debt)

| Item | Why it stays |
| --- | --- |
| `SECTORS_SEO` constant | Static URL guard for `/sectors/:slug` (`aluminum`, `steel`, `wood`, `glass`, `stainless-steel`, `fabrication-installation`). Pure SEO map, no DB read. |
| `SECTOR_KEYWORDS` constant | Keyword expansion for SEO landing pages. No DB read. |
| `quote_requests.sector` column | Historical, immutable quote payload. Never written by current UI; only read for old records. Dropping it would erase audit history. |
| `taxonomy_legacy_mappings` table | Forward-looking backfill bridge; useful when importing or reclassifying. |

## Verification

- `public.categories` and `public.tags` / `public.entity_tags` are absent
  from `information_schema.tables` (Phase 19c migration verified via
  `to_regclass`).
- Runtime sweep: `rg "from\(['\"]categories['\"]\)"` returns only the
  guard test itself and inert migration history.
- Search, Showcase, Projects, Contracts, BrandsCatalog, Sitemap, and
  Admin Enrichment all run against the taxonomy tables.

## Re-opening policy

Do **not** reintroduce any of the dropped tables or columns. The CI guard
test `src/tests/legacyTaxonomyClosure.test.ts` will fail the build if a
forbidden symbol reappears in runtime code. To extend categorization,
add nodes/types to `taxonomy_categories` / `taxonomy_types` instead.