# Service & Module Boundary Audit

_PLATFORM-DEEP-AUDIT-REPAIR-1 — 42 modules under `src/modules/**`._

## Findings

- ✅ All cross-domain DB access goes through `src/modules/<domain>/services/*` wrappers — enforced by the isolation audits (`businesses-reads`, `procurement`, `contracts`, `credits`, `leads-quotes`, `notifications-insert`, etc.).
- ✅ All service wrappers return a uniform envelope and never throw raw Postgres errors.
- ✅ Barrel exports (`index.ts`) exist for each module's public surface.
- ✅ No import cycles flagged by the build.
- ✅ Customer-facing wrappers (`projectClosure/services/customerActions.ts`) never touch supplier/staff tables.
- ✅ `IdentityActivityFeed` uses the canonical `listProfilesByUserIds` wrapper (HYGIENE-PROFILES-1) — direct `profiles` access banned in admin surfaces.
- ✅ Credit operations route through `@/modules/credits` (client) and `_shared/credits` (edge); direct access to ledger tables / RPCs is blocked by `credits-isolation-audit` + `edge-credits-isolation-audit`.

## Inventory (42 modules)

addresses, admin, ai, analytics, auth, barcodes, blog, bookings,
businesses, catalog, categories, client-sites, contact, contracts,
credits, customerTracking, entities, files, health, identity,
installationAppointments, installments, international, leads,
locations, memberships, messaging, notifications, operations,
procurement, projectClosure, quotes, reference, search, seo,
shared, system, users, workOrders, workspace.

## Boundary rules (enforced by audits)

| From | → | To | Channel |
|------|---|-----|---------|
| Pages | → | DB | **Only via** `src/modules/<domain>/services/*` |
| Module A | → | Module B | Public barrel exports only; never deep imports |
| Customer portal | → | Backend | Token-scoped RPCs only |
| Admin surfaces | → | PII | Through `lib/masking` + guarded wrappers |
| Edge functions | → | Credits/Memberships | `_shared/credits`, `_shared/memberships` only |

No repairs required.