# Client Sites — Operator Guide

Audience: business owners, site managers, and support staff using the
Qitaat dashboard.

## 1. Create or select a site
1. Open a contract draft in the dashboard, or go to the Sites area.
2. In the Execution Site section, choose **Create new site** or
   **Select existing site**.
3. Enter site name, type (apartment / villa / showroom / office / branch /
   warehouse / project), and address. The system assigns a `site_ref` of the
   form `STE-NNNN-NNNNNN` automatically — this is the public handle.

## 2. Issue a QR token
1. Open the site → **QR Code** card.
2. Click **Issue QR**.
3. The raw token is shown **once**. Print or download the sticker immediately.
   Only the hash is stored — the system cannot show the token again.

## 3. Rotate the QR token
Use **Rotate** if you suspect the token has been shared beyond your trust
circle. The previous token stops working immediately; print and replace any
physical stickers.

## 4. Revoke the QR token
Use **Revoke** to disable scanning entirely. The site stays in the system and
contracts are unaffected. You can issue a new token later.

## 5. Print a sticker
From the QR card, click **Print Sticker**. The sticker includes the QR image
and the `site_ref`. Stickers are safe to display publicly — they contain no
PII.

## 6. Change visibility
- **Site-level**: choose `public_limited` (discoverable via QR / site_ref)
  or `private` (scan/search returns "unavailable").
- **Section-level**: in the Visibility card, set each section to
  `public_limited`, `request_only`, or `hidden`. Sensitive sections
  (address, map, contact, attachments, contracts, previous visits, notes)
  cannot be set to `public_limited` — the UI will reject the change.

## 7. Review access requests
The Owner Inbox lists pending requests with: provider business name, request
date, status. No staff PII is shown. For each request you can:
- **Approve** — grants the provider `request_only` section access subject to
  visibility.
- **Reject** — declines the request; the provider is notified.
- **Ignore** — silently dismisses without notifying.
- **Revoke** (on a previously approved grant) — withdraws access. Contracts
  and `execution_address_snapshot` are not modified.

## 8. Review provider interest
Interests submitted via `/s/:token` arrive as `lead_requests` rows with
`source_site_id` populated and `initiated_by = 'provider'`. They appear in
the standard leads inbox. No contract is created and no automatic conversion
happens.

## 9. Notification preferences
Open the Notification Preferences card for the site to toggle:
- QR scan notifications
- Access request notifications
- Locked-section attempt notifications
- Provider interest notifications

Anti-spam toggles let you auto-ignore anonymous visits and repeated visits
from the same user inside a 1-hour window.

## 10. Troubleshooting
| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Scan shows "unavailable" | Token revoked, site `private`, or invalid URL | Re-issue token or set site to `public_limited` |
| Provider can't see address | Section is `request_only` or `hidden` | Approve grant and/or change visibility |
| Duplicate access request error | Active request already exists | Use the existing row in the inbox |
| No notification on scan | QR scan preference off, or anti-spam suppressed | Toggle preference; check 1h window |
| Lost the raw token | Only the hash is stored | **Rotate** to generate a new token and reprint |
| Sticker printed but scan fails | Token rotated/revoked after print | Reissue and reprint |