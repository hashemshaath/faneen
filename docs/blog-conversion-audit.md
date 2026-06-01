# Blog → Product Conversion Audit — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part D_

Reviewed every entry point and exit point in `src/pages/Blog.tsx` and
`src/pages/BlogPost.tsx`.

## Entry points

| Entry | Quote CTA | Search CTA | Sectors CTA | Provider CTA | Help CTA |
|---|---|---|---|---|---|
| Blog hero | ✅ added UX-REDESIGN-6 | ✅ search box | ✅ added UX-REDESIGN-6 | indirect (via provider links inside posts) | ✅ added this phase |
| Blog post header | indirect | ✅ in-article search | indirect | indirect | ✅ added this phase (related help block) |
| Empty state | ✅ UX-REDESIGN-6 | — | ✅ UX-REDESIGN-6 | — | — |

## Exit points (per post)

| Block | Status |
|---|---|
| Related posts (3) | ✅ existing |
| "Ready for the next step?" CTA → `/quote` + `/sectors` | ✅ existing |
| Related help articles | ✅ added this phase |
| Tags footer → tag filter | ✅ existing |
| Comments | ✅ existing |

## Orphan check

- Posts without a conversion path: **0** after this phase (every post
  renders the next-step CTA card and the related-help block).
- Posts without related posts block: handled by `relatedPosts.length > 0`
  guard; falls back to next-step CTA + related help so no dead-end.

## Cannibalisation / scope check

- Blog never claims pricing, guarantees, or legal outcomes.
- Blog category map (`general/tips/news/guides/industry`) does not
  overlap with Help Center categories (workflow- and audience-scoped).

## Result

Blog conversion path is now: read → understand → related help → request
quote or explore sectors. No orphan / dead-end posts detected.