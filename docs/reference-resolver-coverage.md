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

## Step H — copy-link policy (UI)

Which prefixes are approved for `<ReferenceLinkCopy>` (universal `/r/{REF}`
copy buttons) in admin/provider/user UI:

| Prefix | Copy link in UI? | Rationale |
|---|---|---|
| PAY | ✅ Admin + user-facing where the official ref is already shown | Server canonical route resolves to `/membership/payments/{id}/invoice` (succeeded/refunded) or `/membership`; resolver fallback is safe. |
| ENT | ✅ When canonical `/{username|id}` is present | Public business profile. |
| QTE | ✅ | Auth-gated detail route. |
| LED / LR | ✅ | Auth-gated provider lead route. |
| STI | ✅ Admin only (badge + copy link) | Resolver requires admin; reference is the STI ref_id, NEVER the invitation token. |
| PVS | ✅ Badge + copy link (admin-only) | Resolver returns a safe `not_found` for non-admins; admin link is still useful for cross-referencing. |
| BKG / BK | ✅ Badge + copy link | Resolves to bookings list. |
| CNT (contract) | ✅ | Auth-gated. |
| TKT | ❌ Deferred — not yet wired. |
| Tokens, UUIDs, `provider_intent_id`, synthetic phone emails | ❌ Never — `ReferenceLinkCopy` itself rejects via the `SAFE_REF_PATTERN`. |

Component contract recap:

- `ReferenceBadge` — purely presentational; displays the official ref text.
- `ReferenceLinkCopy` — copy-to-clipboard for `${origin}/r/{refId}`. Refuses
  anything that fails the safe pattern (UUIDs, opaque tokens, blank values).
  Never invokes Supabase / edge functions, never renders `href="#"`.
- `ReferenceTag` — convenience wrapper that composes the two above.

## Explicitly NOT changed

- Invitation accept URLs (signed tokens).
- Unsubscribe / email-tracking / webhook URLs.
- OTP / magic-link / login URLs.
- Any UUID-based admin route.
- Schema, RLS, edge payment logic, reconcile cron, webhooks.