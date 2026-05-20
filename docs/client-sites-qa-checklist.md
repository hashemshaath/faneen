# Client Sites — QA Checklist

Use this list to validate the Client Sites system end-to-end after any
related change.

## Site creation
- [ ] New site gets a `site_ref` matching `STE-NNNN-NNNNNN`
- [ ] `site_ref` is immutable on update (guard trigger raises)
- [ ] Default visibility row seeded for every section
- [ ] Default notification preferences row created

## QR issue / rotate / revoke
- [ ] `issue_site_qr_token` returns the raw token exactly once
- [ ] Only `qr_token_hash` is stored; raw token never re-readable
- [ ] `rotate_site_qr_token` invalidates the previous token
- [ ] `revoke_site_qr_token` sets `qr_enabled = false`
- [ ] All three RPCs reject anonymous callers

## Public scan (`/s/:token`)
- [ ] Valid token + `public_limited` site renders limited summary
- [ ] Invalid, revoked, and `private` all render the same "unavailable" state
- [ ] Page sets `noindex,nofollow`
- [ ] `Disallow: /s/` present in `public/robots.txt` and `robots` edge function
- [ ] Route absent from `sitemap.xml`
- [ ] No address, phone, map, owner, or contracts in DOM
- [ ] No raw site UUID or `qr_token_hash` in DOM / network

## Search by `site_ref`
- [ ] `search_site_by_ref` returns limited summary for `public_limited` only
- [ ] `private` sites return no match
- [ ] Anonymous callers cannot enumerate sites

## Visibility settings
- [ ] CHECK blocks `public_limited` on sensitive sections
- [ ] Missing rows resolve to `hidden`
- [ ] UI prevents invalid combinations

## Access requests
- [ ] Authenticated provider can request access
- [ ] Duplicate active request blocked by unique partial index
- [ ] Anonymous cannot call grant RPCs

## Owner inbox
- [ ] Owner sees pending requests with business name + status only
- [ ] Approve / reject / ignore transitions logged in audit
- [ ] Revoke does not modify contracts or `execution_address_snapshot`

## Provider interest
- [ ] `submit_site_interest` rejects `anon` (EXECUTE revoked)
- [ ] Authenticated provider creates `lead_requests` with `source_site_id`
- [ ] Auto-creates `requested` grant when none exists
- [ ] Writes a `submitted_interest` visit log
- [ ] No contract created; no lead converted

## Notifications
- [ ] All three `trg_csnp_notify_*` triggers present
- [ ] Payloads contain only `site_ref`, `site_name`, business name, event type
- [ ] Preferences respected (toggle off → no notification)
- [ ] Anti-spam suppresses repeated scans within 1h
- [ ] No PII, token, or hash in any notification body

## Visit logs
- [ ] `trg_csvl_sanitize_metadata` strips tokens / phone / address / email /
      lat / lng / signed URLs / storage paths
- [ ] RLS allows only managers and the originating provider to read
- [ ] No anonymous SELECT

## Contract snapshot
- [ ] Creating a contract from a site populates `execution_address_snapshot`
- [ ] Site changes or grant revocation do not mutate the snapshot
- [ ] Active contracts unaffected by revoke

## Privacy checks
- [ ] No public listing RPC, page, or sitemap entry
- [ ] No `qr_token_hash` in any API/UI response
- [ ] All SECURITY DEFINER functions pin `search_path = public`
- [ ] Supabase linter shows no unexpected findings
- [ ] `bunx tsc --noEmit` exits cleanly