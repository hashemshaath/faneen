---
name: Rental ↔ Asset Final Polish 3
description: Per-asset utilization summary RPC, QR identity card, polished maintenance alerts, and 5-tile final ops card — no scope creep
type: feature
---

## Surface (`@/modules/assets`)
- `getAssetUtilizationSummary(assetId, windowDays?)` → JSON with days_rented/idle/utilization_pct/current_status/last_rental_ref/next_available_date.
- `getRentalAssetPolishCounts()` → low_utilization_assets, assets_without_qr, inspections_overdue, post_rental_inspection_queue, repeated_overrides.
- Components: `<AssetUtilizationSummary />`, `<AssetQrIdentity />`, `<AssetMaintenanceAlerts />`, `<RentalAssetPolishOpsCard />`.

## RPCs (SECURITY DEFINER, search_path=public)
- `asset_utilization_summary(_asset_id uuid, _window_days int default 90)`
- `rental_asset_polish_counts()`
- Both granted EXECUTE to `authenticated` + `service_role`. No new tables, no policy changes.

## QR identity rules
- Encodes only `/admin/assets?ref=<asset_ref>` — no customer data, no pricing, no rental ids.
- Uses internal `@/lib/badge/qr.ts` (QRCode npm) — never an external API.
- Print/download via `downloadQrPng` + `window.open` print sheet.

## Where wired
- `/dashboard/assets` (provider): alerts + summary + QR inside `AssetDetail`.
- `/admin/assets`: alerts + rental panel + summary + QR per row + new ops cards.
- `/admin/operations` (Assets tab): `RentalAssetPolishOpsCard` next to `AssetOpsCard`.

## Tests
- `src/__tests__/rentalAssetFinalPolish3.test.ts` (23/23) — surface, no PII in QR, no scope creep (no accounting/payment/inventory/supplier), assets remain non-public.