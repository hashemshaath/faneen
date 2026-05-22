# Codebase Modularization Plan

Status: **R0 applied** (scaffold only). No behavior changes. No DB/RLS/route changes.

## Phases

### R0 — No-risk cleanup (applied)
- Create `src/modules/<domain>/` skeletons with README + barrel `index.ts`.
- Create `src/modules/shared/format/` scaffold.
- Create `src/services/rpc.ts` and `src/services/userRoles.ts` stubs.
- Add this document.

No files moved. No callsites changed. No tests changed.

### R1 — Service wrappers
- Implement `services/rpc.ts`, `services/userRoles.ts`, `services/contracts/*`,
  `services/admin/*`, `services/messages.ts`, `services/leads.ts`.
- Centralize barcode URL builder and SA country constant.
- Replace highest-volume direct Supabase calls in pages
  (start with `DashboardContracts` and `ContractDetail`).
- Add `services/errorMap.ts` and `services/audit.ts`.

#### R1A — Service wrapper foundation (applied)
- `src/services/rpc.ts`: typed `callRpc`, `safeRpc`, `mapRpcError`,
  `normalizeSupabaseError` + `RpcErrorCode` / `NormalizedRpcError` types.
- `src/services/userRoles.ts`: typed `getUserRoles`, `hasRole`,
  `hasAdminAccess`, `hasSuperAdminAccess` (wraps `has_role` RPC).
- `src/modules/shared/constants/{country,routes}.ts`:
  `SA_COUNTRY_ID`, `SA_COUNTRY_CODE`, `SA_CURRENCY`, `SA_LOCALE`,
  `SA_TIMEZONE`, `PUBLIC_BARCODE_ROUTE_PREFIX`, `PUBLIC_SITE_TOKEN_ROUTE_PREFIX`.
- `src/modules/shared/errors/README.md`: error mapping contract.
- Unit tests added for rpc helpers and constants. **No callsites changed.**

#### R1B — Gradual callsite adoption (next)
- Migrate `AuthContext` role lookups onto `services/userRoles.ts`.
- Migrate `AdminUsers` and similar admin pages onto the role wrappers.
- Begin migrating contract pages onto `services/contracts/*` (still TBD).
- Replace hardcoded SA UUID/currency literals with `shared/constants` as files are touched.

### R2 — Domain modules
- Move files into `src/modules/<domain>/` per the scaffolds.
- Add per-module unit + privacy tests.
- Routes and public URLs remain unchanged.

### R3 — Edge function candidates
- Server-side `generate-contract-pdf` (only if external email attach needed).
- Consolidated `notifications` dispatcher.
- Cron `storage-cleanup` for orphaned uploads.

### R4 — True microservices
- Only after sustained production traffic and clear SLO breach. Not on roadmap.

## Module boundaries

```
src/modules/
  auth users businesses search categories client-sites barcodes contracts
  leads admin international notifications messaging memberships blog
  installments ai shared
```

Each module owns: `pages/ components/ hooks/ services/ types.ts __tests__/`
plus a `README.md` and barrel `index.ts`.

## Hard rule (to be enforced in R2)

**Only files under `services/` (top-level or `modules/*/services/`) may
import `@/integrations/supabase/client`.** Pages and components must go
through a typed service. Auto-generated `src/integrations/supabase/*` is
never edited by hand.

A warn-only ESLint rule is deferred to R1 to avoid CI churn now.

## Microservice candidates and timing

| Domain            | Recommendation                          | Timing      |
|-------------------|-----------------------------------------|-------------|
| Barcode/QR        | Keep monolith, modularize               | R2          |
| Contract PDF      | Edge function if email attach needed    | R3 (defer)  |
| Notifications     | Consolidate existing edge functions     | R3          |
| Search            | Keep, modularize                        | R2          |
| International tax | Keep, configuration not workload        | R2          |
| Admin analytics   | Keep, RLS-gated                         | R2          |
| Storage cleanup   | Cron edge function                      | R3          |
| AI / streaming    | Already edge function                   | done        |

## Do NOT split yet
- Contract PDF generation (0 live contracts, browser jsPDF is privacy-tested).
- Barcode service (single sequence, single country).
- Search (one business indexed).
- International tax (config, not compute).
- Auth/OTP (already edge functions).

## Required test checklist for every refactor PR

1. `bunx tsc --noEmit`
2. `bunx vitest run`
3. `node scripts/broken-links-audit.mjs`
4. `node scripts/sitemap-integrity-audit.mjs`
5. `bash scripts/contracts-prelaunch-smoke.sh`
6. `/istify` smoke
7. `/q/BIZ-2026-100001` smoke
8. Auth route guard smoke
9. RLS regression tests when policies touched
10. Stale-ref scan (no removed BIZ/USR IDs reintroduced)

## Preserved public URLs (must not change)
`/`, `/istify`, `/q/:code`, `/search`, `/categories`, `/admin/*`, `/dashboard/*`, `/auth`.
