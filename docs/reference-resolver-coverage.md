# Reference Resolver Coverage (BM-REF Step G)

Audit of `public.lookup_by_reference` + `ReferenceResolver.tsx` for each
prefix considered for outbound `/r/{ref}` linking in emails and notifications.

| Prefix | Server `canonical_route` | Resolver fallback | Safe for outbound email? | Used in Step G |
|---|---|---|---|---|
| ENT / BIZ | Yes (`/{username|id}`) | `null` (server-driven) | Yes when business public | Deferred — no current outbound surface in scope |
| PAY | Yes (`/membership/payments/{id}/invoice` when succeeded/refunded, else `/membership`) | `/membership` | Yes — destination is auth-gated | ✅ paid + refunded emails/notifications |
| PVS | `null` (admin-only) | `null` (not_found) | No — no public destination | Deferred |
| CNT (contract) | Yes (`/contracts/{id}`) | `/contracts/{id}` | Auth-gated; safe | Deferred (no Step G surface) |
| QTE | Yes (`/dashboard/my-requests/{id}`) | same | Auth-gated; safe | Deferred |
| LED / LR | Yes (`/dashboard/provider/leads/{id}`) | same | Auth-gated; safe | Deferred |
| BKG / BK | Yes (`/dashboard/bookings`) | same | Safe (list) | Deferred |
| STI | Admin-only | `/dashboard/business-edit` | No — token-based flow; never link via `/r/` | Excluded |
| TKT | Not yet wired | n/a | No | Excluded |

## Step G changes

- `manualMarkPaid` and `manualMarkRefunded` now use
  `paymentRef ? "/r/{PAY}" : "/membership"` for both the in-app notification
  `action_url` and the email template `dashboardUrl`.
- Safe fallback: when `ref_id` is missing the legacy `/membership` URL is
  preserved verbatim.
- Templates remain unchanged structurally; the CTA href is computed by the
  template as `${SITE_URL}${dashboardUrl}` which now resolves to
  `${SITE_URL}/r/PAY-…` when available.

## Explicitly NOT changed

- Invitation accept URLs (signed tokens).
- Unsubscribe / email-tracking / webhook URLs.
- OTP / magic-link / login URLs.
- Any UUID-based admin route.
- Schema, RLS, edge payment logic, reconcile cron, webhooks.