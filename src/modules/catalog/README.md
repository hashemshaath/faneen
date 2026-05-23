# Provider Catalog module

Owns all backend access for provider-owned catalog data. Created in
phase **CAT-1** as an audit-first scaffold; per-domain service wrappers
land in CAT-2..CAT-5 and the CI guardrail lands in CAT-6.

## Governed tables

| Table | Owner | Notes |
|---|---|---|
| `business_services` | provider | services list, sort_order, is_active, is_demo |
| `business_service_areas` | provider | city coverage, `is_primary` flag |
| `business_branches` | provider | multi-branch profile data |
| `business_availability` | provider | day-of-week booking slots |
| `business_bnpl_providers` | provider | per-business BNPL enablement |
| `bnpl_providers` | admin (global) | global BNPL provider catalog |
| `warranties` | provider / contract | per-contract warranty records |

## Planned service layout

```text
src/modules/catalog/
  index.ts
  README.md
  services/
    services/         { reads, mutations, admin }
    serviceAreas/     { reads, mutations }
    branches/         { reads, mutations }
    availability/     { reads, mutations }
    bnpl/             { reads, mutations, admin }
    warranties/       { reads, mutations }
  __tests__/
```

Wrapper rules:

- Thin: one Supabase call per function, preserve `select`/`filters`/
  `order` exactly, return `{ data, error }` shape unchanged.
- React Query keys stay at the callsite — wrappers are pure data access.
- No business logic, no toast/i18n, no auth checks beyond what RLS does.
- Reads vs mutations live in separate files so future CI rules can
  forbid mutations from public components.

## Migration phases

1. **CAT-2** — Public + provider read services
   (`business_services`, `business_service_areas`, `business_branches`,
   `business_availability`, `bnpl_providers` reads).
2. **CAT-3** — Provider dashboard write services
   (services CRUD/reorder, service-area CRUD, availability replace,
   branch CRUD when provider-owned).
3. **CAT-4** — Admin catalog management services
   (`AdminBusinesses` services/branches panels, admin locations hub,
   admin business_service_areas).
4. **CAT-5** — BNPL + warranty services
   (`bnpl_providers` admin CRUD, `business_bnpl_providers` upsert,
   `warranties` provider + contract reads/writes).
5. **CAT-6** — `scripts/catalog-isolation-audit.mjs` + CI step,
   allowing only `src/modules/catalog/services/**` to touch these tables.

## Out of scope

- Schema/RLS changes.
- Behavior changes at callsites.
- Cross-domain joins owned by other modules (e.g. `contracts` already
  owns its `warranties` aggregate read).