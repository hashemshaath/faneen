# Unified Barcode System — Overview

## What is the unified barcode system?

The unified barcode system assigns a single permanent public code — `barcode_code` — to every client site, contract, business, and customer profile in Qitaat. Unlike the legacy QR token system (`/s/:token`), barcodes are:

- **Permanent** — once assigned, the code follows the entity for life
- **Public-shareable** — safe to print on stickers, invoices, and marketing material
- **Type-agnostic** — a single `/q/:code` route resolves any supported entity
- **Traceable** — every scan is logged in `barcode_events` with counter increments

## barcode_code vs scan_token

| | `barcode_code` | `scan_token` (legacy) |
|---|---|---|
| Format | `PREFIX-YYYY-NNNNNN` (e.g. `LOC-2026-100001`) | Random opaque string |
| Lifetime | Permanent; survives rotation/revoke | Rotatable; revocable |
| Public route | `/q/:barcode_code` | `/s/:token` |
| Use case | Printed stickers, invoices, business cards | Time-bound QR campaigns |
| Stored in DB | `barcode_registry.barcode_code` (plain text, safe to display) | `qr_token_hash` (one-way hash only) |
| Can be guessed? | No — sequential but high-offset (starts at 100,000/year) | No — random |

## /q/:barcode_code vs /s/:token

| | `/q/:barcode_code` | `/s/:token` |
|---|---|---|
| Entity scope | Sites, contracts, businesses | Client sites only |
| What it returns | Public verification card (name, city, type, status) | Site summary subject to visibility rules |
| Address/phone/map | Never | Only if section visibility allows |
| Noindex | Yes (`robots.txt` disallows `/q/`) | Yes (`robots.txt` disallows `/s/`) |
| Auth required? | No — anon callable | No — anon callable |
| Event logged? | `barcode_events.scanned` | `client_site_visit_logs` |

## Supported entity types

The system supports these entity types today:

| Type | Prefix | Example | Public /q resolver? |
|---|---|---|---|
| `client_site` | `LOC` | `LOC-2026-100001` | Yes — limited summary |
| `contract` | `CNT` | `CNT-2026-100042` | Yes — contract verification card |
| `business` | `BIZ` | `BIZ-2026-100003` | Yes — public profile redirect card |
| `customer` | `CLI` | `CLI-2026-100004` | No — private by design |
| `lead` | `LED` | `LED-2026-100005` | No — private by design |
| `maintenance` | `MNT` | `MNT-2026-100006` | No — reserved |
| `asset` | `AST` | `AST-2026-100007` | No — reserved |

Entity types marked "No" in the resolver column return `unavailable` on `/q/` regardless of registry status. They still receive a barcode for internal linking and admin visibility.

## How codes are generated

1. On insert of a `client_site`, `contract`, `business`, or `customer` profile, a DB trigger (`tg_*_create_barcode`) auto-creates a `barcode_registry` row.
2. `generate_barcode_code(entity_type)`:
   - Chooses a prefix via `barcode_entity_prefix()`
   - Creates a per-prefix-year sequence if needed (`barcode_seq_PREFIX_YYYY`)
   - Starts at `100000` to keep codes unguessable
   - Formats as `PREFIX-YYYY-NNNNNN`
   - Checks for collisions (retry loop, max 50 attempts)
3. The code is stored in `barcode_registry.barcode_code` as uppercase plain text.
4. `barcode_entity_links` creates a self-link (`primary`) connecting the barcode to its origin entity.

## What is public vs private

### Public
- The `barcode_code` string itself (safe to print and share)
- The `/q/:barcode_code` page for `client_site`, `contract`, and `business`
- Scan count and last-scanned timestamp (aggregated, no actor identity)
- Contract verification metadata (status, provider name, hash prefix)

### Private / admin-only
- Full `barcode_registry` table (RLS + admin-only RPCs)
- `barcode_events` row-level data (actor IDs, IP hashes, user-agent hashes)
- `current_scan_token_hash` and `qr_token_hash` (never exposed in any UI or API)
- `owner_user_id` and `owner_business_id` (only used for internal linking)
- Address, phone, map, coordinates, full contract terms, pricing

## How the registry connects entities

```
barcode_registry
├── id (uuid)
├── barcode_code  ← public handle
├── entity_type   ← client_site | contract | business | customer | lead | maintenance | asset
├── entity_id     ← FK to the origin table (not enforced as FK; soft link via trigger)
├── status        ← active | archived | frozen | revoked
├── visibility    ← public_limited | private
├── scan_count    ← incremented by resolve_barcode()
└── ...

barcode_entity_links
├── barcode_id    ← links to barcode_registry
├── linked_entity_type
├── linked_entity_id
└── relationship_type ← primary | linked | parent | child
```

A single barcode can link to multiple entities (e.g., a site linked to a contract via `linked` relationship), but the primary entity is always the one that created the barcode.

## Admin surfaces

- `/admin/barcode-registry` — paginated registry, filters by type/status/visibility, search by code
- Contract PDF — prints "كود العقد" and "كود المشروع" identifiers with QR to `/q/...`
- Client Site admin inline detail — shows barcode widget with copy/print/download
- Contract detail — shows barcode widget in header area
