# Barcode System — Privacy & Security

Internal reference for the privacy and access-control posture of the unified barcode system. Pair with `docs/barcode-system-overview.md`.

## 1. What /q/:code exposes

On a successful scan of an `active` barcode:

- `client_site`: site name, `site_ref`, site type, city name only
- `contract`: contract number, status, provider name (if approved/active), created date
- `business`: business name, username, verified status, public profile path

## 2. What /q/:code never exposes

- `current_scan_token_hash` or any raw scan token
- `qr_token_hash` or legacy QR token
- Full street address or building number
- Map coordinates, map URL, or GPS data
- Owner identity, contact person, or phone number
- Contract pricing, line items, or terms
- Raw entity UUIDs
- Whether the code exists but is frozen, archived, or revoked
- Whether the code was ever assigned to a different entity

All non-active states (archived, frozen, revoked, non-existent) render the identical generic `unavailable` state. This prevents enumeration attacks.

## 3. Public contract verification limits

`verify_contract_public` now accepts an optional `_barcode_code` parameter. When resolved via barcode:

- Returns: contract number, status, provider name, created date, hash prefix, amendment count
- Does **not** return: line items, pricing, client identity, supervisor info, execution site address, signatures

The 3-argument signature (`_contract_number`, `_hash`, `_barcode_code`) is the canonical version. Old 2-argument integrations should pass `_barcode_code = NULL`.

## 4. Admin-only registry rules

- `admin_list_barcodes`, `admin_barcode_summary`, `admin_barcode_detail` require `has_role(uid, 'admin')` or `super_admin`
- `get_entity_barcode_code` requires `auth.uid() IS NOT NULL` (authenticated only)
- `resolve_barcode` is anon-callable but returns only safe, pre-filtered fields

## 5. RLS and SECURITY DEFINER posture

| Table | RLS | Notes |
|---|---|---|
| `barcode_registry` | Enabled | Admin + owner read; no public SELECT |
| `barcode_events` | Enabled | Admin + event actor read |
| `barcode_entity_links` | Enabled | Admin read; insert via trigger |

All barcode RPCs:
- Are `SECURITY DEFINER`
- Pin `SET search_path = public`
- Revoke `EXECUTE` from `PUBLIC` and `anon`
- Grant `EXECUTE` to `authenticated` (where applicable) and `service_role`
- Re-validate caller via `auth.uid()` and role check before working

## 6. Event logging privacy

`barcode_events` stores:
- `event_type` (e.g. `scanned`, `created`, `linked`)
- `actor_user_id`, `actor_business_id`, `actor_role`
- `ip_hash` (hashed, not raw IP)
- `user_agent_hash` (hashed, not raw UA)
- `metadata` JSONB — sanitized; no tokens, addresses, phones, coordinates, signed URLs

Events are readable only by admins and the actor who created them.

## 7. Sensitive reveal boundaries

The following are **never** returned by any barcode RPC or rendered in any barcode UI:

| Data class | Where protected |
|---|---|
| Raw tokens / hashes | DB only; never in RPC output or DOM |
| Address / street / building | Not in `resolve_barcode`; not in verification page |
| Phone numbers | Not in any public flow |
| Map URL / lat / lng | Not in any public flow |
| Contract line items / pricing | Verification page shows status only |
| Client name / email / supervisor | Not in verification page |
| Owner user_id / business_id | Internal only; admin RPCs show labels via `_barcode_entity_label` |
| `transfer_from_user_id` / `transfer_to_user_id` | Internal only |

## 8. Print / PDF safety

- `BarcodeWidget` renders the code, a QR to `/q/:code`, and entity label only
- `BarcodePrintCard` sticker contains: code, QR image, entity type label, URL
- No PII on printed stickers
- Contract PDF QR encodes `/q/<contract_barcode_code>` when available; falls back to legacy `/v/c/` URL

## 9. robots.txt and indexing

- `Disallow: /q/` is present in `public/robots.txt`
- `/q/:code` pages set `<meta name="robots" content="noindex,nofollow">`
- Route is absent from `sitemap.xml`
