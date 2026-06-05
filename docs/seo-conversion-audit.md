# SEO Conversion Audit — MARKETPLACE-CONVERSION-OPTIMIZATION-1

Audit only. Confirms CTA + linking placement across SEO landings.

## Surfaces

| Surface | CTA placement | Internal links | Related content | Quote entry |
|---|---|---|---|---|
| `/sectors/:sector` | Hero + bottom | Brands, providers | Sector blog posts | ✅ button |
| `/services` | Card grid | Sectors, providers | ➖ | ✅ deep link |
| `/providers/:slug` | Sticky | Brands, sectors | Reviews, projects | ✅ button |
| `/products` | Card | Provider | ➖ | Indirect |
| `/brands/:slug` | Card | Providers | Sector | ✅ |
| `/blog/:slug` | NBA card | Help, products | Related posts | ✅ |

## Findings

- Quote entry exists on every high-intent surface.
- Related content is densest on `/brands`, sparsest on `/services`.
- Internal linking already verified by `scripts/broken-links-audit.mjs`.

## Recommendations (advisory)

1. Add "Related sectors" rail to `/services` cards.
2. Add "Recently published providers" rail to sector pages (data exists; presentation only).

No new SEO engines. No new tracking.