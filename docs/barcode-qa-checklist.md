# Barcode System — QA Checklist

Use this list to validate the unified barcode system end-to-end after any related change.

## Registry coverage
- [ ] Every `client_site` has an active `barcode_registry` row
- [ ] Every `contract` has an active `barcode_registry` row
- [ ] Every `business` has an active `barcode_registry` row
- [ ] Every `customer` (`profiles`) has an active `barcode_registry` row
- [ ] Zero duplicate `barcode_code` values
- [ ] `barcode_entity_links` has a `primary` link for every backfilled entity
- [ ] `generate_barcode_code` format matches `PREFIX-YYYY-NNNNNN`
- [ ] Sequence start offset is `100000` per prefix/year

## Trigger checks
- [ ] New `client_site` INSERT auto-creates `barcode_registry` + `primary` link
- [ ] New `contract` INSERT auto-creates `barcode_registry` + `primary` link
- [ ] New `business` INSERT auto-creates `barcode_registry` + `primary` link
- [ ] New `profiles` (customer) INSERT auto-creates `barcode_registry` + `primary` link
- [ ] `barcode_registry_validate` rejects invalid status/visibility transitions
- [ ] `barcode_events_validate` rejects invalid event types
- [ ] `barcode_entity_links_validate` rejects invalid relationship types

## /q resolver checks
- [ ] Valid `client_site` code + `active` → renders limited summary (name, city, type)
- [ ] Valid `contract` code + `active` → renders verification card (number, status, provider)
- [ ] Valid `business` code + `active` → renders business card (name, username, profile link)
- [ ] `customer` / `lead` / `maintenance` / `asset` codes → `unavailable` (by design)
- [ ] Invalid code → `unavailable` (no existence leak)
- [ ] Archived code → `unavailable`
- [ ] Frozen code → `unavailable`
- [ ] Revoked code → `unavailable`
- [ ] Page sets `noindex,nofollow`
- [ ] `Disallow: /q/` present in `public/robots.txt`
- [ ] Route absent from `sitemap.xml`
- [ ] No address, phone, map, coordinates, or raw UUID in DOM
- [ ] `scan_count` increments only on successful resolves
- [ ] `barcode_events.scanned` row created for every attempt

## Admin registry checks
- [ ] `/admin/barcode-registry` loads and paginates
- [ ] Filters (entity type, status, visibility) work independently and combined
- [ ] Search by partial code works (case-insensitive)
- [ ] Detail drawer opens and shows linked entities + events
- [ ] Copy button copies the code
- [ ] Non-admin user is redirected away (403/redirect)
- [ ] Anonymous user cannot access `/admin/barcode-registry`

## Client Sites checks
- [ ] Admin inline detail shows `BarcodeWidget` for sites with active barcodes
- [ ] Sites without barcodes show a plain `site_ref` fallback row
- [ ] QR in widget opens `/q/:code`
- [ ] Download PNG works
- [ ] Print sticker works
- [ ] Copy button works

## Contract / PDF checks
- [ ] Contract detail shows `BarcodeWidget` in header when active barcode exists
- [ ] Contract PDF includes "كود العقد" identifier
- [ ] Contract PDF includes "كود المشروع" identifier when execution site has barcode
- [ ] Contract PDF QR encodes `/q/<contract_barcode_code>` (not `/v/c/`)
- [ ] PDF QR fallback to `/v/c/` only when contract has no barcode

## VerifyContract checks
- [ ] `/v/c/:number?code=BARCODE` resolves via barcode_code
- [ ] VerifyContract page shows contract_barcode_code when available
- [ ] VerifyContract page shows provider_name when available
- [ ] Old `/v/c/:number?hash=...` path still works
- [ ] `verify_contract_public` 3-arg signature is the only version in DB

## Privacy grep list
Run the following and expect zero matches in public-facing outputs:
- `qr_token_hash` in any API response or DOM
- `current_scan_token_hash` in any API response or DOM
- Raw UUID in `/q/` page content
- `file_url`, `storage_path`, `getSignedUrl`, `sign=` in barcode outputs
- `internal_note` in barcode outputs
- Full street address or phone in `/q/` DOM
- `lat`, `lng`, `map_url` in `/q/` DOM
- `actor_id`, `ip_hash`, `user_agent_hash` in any public response

## Broken links / sitemap checks
- [ ] `bunx tsc --noEmit` exits cleanly
- [ ] `node scripts/broken-links-audit.mjs` reports 0 broken links
- [ ] `node scripts/sitemap-integrity-audit.mjs` passes
- [ ] `node scripts/seo-noindex-audit.mjs` flags `/q/` as noindex

## Manual browser smoke checklist
- [ ] Print a barcode sticker from Client Site detail — verify no PII on printout
- [ ] Scan a contract barcode with phone camera → opens `/q/...` → shows verification card
- [ ] Scan a site barcode with phone camera → opens `/q/...` → shows limited summary
- [ ] Verify old `/s/:token` still works for existing sites
- [ ] Verify contract PDF QR scans correctly to `/q/...`
