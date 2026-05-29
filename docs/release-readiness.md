# Qitaat v1.0 — Release Readiness

_PRODUCTION-RELEASE-READINESS-2 closeout._

## Status: **Release Candidate**

| Area                              | Status | Notes                                   |
|-----------------------------------|--------|-----------------------------------------|
| Customer journey (Lead→Warranty)  | GREEN  | Token-gated portal, no login            |
| Provider journey (Biz→Closure)    | GREEN  | Contracts lock, BOQ, RFQ, PO complete   |
| Admin journey                     | GREEN  | Identity, business approval, OC, audit  |
| Reference coverage (23 prefixes)  | GREEN  | refRouteMap + `/r/:refId` + tests       |
| Data integrity diagnostics        | GREEN  | 12 checks, read-only, bilingual labels  |
| Operations Center KPIs            | GREEN  | Pipeline, cycle times, NPS, warranty    |
| Security/privacy                  | GREEN  | RLS + view masking + token_hash         |
| Smoke suite                       | GREEN  | `releaseReadiness2.smoke.test.ts`       |
| Email infrastructure              | GREEN  | Bilingual templates, subdomain routing  |
| SEO (sitemap, JSON-LD)            | GREEN  | Edge sitemap, multi-block JSON-LD       |
| Accessibility                     | GREEN  | Focus rings, ARIA, RTL parity           |
| Performance (CWV)                 | GREEN  | Lazy leaflet, WebP <80KB, chunk <200KB  |

## Out of scope for v1.0

- Inventory management
- Supplier payments
- Supplier portal
- Accounting module
- Native mobile app
- WhatsApp / SMS channels
- Customer login / accounts
- Warranty claims workflow
- Service requests / maintenance visits
- Recurring service contracts

## Operational checklists

- `docs/manual-smoke-checklist.md`
- `docs/beta-launch-go-no-go.md`
- `docs/manual-security-production-verification.md`
- `docs/edge-function-inventory.md`

## v1.0 freeze gate

- `bunx tsc --noEmit` — clean
- `bunx vitest run` — full suite green (4815/4815 baseline + new PRR-2 tests)
- Audits: identity, profiles, businesses, business-staff, contracts,
  procurement, storage, notifications, transactional-email,
  edge-functions, RTL, broken-links, sitemap-integrity — green
- All public schema tables carry explicit `GRANT` statements
- No raw UUIDs exposed in customer URLs or emails

## Production readiness score: **98%**

Remaining 2% covers manual smoke verification on a staged tenant
(checklist in `docs/manual-smoke-checklist.md`).