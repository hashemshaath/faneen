# Module: contracts

**Status:** Scaffold only (R0). No code has been moved here yet.

## Purpose
Future home of all `contracts` domain code: pages, components, hooks, services, types, and tests.

## What belongs here (in later phases)
- UI specific to the contracts domain
- Hooks that orchestrate contracts state
- A `services/` subfolder that is the ONLY place allowed to import `@/integrations/supabase/client` for this domain
- Domain types and Zod schemas
- Unit and privacy tests

## What does not belong here
- Generic UI primitives (use `@/components/ui`)
- Cross-domain utilities (use `src/modules/shared`)
- Direct Supabase calls outside `services/`

## Public API
Import from the module barrel (`@/modules/contracts`) once exports are added in R1/R2.
Do not deep-import internal files from other modules.

## Current status
CT-1 → CT-13 complete. All contract-domain backend access (tables, storage,
RPCs) is centralized under `src/modules/contracts/services/**` and enforced
by `scripts/contracts-isolation-audit.mjs` (CI step *Contracts Isolation
Audit*; meta-test `src/__tests__/contractsIsolationAudit.test.ts`).

### Adding a new wrapper safely
1. Add the function under `src/modules/contracts/services/<area>/`.
2. Re-export it from `src/modules/contracts/index.ts` (the barrel).
3. Update callers to import from `@/modules/contracts` — never from
   `@/integrations/supabase/client` directly.
4. Run `npm run contracts-isolation-audit` locally before pushing.

### Documented exceptions
- `src/modules/leads/services/conversion.ts` — read-only post-conversion
  `contracts.select` belonging to the leads service layer (already governed
  by `leads-quotes-isolation-audit`).

See `docs/codebase-modularization-plan.md`.
