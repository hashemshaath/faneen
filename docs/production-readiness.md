# Production Readiness

_Last refreshed: APP-STABILITY-CLEANUP-SECURITY-1._

Snapshot of the gating signals used to declare the codebase production-stable.
Re-run every command below before promoting a new feature phase.

## Gating signals

| Signal | Command | Expected |
|--------|---------|----------|
| TypeScript | `bunx tsc --noEmit` | 0 errors |
| Unit tests | `bunx vitest run` | 100% pass |
| Storage isolation | `node scripts/storage-isolation-audit.mjs` | 0 violations |
| Identity isolation | `node scripts/identity-isolation-audit.mjs` | 0 violations |
| Profiles isolation | `node scripts/profiles-isolation-audit.mjs` | 0 violations |
| Businesses reads | `node scripts/businesses-reads-isolation-audit.mjs` | 0 violations |
| Business staff | `node scripts/business-staff-isolation-audit.mjs` | 0 violations |
| Contracts | `node scripts/operations-isolation-audit.mjs` | 0 violations |
| Leads / quotes | `node scripts/catalog-isolation-audit.mjs` | 0 violations |
| Edge functions | `node scripts/edge-functions-isolation-audit.mjs` | 0 violations |
| Notifications | `node scripts/notifications-isolation-audit.mjs` | 0 violations |
| Credits (client) | `node scripts/credits-isolation-audit.mjs` | 0 violations |
| Credits (edge) | `node scripts/edge-credits-isolation-audit.mjs` | 0 violations |
| Broken links | `node scripts/broken-links-audit.mjs` | 0 violations |
| Robots ↔ sitemap sync | `node scripts/robots-sitemap-sync-audit.mjs` | 0 violations |
| JSON-LD snapshots | `node scripts/jsonld-snapshot-audit.mjs` | 0 violations |
| Sitemap integrity | `node scripts/sitemap-integrity-audit.mjs` | 0 violations |

## Current baseline (APP-STABILITY-CLEANUP-SECURITY-1)

- TypeScript: PASS.
- Vitest: PASS — 4569 / 4569.
- All isolation audits: PASS.
- Public `/q/:code` route unified through `QSlugDispatcher` — eliminates
  the previous shadowing between `QuotationViewer` (`?t=<token>`) and
  `PublicBarcodeResolve` (no token). See `docs/workflow-route-matrix.md`.
- `robots-sitemap-sync-audit` and `jsonld-snapshot-audit` are green
  again after restoring `Disallow: /q/` in the edge `robots` function
  and pruning the stale `TopProvidersSection.tsx` snapshot entry.

## Documented invariants

- See `docs/workflow-architecture.md` for the end-to-end pipeline.
- See `docs/work-order-lifecycle.md` for the work-order stack.
- See `docs/workflow-route-matrix.md` for the public/private/admin route matrix.
- See `docs/deferred-backlog.md` for what is intentionally _not_ shipped yet.
- See `docs/credits-architecture.md` for the credits client/server contract.
- See `src/modules/edge-functions-boundary.md` for edge-function rules.

## Promotion checklist

Before opening a new feature phase:

1. Re-run all gating signals above.
2. Confirm no new entries in `docs/deferred-backlog.md` are silently in-flight.
3. Confirm `mem://index.md` Core rules are still respected.
4. Update this file's "Current baseline" line with the new phase id on PASS.