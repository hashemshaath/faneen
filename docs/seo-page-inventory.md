# SEO Page Inventory — SEO-TITLES-METADATA-OPTIMIZER-1

All public, indexable routes — what drives title/description/JSON-LD per page.
All entries route through `src/modules/seo/seoTitleBuilder.ts` via `useSeoPage`.

| Route | Page Type | Title source (kind) | Description source | JSON-LD | Canonical | Status |
|---|---|---|---|---|---|---|
| `/` | Home | `home` template | `home` template | Organization (index.html) + WebSite | sitewide | OK |
| `/search` | Search | `search` template | `search` template | none (noindex query params) | self | OK |
| `/sectors` | Sectors hub | `category` (hub) | `category` (hub) | ItemList | self | OK |
| `/sectors/:slug` | Sector landing | `category` | `category` | ItemList + BreadcrumbList | self | OK |
| `/sectors/:slug/:city` | Sector × city | `category` + city | `category` + city | ItemList + BreadcrumbList | self | OK |
| `/services` | Services hub | `service` (hub) | `service` (hub) | ItemList | self | OK |
| `/services/:slug` | Service detail | `service` | `service` | Service + BreadcrumbList | self | OK |
| `/brands` | Brands catalog | `brand` (hub) | `brand` (hub) | ItemList | self | OK |
| `/brands/:slug` | Brand detail | `brand` | `brand` | Brand + BreadcrumbList | self | OK |
| `/:username` | Provider profile | `company` | `company` (bio rawDescription) | LocalBusiness + BreadcrumbList | self | OK |
| `/:username/:branch` | Business branch | `company` + city | `company` + city | LocalBusiness + BreadcrumbList | self | OK |
| `/projects` | Projects index | `project` (hub) | `project` (hub) | ItemList | self | OK |
| `/projects/:id` | Project detail | `project` | `project` (excerpt) | CreativeWork + BreadcrumbList | self | OK |
| `/offers` | Offers list | `offer` (hub) | `offer` (hub) | ItemList | self | OK |
| `/offers/:slug` | Offer detail | `offer` | `offer` | Offer + BreadcrumbList | self | OK |
| `/blog` | Blog index | `blog` (hub) | `blog` (hub) | Blog + ItemList | self | OK |
| `/blog/:slug` | Blog post | `blog` | `blog` (excerpt) | Article + BreadcrumbList | self | OK |
| `/help` | Help center | `help` (hub) | `help` (hub) | none | self | OK |
| `/help/:slug` | Help article | `help` | `help` (excerpt) | FAQPage (when QA) + BreadcrumbList | self | OK |
| `/about` | Static | static | static | Organization (inherited) | self | OK |
| `/contact` | Static | static | static | ContactPage | self | OK |

Excluded from inventory and sitemap: `/admin/*`, `/dashboard/*`, `/auth`, `/onboarding/*`, `/settings/*`, `/notifications`, `/unsubscribe`. All carry `useNoIndex`.

Multilingual: every entry above renders AR ↔ EN via `useSeoPage({ lang })`; `LanguageContext` is the single source of language and the builder enforces no AR/EN mixing in titles, descriptions, OG, or JSON-LD `name` fields.