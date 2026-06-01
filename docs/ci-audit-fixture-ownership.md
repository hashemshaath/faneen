# CI Audit Fixture Ownership

This document maps every CI audit fixture to the runtime feature it protects and the rule for keeping it current. When a component is renamed, moved, or removed, update the fixture per the rule below before merging.

## `scripts/jsonld-snapshot-audit.mjs`

Fixtures live in `scripts/jsonld-snapshots/index.json`. Each key is a source file expected to emit specific JSON-LD `@type` blocks.

| Fixture path | Protects | Owner | Replacement rule |
|---|---|---|---|
| `src/pages/Index.tsx` | WebSite + Organization + SearchAction on home | Marketing / SEO | If split, move fixture to new home shell. |
| `src/pages/BusinessProfile.tsx` | LocalBusiness + AggregateRating | Providers team | If renamed, repoint; covers provider directory JSON-LD. |
| `src/pages/BlogPost.tsx` | BlogPosting + BreadcrumbList | Content / Blog | Repoint on rename. |
| `src/pages/ProjectDetail.tsx` | CreativeWork + BreadcrumbList | Projects | Repoint on rename. |
| `src/pages/ProfileSystemDetail.tsx` | Product + BreadcrumbList | Profile systems | Repoint on rename. |
| `src/pages/About.tsx` | Organization + BreadcrumbList | Marketing | Repoint on rename. |
| `src/pages/Categories.tsx` | CollectionPage + BreadcrumbList | Catalog | Repoint on rename. |
| `src/pages/Search.tsx` | ItemList + BreadcrumbList | Search / Discovery | **Also covers provider directory listing** (since `TopProvidersSection.tsx` was removed). |
| `src/pages/Contact.tsx` | BreadcrumbList | Marketing | Repoint on rename. |
| `src/pages/Offers.tsx` | BreadcrumbList | Promotions | Repoint on rename. |
| `src/pages/Privacy.tsx` | FAQPage | Legal | Repoint on rename. |
| `src/pages/Terms.tsx` | FAQPage | Legal | Repoint on rename. |

### Removed fixtures (do not restore)

| Removed fixture | Reason | Replacement owner |
|---|---|---|
| `src/components/home/TopProvidersSection.tsx` | Component deleted during home-page dead-code cleanup. | Provider directory JSON-LD is now covered by `src/pages/Search.tsx` (ItemList) and `src/pages/BusinessProfile.tsx` (LocalBusiness). |

## `scripts/sitemap-integrity-audit.mjs` + `scripts/robots-sitemap-sync-audit.mjs`

Canonical sitemap types live in `supabase/functions/sitemap/index.ts` and **must mirror** `public/sitemap.xml`.

Current canonical types: `static`, `sectors`, `services`, `businesses`, `blog`, `categories`, `cities`, `profiles`, `projects`, `brands`, `help`.

Rule: when adding a new type to the edge function, add a matching `<loc>` line in `public/sitemap.xml` in the **same PR**. The guard test `src/tests/ciLegacyDriftRepair1.test.ts` asserts `help` is present; extend it when adding more.

## `scripts/broken-links-audit.mjs`

Compares hard-coded `to=`/`href=` paths against `src/App.tsx` route table. When renaming a route, update the route table and every consumer in the same PR.

## `scripts/brand-audit.mjs`

Forbids legacy strings: `faneen`, `Faneen`, `FANEEN`, `فنيين`, `فنين`, `faneen.com`, `faneen.lovable`.

Allow-listed exceptions:
- `src/main.tsx::cleanupLegacyFaneenStorage` (one-time migration code)
- `scripts/brand-audit.mjs` itself
- `src/tests/supabaseDatabaseDeepRepair1.test.ts` (guard regex)

## Update protocol

1. Rename / move / delete a component or page → run the relevant audit locally.
2. Audit fails → either repoint the fixture or remove it and document the replacement owner above.
3. Add or update a guard assertion in `src/tests/ciLegacyDriftRepair1.test.ts` when introducing new invariants.
4. Never delete a JSON-LD fixture without naming the replacement page that emits the equivalent schema.