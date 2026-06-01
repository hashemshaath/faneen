# Content Architecture Audit — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part A_
_Scope:_ Help Center + Blog content repositories.
_Sources:_ `src/modules/helpCenter/*`, `src/pages/Blog.tsx`, `src/pages/BlogPost.tsx`,
`src/pages/help/*`, `src/components/help/HelpLauncherFloating.tsx`.

## Help Center

| Layer | Status | Notes |
|---|---|---|
| Categories (`help_categories`) | DB-backed, AR/EN, audience-scoped | Active rows ordered by `sort_order`. Edited via admin. |
| Articles (`help_articles`) | DB-backed, status `draft`/`published` | Markdown/text body; `views_count`, `helpful_count`, `not_helpful_count` tracked. |
| Contextual mappings | Code-backed (`contextualHelp.ts`) | 30+ page keys mapped to slug arrays. Public pages were under-mapped before this phase — see Part C. |
| Search | `searchHelpArticles` (ilike + GIN keyword index) | AR + EN aware via `normalizeQuery`. |
| Assistant answers | `intelligence/aiAnswers.ts` (Lovable AI) | Optional summarisation, no model change in this phase. |
| Recommendations | `intelligence/recommendations.ts` | Pure helper; powers `<SmartHelpPanel/>`. |

### Help article structure

Each `HelpArticle` carries: `title_ar/en`, `summary_ar/en`, `content_ar/en`,
`keywords[]`, `category_id`, `audience`, plus stats. **Missing in the model:**
a structured *next-best-action* (slug → product route). This phase ships a
code-side registry (`nextBestActionRegistry`) keyed by slug — no schema change.

### Article-level findings (per published slug)

| Audience | Intent | Workflow stage | NBA target | Missing |
|---|---|---|---|---|
| provider | informational | onboarding | `/dashboard/business` | NBA card (added) |
| provider | how-to | publishing | `/dashboard/business` | NBA card (added) |
| provider | informational | lead-credits | `/dashboard/membership` | NBA card (added) |
| provider | how-to | brands | `/dashboard/brands` | NBA card (added) |
| customer | informational | RFQ | `/quote` | NBA card (added) |
| customer | informational | tracking | (uses token route) | already wired in customer portal |
| general | informational | discovery | `/sectors` | NBA card (added) |
| admin | how-to | review | `/admin/provider-review` | NBA card (added) |

## Blog

| Layer | Status | Notes |
|---|---|---|
| Categories | Hard-coded map (`blogCategories`) | `general/tips/news/guides/industry` AR/EN. |
| Posts (`blog_posts`) | DB-backed, `status='published'` | Tags array, `views_count`, FAQ structured data when present. |
| Article structure | Markdown via `marked` + DOMPurify | Auto TOC, related posts (3), social share, FAQ JSON-LD. |
| Internal links | Blog → Blog (related, latest, popular) ✅ | Blog → Help / Sectors / Quote — minimal before this phase. |
| CTAs | `/quote` + `/sectors` at end-of-article (UX-REDESIGN-6) | Added contextual help block in this phase. |
| SEO metadata | Full `usePageMeta` + multi JSON-LD (Article + Breadcrumb + FAQ + Speakable) | OK. |

## Conversion / linkage gaps closed in this phase

1. Blog posts now embed a **related help articles** block (DB-driven, contextual).
2. Help articles now render a **Next best action** card.
3. Public page keys added to `contextualHelpRegistry`: `public.home`, `public.sector-detail`,
   `public.providers`, `public.quote`, `public.blog`, `public.blog-post`, `public.search`.
4. Help ↔ Dashboard cross-links handled via NBA registry.

## Remaining backlog (not in scope this phase)

- Author articles for `dashboard.production-board`, `dashboard.procurement-detail`,
  `dashboard.business-profile`, `dashboard.staff` (already flagged in
  `docs/contextual-help-fit-check.md`).
- Translate blog post tags into an explicit topic taxonomy that matches
  Help Center keywords (currently free-form).