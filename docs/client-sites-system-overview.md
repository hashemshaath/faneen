# Client Sites — System Overview

## What is a Client Site?
A Client Site (also called a Project Location) is a physical location owned or managed
by a client where industrial work — aluminum, glass, wood, steel, etc. — may be carried
out. Sites exist independently of contracts so that the same physical location can be
reused across multiple projects, providers, and time periods.

## Examples of sites
- Residential apartment
- Villa
- Showroom
- Office
- Branch (retail or commercial)
- Warehouse
- Project (multi-unit development, compound, tower)

## Identity — `site_ref`
Every site has a stable public identifier in the format `STE-NNNN-NNNNNN`
(e.g. `STE-2026-001234`). It is:
- Generated automatically on insert via a DB trigger
- Immutable after creation (guarded by an `BEFORE UPDATE` trigger)
- Safe to print, share, and use in search
- Used as the primary public handle for the site

## `site_type`
Classifies the site (`apartment`, `villa`, `showroom`, `office`, `branch`,
`warehouse`, `project`). Drives UI labels, default visibility, and analytics.

## QR token
Each site can be assigned a QR token that resolves to the public scan page
`/s/:token`. The database stores only `qr_token_hash` — the raw token is shown
to the manager exactly once at issue/rotate time. Owners can:
- Issue a token
- Rotate a token (invalidates the previous one)
- Revoke a token (sets `qr_enabled = false`)
- Print a sticker with the token and `site_ref`

## Visibility
Site-level visibility:
- `public_limited` — discoverable via QR / `site_ref` search, returns a limited summary
- `private` — QR scan and `site_ref` search return the generic "unavailable" state

## Section-level visibility
`client_site_visibility_settings` stores per-section visibility
(`public_limited`, `request_only`, `hidden`). A DB CHECK forbids `public_limited`
on sensitive sections: `full_address`, `map_location`, `contact_person`,
`contact_phone`, `attachments`, `contracts`, `previous_visits`, `notes`.
Defaults are seeded by an `AFTER INSERT` trigger. Missing rows resolve to `hidden`.

## Visit logs
`client_site_visit_logs` records scan / search / view events. A trigger
(`trg_csvl_sanitize_metadata`) strips tokens, phone numbers, addresses, emails,
coordinates, signed URLs, and storage paths from metadata before insert.
Only managers and the provider who initiated the visit can read their rows.

## Access grants
`client_site_access_grants` mediates provider-to-site access:
- States: `requested`, `approved`, `rejected`, `revoked`, `ignored`
- A unique partial index prevents duplicate active requests
- Approving a grant does not expose sensitive sections automatically — section
  visibility still applies
- Revoking a grant never alters existing contracts

## Provider interest
`lead_requests.source_site_id` ties a preliminary offer to a site.
`submit_site_interest`:
- Requires authentication (anon EXECUTE revoked)
- Auto-creates a `requested` grant if none exists
- Writes a `submitted_interest` visit log
- Never creates a contract and never converts a lead

## Contract relationship
- A contract may reference a site via `execution_site_id`
- `execution_address_snapshot` captures the address at the time the contract
  was created — revoking a grant or changing site visibility never mutates it
- Sites exist and remain usable independent of any contract lifecycle

## Notification preferences
`client_site_notification_preferences` lets the owner toggle in-app
notifications for QR scans, access requests, locked-section attempts, and
provider interest. Anti-spam: anonymous and repeated visits (1h window) can be
auto-ignored.