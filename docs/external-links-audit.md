# External Links Audit — SITE-INTEGRITY-DEEP-AUDIT-1

Scope: every `https?://` literal under `src/`, `public/`, `supabase/functions/`.

## Method

- ripgrep for `https?://` across production paths
- exclude `src/**/__tests__/**`, `src/tests/**`, `docs/**`, `*.md`
- cross-checked against `scripts/external-links-audit.mjs`

## Categories

| Category | Result | Notes |
|---|---|---|
| Social media (Twitter, LinkedIn, FB, IG, YouTube) | PASS | Sourced from admin `SiteSettings`; empty values hidden in Footer. |
| Google Maps embeds | PASS | Built from branch `lat/lng` at render time. |
| App / Play Store badges | N/A | Hidden until configured in `SiteSettings`. |
| `mailto:` / `tel:` | PASS | Built from validated DB values. |
| CDN assets | PASS | Lovable Assets (`/__l5e/assets-v1/...`) and Supabase Storage signed URLs. |
| Schema.org refs in JSON-LD | PASS | `https://schema.org` only — canonical. |
| Sitemap / robots sitemap directive | PASS | Points to `https://qitaat.com/sitemap.xml`. |

## Placeholder URL scan

| Pattern | Hits in production runtime | Status |
|---|---|---|
| `example.com` | 0 user-visible | Only in `canonicalEmail.ts` blocklist, `safety.ts` outbound guard, form `placeholder=` UX hints, and test fixtures. |
| `test.com` / `demo.com` | 0 | none |
| `localhost` / `127.0.0.1` | 0 | none in shipped code |
| `placehold.co` / `via.placeholder` | 0 | none |
| `x/y.png` and similar stubs | 0 | none |
| Fake social handles | 0 | Footer renders only configured handles. |

## Invalid / 404 external URLs

No hard-coded third-party URLs require live reachability checks at build
time. Reachability for partner sites is exercised at runtime by
`check-badge-backlinks` (now SSRF-hardened — see
`docs/security-hardening-closeout-1.md`).

## Verdict

**PASS** — no placeholder, invalid, or unsafe external URLs in production
code. Test-only fixtures remain excluded by `siteIntegrityDeepAudit1.test.ts`
via path filters.