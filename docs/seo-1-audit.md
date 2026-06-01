# SEO-1 — Foundation Audit & Public-Safety Hardening

_First SEO pass after DB-GOVERNANCE-2. Audit-first; only safe fixes shipped._

## Pre-existing SEO foundation (verified intact)

- **`index.html`** — Arabic-first `<html lang="ar" dir="rtl">`, full title / description / keywords, canonical, `og:*`, Twitter card, `hreflang` (ar / en / x-default), robots `index, follow, max-image-preview:large`, GSC verification meta, CSP, JSON-LD Organization + WebSite blocks.
- **`public/robots.txt`** — explicit `Disallow` on `/admin/`, `/dashboard/`, `/auth`, `/onboarding`, `/reset-password`, `/forbidden`, `/unsubscribe`, `/s/`, `/q/`, `/profile/settings`, `/add-business/success`; explicit `Allow` for public surfaces; per-bot rules for Googlebot, GPTBot, ChatGPT-User, Claude-Web, PerplexityBot, Google-Extended, Applebot-Extended, cohere-ai; declares both `qitaat.com/sitemap.xml` and the edge function URL.
- **`public/sitemap.xml`** — `<sitemapindex>` fanning out into 10 typed sub-sitemaps served by `supabase/functions/sitemap`.
- **`supabase/functions/sitemap/index.ts`** — typed sub-sitemaps for `static`, `businesses`, `blog`, `categories`, `cities`, `profiles`, `projects`, `sectors`, `services`, `brands`, `help`.
- **`useNoIndex` hook** — confirmed applied across admin, dashboard, help-request, token-scoped, and bulk-triage pages (covered by existing tests: `platformDeepAuditRepair`, `helpCenterAdmin2`, `adminIdentityRedesign`, etc.).
- **`BusinessProfile.tsx`** — already emits `LocalBusiness` JSON-LD sourced from the trimmed `PUBLIC_BUSINESS_SELECT` (PERF-1D.3 / DB-GOVERNANCE-1).

## Findings

### P0 — Sitemap leaked non-published providers

The `businesses` sub-sitemap was filtering only on `is_active = true`. The public business view (`businesses_public`) requires three filters:

```
is_active = true
approval_status = 'published'
is_demo = false
```

The sitemap therefore could include pending / rejected / draft / demo providers — exposing URLs whose target pages should not be indexable. **Fixed** in `supabase/functions/sitemap/index.ts`:

```diff
-await supabase.from("businesses").select("username, updated_at").eq("is_active", true).order(...).limit(50000);
+await supabase.from("businesses")
+  .select("username, updated_at")
+  .eq("is_active", true)
+  .eq("approval_status", "published")
+  .eq("is_demo", false)
+  .not("username", "is", null)
+  .order("rating_avg", { ascending: false })
+  .limit(50000);
```

Null-username guard added so partially-onboarded providers can never produce `/null` URLs.

### P1 — Locked in via regression tests

- `brands` sub-sitemap reads `brands_public` (approved-only) — pinned in test so it can never silently regress to `brand_catalog`.
- `blog`, `projects`, `profile_systems`, `help_articles` all filter `status = 'published'` — pinned.
- Static page list never contains `/admin`, `/dashboard`, `/auth`, `/onboarding`, `/settings`, `/forbidden`, `/unsubscribe` — pinned.
- `robots.txt` keeps disallows + sitemap directive — pinned.

## Public route SEO matrix (verified)

| Route | Index? | Source | Risk |
|---|---|---|---|
| `/` | ✅ | static | none |
| `/search`, `/categories`, `/offers`, `/projects`, `/blog`, `/profile-systems`, `/brands`, `/compare`, `/compare-profiles`, `/membership`, `/for-providers`, `/join-as-provider`, `/about`, `/contact`, `/help`, `/privacy`, `/terms` | ✅ | static | none |
| `/sectors`, `/sectors/:slug`, `/sectors/:slug/:city` | ✅ | curated list | none |
| `/services/:slug` | ✅ | curated list | none |
| `/:username` (provider profile) | ✅ | `businesses` filtered to public view contract | **now safe** |
| `/brands/:slug` | ✅ | `brands_public` (approved-only) | safe |
| `/blog/:slug` | ✅ | `blog_posts` published-only | safe |
| `/projects/:id` | ✅ | `projects` published-only | safe |
| `/profile-systems/:slug` | ✅ | `profile_systems` published-only | safe |
| `/help/category/:slug`, `/help/article/:slug` | ✅ | published-only | safe |
| `/search?q=...` | ❌ | robots `Disallow: /search?q=` | safe |
| `/compare?ids=...`, `/compare-profiles?ids=...` | ❌ | robots `Disallow: /compare?ids=` | safe |
| `/admin/*`, `/dashboard/*`, `/auth`, `/onboarding`, `/reset-password`, `/forbidden`, `/unsubscribe`, `/profile/settings`, `/s/*`, `/q/*` | ❌ | robots disallow + `useNoIndex` on pages | safe |

## Public data safety

| Surface | Source | Triple-gate / approval enforced |
|---|---|---|
| Providers (sitemap) | `businesses` + `is_active + approval_status='published' + is_demo=false` | ✅ (this phase) |
| Providers (profile JSON-LD) | `PUBLIC_BUSINESS_SELECT` via `getPublicBusinessByUsername` | ✅ (PERF-1D.3) |
| Services (profile JSON-LD) | `listServicesByBusiness({ activeOnly: true })` — wrapper enforces `is_active + provider_status='active' + admin_status='allowed'` | ✅ (DB-GOVERNANCE-2 RLS + wrapper) |
| Branches | private table for auth'd; new `business_branches_public` view available for future anon use (parent approval enforced) | ✅ (DB-GOVERNANCE-2) |
| Brands (sitemap & pages) | `brands_public` (`status='approved'`) | ✅ |
| Reviews | `reviews_public` + `get_review_authors` RPC | ✅ |

## Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `bunx vitest run src/tests/seoSitemapPublicSafety1.test.ts` | ✅ 5/5 |
| DB-GOVERNANCE-2 regression suite (catalog, businesses, providerServices) | ✅ untouched |
| Existing `useNoIndex` tests | ✅ unchanged |

## Outcome

**PASS.** Sitemap is now consistent with the hardened public read surface. No private / pending / rejected / demo / inactive entity can reach the sitemap. Robots and route-level `useNoIndex` continue to keep admin/dashboard/auth surfaces out of the index.

## Remaining SEO debt (deferred, optional)

- **SEO-2** — per-route Helmet metadata for `/sectors/:slug`, `/sectors/:slug/:city`, `/services/:slug`, `/brands/:slug`, sector landing pages (Saudi-market keywords + city interpolation). Today these inherit the global `index.html` head.
- **SEO-3** — `ItemList` JSON-LD on directory / sector / showcase pages.
- **SEO-4** — `BreadcrumbList` JSON-LD on deep pages (provider profile, brand, blog post).
- **SEO-5** — Lighthouse perf + contrast findings (separate from data-governance scope; tracked in SEO panel).
- **SEO-6** — Connect Google Search Console (manual OAuth step for the user).

## Recommended next phase

**SEO-2** — per-route Helmet metadata for sector / city / service / brand pages, then submit GSC.

## Files

- edited `supabase/functions/sitemap/index.ts`
- created `src/tests/seoSitemapPublicSafety1.test.ts`
- created `docs/seo-1-audit.md`