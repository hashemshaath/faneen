# Barcode System — Migration Notes

## Phase 1–8 summary

| Phase | Deliverable | Status |
|---|---|---|
| 1 | `barcode_registry`, `barcode_events`, `barcode_entity_links` tables + backfill (101 entities) | PASS |
| 2 | Auto-create triggers + entity links backfill (52 safe links) | PASS |
| 3 | `resolve_barcode` RPC + public `/q/:code` route | PASS |
| 4 | `/admin/barcode-registry` admin monitoring page | PASS |
| 5 | `BarcodeWidget` + `BarcodePrintCard` + copy/print/download | PASS |
| 6 | `get_entity_barcode_code` RPC + widget integration in Client Sites, ContractDetail, ExecutionSiteSection | PASS |
| 7 | Contract PDF barcode identifiers + `verify_contract_public` barcode support | PASS |
| 8 | End-to-end QA, signature cleanup, privacy tests | PASS |

## Tables created

| Table | Purpose |
|---|---|
| `barcode_registry` | Master barcode index: code, entity, status, visibility, counters |
| `barcode_events` | Audit log: scans, creates, links, transfers |
| `barcode_entity_links` | Many-to-many links between barcodes and entities |

## RPCs created

| RPC | Purpose | Caller |
|---|---|---|
| `resolve_barcode(_code)` | Public barcode resolver; returns safe card payload | anon / authenticated |
| `admin_list_barcodes(...)` | Paginated registry with filters | admin / super_admin |
| `admin_barcode_summary()` | Aggregate counts by type/status | admin / super_admin |
| `admin_barcode_detail(_barcode_id)` | Single barcode with links and events | admin / super_admin |
| `get_entity_barcode_code(_entity_type, _entity_id)` | Returns active barcode_code for an entity | authenticated |
| `generate_barcode_code(_entity_type)` | Allocates a unique code | trigger/internal |
| `normalize_barcode_code(_code)` | Uppercases and strips whitespace | internal |
| `barcode_entity_prefix(_entity_type)` | Maps type to prefix string | internal |
| `_barcode_entity_label(_entity_type, _entity_id)` | Resolves human labels | internal |
| `verify_contract_public(...)` | Contract verification (3-arg) | anon / authenticated |

## Routes created

| Route | Component | Access |
|---|---|---|
| `/q/:barcode_code` | `PublicBarcodeResolve.tsx` | Public (noindex) |
| `/admin/barcode-registry` | `AdminBarcodeRegistry.tsx` | Admin only |

## Components created

| Component | Location |
|---|---|
| `BarcodeWidget` | `src/components/barcodes/BarcodeWidget.tsx` |
| `BarcodePrintCard` | `src/components/barcodes/BarcodePrintCard.tsx` |
| `PublicBarcodeResolve` | `src/pages/PublicBarcodeResolve.tsx` |
| `AdminBarcodeRegistry` | `src/pages/admin/AdminBarcodeRegistry.tsx` |
| `useEntityBarcode` | `src/lib/barcodes/useEntityBarcode.ts` |
| `barcode-url` helpers | `src/lib/barcodes/barcode-url.ts` |

## Legacy compatibility

The following legacy identifiers remain fully operational and are not replaced by barcodes:

- `site_ref` — stable public site identifier (`STE-YYYY-NNNNNN`)
- `contract_number` — stable public contract identifier
- `/s/:token` — legacy QR scan route for client sites
- `qr_token_hash` — legacy site QR token (hash only)

Barcodes are additive. Existing sites, contracts, and businesses continue to work exactly as before.

## External integration note

`verify_contract_public` changed from a 2-argument signature to a 3-argument signature:

```
-- Old (dropped)
verify_contract_public(text, text)

-- New (canonical)
verify_contract_public(_contract_number text, _hash text, _barcode_code text)
```

Old integrations that called `verify_contract_number` + `hash` should update to pass `_barcode_code = NULL` when no barcode is available. The function resolves via barcode first, then falls back to contract_number + hash.

## Known limitations

1. **Lead backfill deferred** — `lead` entities are not backfilled with barcodes. New leads created after Phase 2 will receive a barcode via trigger.
2. **Customer-owner links deferred** — `customer` profiles are backfilled but `barcode_entity_links` primary links for some pre-Phase 2 customers may be missing. Auto-create trigger covers all new inserts.
3. **Freeze / transfer actions not implemented** — `frozen_at`, `archived_at`, `transferred_at`, `transfer_from_user_id`, `transfer_to_user_id` exist in schema but have no admin UI controls yet.
4. **First real /q scan monitoring** — while QA passed with synthetic scans, the first production traffic to `/q/:barcode_code` should be monitored for:
   - Unexpected `scan_count` spikes
   - Error rates in `resolve_barcode`
   - Event log volume
5. **No barcode rotation** — unlike QR tokens, barcodes cannot be rotated. If a code is compromised, the entity status can be changed to `revoked` and a new entity created (future UI).
6. **Contract PDF performance** — barcode QR generation adds one async QR encode per PDF. For batch exports, this may add ~50–100ms per contract.
