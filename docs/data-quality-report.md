# Data Quality Report — PLATFORM-DEEP-AUDIT-REPAIR-1

_Snapshot taken at audit time against the live database._

## Top-level totals

| Entity | Count | Notes |
|--------|-------|-------|
| Businesses (draft) | 2 | `ENT-1000001`, `ENT-1000002` awaiting admin publish |
| Businesses (published) | 0 | **Blocker for the public directory going live** |
| Businesses (demo) | 0 | Clean — no leaked seed data |
| Contracts | 0 | Production seeding pending |
| Work orders | 0 | Production seeding pending |
| Project closures | 0 | n/a until WOs exist |
| Warranties | 0 | n/a until closures exist |

## Diagnostics (from `src/modules/health/dataIntegrity.ts`)

All 12 pure diagnostics return empty sets at this snapshot because no live business data exists yet:

- contracts_without_work_orders — ∅
- awarded_rfqs_without_po — ∅
- work_orders_without_due_date — ∅
- work_orders_without_pipeline_stage — ∅
- completed_work_orders_without_closure — ∅
- closures_without_warranty — ∅
- rfqs_without_items — ∅
- rfqs_without_supplier_quotes — ∅
- installation_appointments_without_confirmation — ∅
- customer_tracking_links_without_project — ∅
- feedback_without_closure — ∅
- expired_warranties — ∅

## Manual remediation required

1. **Admin → `/admin/provider-review`** — approve usernames for `ENT-1000001` and `ENT-1000002`, verify `PublishReadinessPanel` is fully green, click **Publish**. This unblocks `/search`, `/:username`, and the sitemap.
2. **Provider onboarding seeding** — once a real provider creates the first contract → work order → closure flow, re-run the integrity diagnostics from Operations Center to catch any seed gaps.

No automated repairs were applied (criteria from the brief: deterministic + safe + tested). All findings are clean or require admin action.