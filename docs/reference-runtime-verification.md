# Reference Resolver Runtime Verification

_RUNTIME-INTEGRATION-VERIFY-1 — Part E._

Verifies the `/r/{ref}` resolver and the SECURITY DEFINER RPC
`public.lookup_by_reference` against every active prefix shipped today.
See also `docs/reference-resolver-coverage.md` for the safe-link policy.

## Active ref types

| Prefix | Domain | Canonical route | Permission gate | Breadcrumb root | Resolver verified |
|---|---|---|---|---|---|
| RFQ | Quote requests | `/dashboard/my-requests/{id}` (alias of QTE) | Auth (customer/staff) | Requests | ✓ |
| QTE | Quotations | `/dashboard/my-requests/{id}` | Auth | Requests | ✓ |
| CONTRACT (CNT) | Contracts | `/contracts/{id}` | Auth (party or admin) | Contracts | ✓ |
| WO | Work orders | `/dashboard/work-orders/{id}` | Provider staff | Work Orders | ✓ |
| BOQ | Bill of Quantities | `/contracts/{contractId}/boq/{boqId}` | Contract party | Contracts › BOQ | ✓ |
| PO | Purchase orders | `/dashboard/procurement/po/{id}` | Procurement staff | Procurement | ✓ |
| CTL | Customer tracking link | `/c/{ref}/{token}` (public, token-gated) | Token check | Customer Portal | ✓ |
| CPN | Customer portal NPS | `/c/{ref}/{token}#nps` | Token check | Customer Portal | ✓ |
| CLS | Project closure | `/contracts/{id}/closure` | Contract party | Contracts › Closure | ✓ |
| WAR | Warranty | `/dashboard/warranties/{id}` | Customer / provider | Warranties | ✓ |
| FDB | Feedback record | `/dashboard/reviews/{id}` | Provider staff | Reviews | ✓ |
| APT | Appointment / installation | `/dashboard/bookings#{id}` | Auth | Bookings | ✓ |

## Verification method

For each prefix above we confirm:

1. The DB function returns a non-null `canonical_route` (or a safe null with
   resolver fallback) for a representative seeded row.
2. The resolver UI (`/r/{ref}`) navigates to the canonical route without
   intermediate redirect loops.
3. RLS denies non-owners — the resolver returns `not_found` rather than
   leaking the route.
4. Breadcrumbs are rebuilt by `useBreadcrumbs` using the resolved route, no
   UUIDs surface in the UI.

## Explicitly excluded from `/r/` routing

- STI (still-token) — admin-only, never linkable outbound.
- TKT — not yet wired.
- Invitation, magic-link, OTP, unsubscribe and webhook URLs.
- Synthetic phone-only auth emails / provider intent IDs.

## Validation

- `scripts/broken-links-audit.mjs` — green.
- `src/modules/reference/services/lookupByReference` — unchanged.
- No new prefixes added in this loop.