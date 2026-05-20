# Client Sites — Privacy & Security

## What QR exposes
On a successful scan of `/s/:token` for a `public_limited` site:
- Site name
- `site_ref`
- `site_type`
- City / region (high-level only, never full address)
- Sections explicitly marked `public_limited` in visibility settings
- A login CTA (anon) or a "Request Access" CTA (authenticated providers)

## What QR never exposes
- `qr_token_hash` or any raw token after the initial issue/rotate response
- Full street address
- Map coordinates / map URL
- Owner identity, contact person, or phone number
- Attachments, contracts, previous visits, internal notes
- Raw site UUID
- Any data for `private` sites, revoked tokens, or invalid tokens
  (all render the same generic "unavailable" state)

## Section visibility rules
Per-section value, resolved by the visibility resolver:
- `public_limited` — visible to anyone who can see the site
- `request_only` — visible only after an `approved` access grant
- `hidden` — never visible via the public flow

Missing rows fall back to `hidden`. A DB CHECK constraint
(`client_site_visibility_settings_sensitive_chk`) blocks `public_limited`
on sensitive sections.

## Sensitive sections (cannot be `public_limited`)
`full_address`, `map_location`, `contact_person`, `contact_phone`,
`attachments`, `contracts`, `previous_visits`, `notes`.

## Access grant levels
- `requested` — pending owner review
- `approved` — provider may view `request_only` sections subject to visibility
- `rejected` — owner declined, provider cannot resubmit while active
- `revoked` — previously approved, now withdrawn; contracts untouched
- `ignored` — silently dismissed

## Visit logs privacy
- Metadata is sanitized by a trigger before insert
  (tokens, phones, addresses, emails, lat/lng, signed URLs, storage paths removed)
- RLS: only managers (`csvl_select_managers`) or the provider that owns the
  request (`csvl_select_own_provider_requests`) can read rows
- No anonymous SELECT

## Notification privacy
Notification payloads contain only:
- `site_ref`
- `site_name`
- Provider business name (when applicable)
- Event type

They never contain PII, addresses, phone numbers, tokens, hashes, or raw UUIDs.

## Public `/s/:token` page
- `useNoIndex` adds `<meta name="robots" content="noindex,nofollow">`
- `Disallow: /s/` is set in both `public/robots.txt` and the dynamic
  `robots` edge function
- Route is excluded from `sitemap.xml`
- Locked sections render generic placeholders — no PII leaks via DOM

## No public site listing
There is no RPC, page, or sitemap entry that enumerates sites. Discovery is
only possible by scanning a QR or knowing a `site_ref`.

## RLS / RPC security summary
- All site-related tables have RLS enabled
- Public lookups go through three intentional anon-callable RPCs only:
  `get_public_site_by_token`, `search_site_by_ref`, `log_site_visit`
- All other RPCs (`issue_site_qr_token`, `rotate_site_qr_token`,
  `revoke_site_qr_token`, access-grant management,
  notification preferences, `submit_site_interest`) require `authenticated`
- `submit_site_interest`: anon and PUBLIC EXECUTE revoked; only
  `authenticated` and `service_role` may invoke
- All SECURITY DEFINER functions pin `search_path = public`