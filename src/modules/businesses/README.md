# Module: businesses

**Status:** Scaffold only (R0). No code has been moved here yet.

## Purpose
Future home of all `businesses` domain code: pages, components, hooks, services, types, and tests.

## What belongs here (in later phases)
- UI specific to the businesses domain
- Hooks that orchestrate businesses state
- A `services/` subfolder that is the ONLY place allowed to import `@/integrations/supabase/client` for this domain
- Domain types and Zod schemas
- Unit and privacy tests

## What does not belong here
- Generic UI primitives (use `@/components/ui`)
- Cross-domain utilities (use `src/modules/shared`)
- Direct Supabase calls outside `services/`

## Public API
Import from the module barrel (`@/modules/businesses`) once exports are added in R1/R2.
Do not deep-import internal files from other modules.

## Current status
Scaffold only. See `docs/codebase-modularization-plan.md`.
