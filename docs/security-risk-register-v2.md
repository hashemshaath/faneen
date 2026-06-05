# Security Risk Register v2

_Source: `security-deep-review-3.md`. Owners and target dates to be filled by the launch lead._

| ID | Severity | Title | Origin | Owner | Target | Status |
|----|----------|-------|--------|-------|--------|--------|
| M-1 | Medium | `wo_files_insert_manager` lacks terminal-state guard | Deep Review 3 | Backend | Pre-launch + 2 weeks | Open |
| M-2 | Medium | `check-badge-backlinks` lacks SSRF hostname allowlist | Deep Review 3 | Edge functions | Pre-launch | Open |
| M-3 | Medium | Data-enrichment ingestion SSRF | Deep Review 3 | — | — | **Mitigated** (delegated to Firecrawl) |
| L-1 | Low | Tighten DOMPurify config (ALLOWED_TAGS, FORBID_ATTR) | Deep Review 3 | Frontend | Post-launch sprint 1 | Open |
| L-2 | Low | Add server-side MIME trigger on sensitive storage buckets | Deep Review 3 | DB | Post-launch sprint 1 | Open |
| L-3 | Low | Audit-log admin email preview/retry actions | Deep Review 3 | Edge functions | Post-launch sprint 1 | Open |
| L-4 | Low | Sampled signed-URL issuance logging | Deep Review 3 | Observability | — | **Accepted** |
| INFO-* | Info | See `security-deep-review-3.md` PART G | Deep Review 3 | — | — | Mitigated |

## Pre-launch blockers

None. M-1 and M-2 are recommended hardening but the exploitability today is rated 1/5 each.

## Continuous controls

CI audits enforced on every PR:

- `broken-links`, `sitemap-integrity`, `robots-sitemap-sync`
- `identity-isolation`, `profiles-isolation`
- `businesses-reads-isolation`, `businesses-sensitive-fields-isolation`, `businesses-writes-isolation`
- `business-staff-isolation`, `brands-isolation`, `catalog-isolation`
- `credits-isolation`, `edge-credits-isolation`
- `memberships-isolation`, `edge-memberships-isolation`
- `notifications-isolation`, `notifications-insert-isolation`
- `operations-isolation`, `procurement-isolation`
- `transactional-email-isolation`, `edge-functions-isolation`
- `messaging-isolation`, `storage-isolation`
- `jsonld-snapshot`, `jsonld-parse`, `seo-noindex`

## Re-review cadence

Quarterly, or before any of the following events:
- New edge function that fetches an attacker-influenced URL.
- New `dangerouslySetInnerHTML` site.
- New `public` schema table (CI already blocks missing GRANT/RLS).
- Any change to storage bucket visibility.