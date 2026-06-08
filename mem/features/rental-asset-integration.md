---
name: Rental ↔ Asset Integration
description: Order-level asset_rental_assignments table, server-side status sync trigger, availability checker RPC, ops mismatch counts, inline UI panels — no popups, no public exposure
type: feature
---

## Tables
- `asset_rental_assignments` (ARASN-) links `rental_orders` ↔ `assets` with quantity, dates, status (reserved/active/returned/cancelled), `post_rental_inspection_required`.
- Unique enforcement: only providers owning **both** asset and rental order can write; admin full access. RLS enforced; no `USING (true)`.

## RPCs
- `asset_rental_check_availability(asset, start, end, ignore?)` → JSONB `{available, reason, asset_ref, conflicting_rental_ref, next_available_date}`. Reasons: retired / in_maintenance / in_inspection / inactive / overlap_conflict / not_found.
- `asset_current_rental_info(asset)` → safe metadata only (ref, dates, days_remaining, overdue, link_status).
- `rental_asset_ops_counts()` → ops mismatch tiles.

## Triggers
- `trg_asset_rental_sync` on `rental_orders.status`: active→rented, closed→inspection|available (per `post_rental_inspection_required`), cancelled→available, etc. Audited via `cron_run_log` (`asset_status_synced_from_rental` / `asset_rental_sync_failed`).

## Module surface (`@/modules/assets`)
- `AssetRentalAssignmentsApi` — CRUD + ops/info wrappers.
- `checkAssetRentalAvailability`, `describeBlock`.
- Components: `RentalAssetOpsCard`, `AssetRentalPanel`, `RentalOrderAssetLinks`.

## Rules
- Assets never public; no SEO. Public rental pages must not import any assignment APIs/components (covered by test).
- Pages must call the module, never raw Supabase (covered by test).
- `createAssignment` always validates via availability checker before insert.