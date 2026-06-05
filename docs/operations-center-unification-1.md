# Operations Center Unification — Phase 1

_OPERATIONS-CENTER-UNIFICATION-1 — strict non-duplication build._

## Scope

A read-only executive summary, unified work queue, SLA board, source-system
cards and quick routing actions surfaced at `/admin/operations-center`.

This page **does not** replace any existing dashboard. It only summarises
counts and routes admins to the specialised page that owns the action.

## Source systems

| System | Source page | Service wrapper(s) | Queue statuses | Target route | Allowed action |
|---|---|---|---|---|---|
| Provider Growth | `/admin/provider-growth` | `@/modules/providers/services/providerGrowthQueries` | pipeline stages + readiness/quality bands | `/admin/provider-growth`, `/admin/provider-growth/queue` | route-only |
| Catalog Governance | `/admin/catalog-governance` | `@/modules/catalog/services/catalogGovernanceQueries` | catalog lifecycle stages | `/admin/catalog-governance`, `/admin/catalog-governance/queue` | route-only |
| Data Enrichment | `/admin/data-enrichment` | `@/modules/dataEnrichment` | enrichment job statuses | `/admin/data-enrichment` | route-only |
| Brand Requests | `/admin/brand-requests` | brand request wrappers | review statuses | `/admin/brand-requests` | route-only |
| Provider Review | `/admin/provider-review` | provider review wrappers | submitted / under_review | `/admin/approvals` | route-only |
| Quote Operations | `/admin/quote-operations` | quote wrappers | quote statuses | `/admin/quote-operations` | route-only |
| Procurement | dashboard procurement | procurement wrappers | rfq / award statuses | `/dashboard/procurement` | route-only |
| Contracts | contracts hub | contract wrappers | contract statuses | `/admin/contracts` | route-only |
| Work Orders | dashboard work orders | `@/modules/workOrders` | wo statuses | `/dashboard/work-orders` | route-only |
| Customer Experience | customer hub | cx wrappers | feedback statuses | `/dashboard/customer-experience` | route-only |
| Warranty | warranty hub | warranty wrappers | warranty statuses | `/dashboard/warranties` | route-only |
| Memberships | memberships hub | membership wrappers | subscription statuses | `/admin/memberships` | route-only |
| System Access | system access hub | access wrappers | request statuses | `/admin/system-access` | route-only |
| Google Integrations | google hub | google wrappers | sync statuses | `/admin/integrations/google` | route-only |
| Observability | operations hub | `@/modules/observability` | health snapshot | `/admin/operations` | route-only |

## Non-duplication

- No new score engine — uses the existing readiness/quality engines for
  providers and catalog items via their service wrappers.
- No new pipeline table — reads `provider_growth_pipeline`, `business_services`
  admin_status/is_active, brand request statuses, data-enrichment job
  statuses, and quote/procurement/contract statuses through their existing
  wrappers.
- No new business action — every CTA is a `<Link>` to an existing page that
  owns the mutation.
- No bulk publish, no auto publish, no hidden overrides.
- No new RLS, no new migration, no schema change.

## SLA & priority rules (dashboard-only)

Deterministic, pure, no cron, no DB writes. See
`src/modules/operations/unifiedWorkQueue.ts`.

| Age (hours) | SLA status |
|---|---|
| `< 24` | ok |
| `24 – 72` | warning |
| `> 72` | overdue |

Priority: `critical` (overdue + high source), `high` (overdue), `medium`
(warning), `low` (ok).