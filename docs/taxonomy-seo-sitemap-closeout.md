# Taxonomy SEO / Sitemap — Closeout

Status: **CLOSED**. Companion note to `legacy-taxonomy-final-closeout.md`.
Documents the final verification that the categories sitemap is live on the
new taxonomy backend, with no code, DB, or edge security changes required.

## Root cause (resolved)

After Phase 19c dropped `public.categories`, the deployed `sitemap` edge
function was still the pre-Phase-19c build referencing `from('categories')`.
The source in `supabase/functions/sitemap/index.ts` had already been
rewritten against `taxonomy_categories`; only the deployment was stale.

Edge logs confirmed the symptom:

```
categories sitemap error: Could not find the table 'public.categories'
in the schema cache
```

## Action taken

- **Redeploy only** of the `sitemap` edge function.
- No code change, no migration, no RLS change, no edge-security change.

## Verified result

- `GET /functions/v1/sitemap?type=categories` → **HTTP 200**, valid
  `<urlset>` with **172 `<url>` entries** (86 taxonomy nodes × 2 URL
  shapes: `/categories/<slug>` and `/search?category=<id>`).
- 15 `primary_activity` sector nodes have complete SEO fields
  (`slug`, `name_ar/en`, `short_description_ar`, `description_ar`,
  `seo_title_ar`, `seo_description_ar`, `keywords_ar` 3–10, `icon`,
  `is_active`, `is_public`, `is_archived = false`).
- 86 taxonomy nodes qualify for search/SEO under the standard filter
  (`is_active AND is_public AND NOT is_archived AND (show_in_seo OR
  show_in_search)`).
- No seed or migration was required — taxonomy SEO data was already
  complete after Phase 19c.

## Guards passing

| Guard | Status |
| --- | --- |
| `src/tests/legacyTaxonomyClosure.test.ts` | ✅ pass |
| `src/tests/phase18hLegacyColumnDrop.test.ts` | ✅ pass |
| `src/tests/phase18iLegacyCategoryIdDrop.test.ts` | ✅ pass |

## Not touched (by design)

- RLS policies
- Edge function security / `verify_jwt` config
- Search logic (`useSearch`, `SearchFilters`, ranking)
- `SECTORS_SEO` constant
- `SECTOR_KEYWORDS` constant
- Database schema (no migration in this closeout)
- Any other edge function

## Conclusion

Taxonomy SEO + sitemap is **closed**. Any future regression in the
categories sitemap should first be checked against the deployed edge
function version vs. the source in
`supabase/functions/sitemap/index.ts` before opening a new phase.
