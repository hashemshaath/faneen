# Content SEO Alignment — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part H_

## Intent split

| Surface | Search intent | Primary keyword bucket |
|---|---|---|
| Help articles (`/help/article/:slug`) | informational | how-to, definitions, troubleshooting |
| Blog posts (`/blog/:slug`) | discovery / informational | industry, tips, news, guides |
| Sector pages (`/sectors/:sector`, `/sectors/:sector/:city`) | commercial | "ألمنيوم في الرياض" type queries |
| Brand pages (`/brands/:slug`) | commercial / navigational | brand name + sector |
| Quote page (`/quote`) | transactional | "طلب عرض سعر …" |
| Provider profile (`/providers/:slug`) | navigational / commercial | provider name, services |

## Cannibalisation check

- Help vs Blog: Help is workflow-scoped (`how to`, `what is`), Blog is
  topic-scoped (`tips`, `guides`, `news`). No overlapping `<h1>` or
  canonical conflicts detected.
- Sector hub vs sector landing: `/sectors` is a hub (CollectionPage),
  `/sectors/:sector` is the commercial landing (Service / ItemList).
  Canonicals differ; preserved from SEO-1–SEO-10A.
- Quote vs Sector landing: `/quote` is transactional; sector landings
  link *to* `/quote` rather than competing for the same keyword.

## Structured data summary

| Surface | JSON-LD |
|---|---|
| Blog list | Blog + ItemList + Breadcrumb + WebSite SearchAction |
| Blog post | Article + Breadcrumb + (FAQ when present) + Speakable |
| Help home | (unchanged) |
| Help article | Article + Breadcrumb |
| Sector hub / detail / brand / provider | preserved from UX-REDESIGN-2/4/5 |

## Verdict

No cannibalisation introduced by Part I additions (related-help block
and NBA card are *links*, not duplicate landing pages; they don't add
canonical / `<h1>` conflicts).