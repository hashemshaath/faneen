# Barcode System — Operations Guide

Audience: product ops, support staff, and business managers using the Qitaat dashboard.

## 1. Search for a barcode code

### In the admin registry
1. Go to **Admin → Barcode Registry** (`/admin/barcode-registry`)
2. Use the search box to filter by partial code (case-insensitive)
3. Results show: code, entity type, status, visibility, scan count, linked entities, events

### In the URL bar
- Any valid `/q/:code` URL can be tested directly (e.g. `/q/LOC-2026-100001`)
- Invalid, revoked, or non-existent codes show the same generic "unavailable" page

## 2. Copy / print / download a barcode

1. Open any page showing the **BarcodeWidget** (Client Site detail, Contract detail, Admin Registry detail)
2. Click **Copy** to copy the code to clipboard
3. Click **Download** to save the QR image as PNG
4. Click **Print** to open a printable sticker card containing:
   - QR code image
   - Barcode code
   - Entity type label
   - `/q/:code` URL

Stickers are safe to display publicly — they contain no PII.

## 3. Verify a contract by barcode

1. Ask the provider or client for the **Contract Code** (e.g. `CNT-2026-100042`)
2. Open `/q/CNT-2026-100042` in any browser
3. The public verification card shows:
   - Contract number
   - Status (active / completed / cancelled / disputed)
   - Provider name (if approved)
   - Created date
4. For full contract details, parties must log in and open the contract in the dashboard

Alternatively, the contract PDF includes a QR that encodes the same `/q/...` URL.

## 4. Inspect linked entities

1. In **Admin → Barcode Registry**, click a code to open the detail drawer
2. The **Linked Entities** tab lists all entities connected via `barcode_entity_links`
3. Relationship types:
   - `primary` — the entity that created this barcode
   - `linked` — a related entity (e.g., a contract linked to a site)
   - `parent` / `child` — hierarchical relationships (reserved)

## 5. Interpret scan_count and events

| Field | Meaning |
|---|---|
| `scan_count` | Total successful `/q/` scans (increments on every `active` resolve) |
| `last_scanned_at` | Timestamp of the most recent successful scan |
| `barcode_events` | Per-event log with actor role, source, and result type |

Note: failed scans (frozen, archived, revoked, non-existent) still create an event but do **not** increment `scan_count`.

## 6. When a code is unavailable

If `/q/:code` shows "unavailable", possible causes:

| Cause | How to check | Resolution |
|---|---|---|
| Code does not exist | Search admin registry — no result | Check for typos; confirm entity exists |
| Status is `archived` | Admin registry shows status = archived | Un-archive if needed (not yet implemented in UI) |
| Status is `frozen` | Admin registry shows status = frozen | Unfreeze if needed (not yet implemented in UI) |
| Status is `revoked` | Admin registry shows status = revoked | Re-activate if needed (not yet implemented in UI) |
| Entity type not public | `customer`, `lead`, `maintenance`, `asset` | These types never resolve on `/q/` — by design |

## 7. Handle support calls with a barcode_code

1. Ask the caller for the full code (e.g. `LOC-2026-100001`)
2. Search it in **Admin → Barcode Registry**
3. Verify:
   - Status is `active`
   - Visibility matches expectation (`public_limited` vs `private`)
   - `scan_count` and `last_scanned_at` confirm recent usage
4. If the entity is a contract, cross-check with **Admin → Contract Analytics**
5. Never reveal `current_scan_token_hash`, `qr_token_hash`, owner UUIDs, or raw event metadata to callers

## 8. What to do when a code is archived / frozen / revoked

Currently, archive/freeze/revoke actions are not exposed in the admin UI. If support needs to change status:

1. Open the entity in its native admin page (Client Sites, Contracts, Businesses)
2. Check if the underlying entity is still active
3. If the entity is active but the barcode is not, file a support ticket for a DB-admin status change
4. Document the reason: fraud suspicion, entity transfer, duplicate code, or user request

Future releases will add inline status controls to `/admin/barcode-registry`.
