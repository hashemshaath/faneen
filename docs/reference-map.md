# Reference Map — Qitaat v1.0

Last updated: PRODUCTION-RELEASE-READINESS-2.

Every human-facing identifier in Qitaat uses the `PREFIX-NNNNNNN` shape
(see `docs/reference-id-architecture.md`). The universal resolver
`/r/:refId` (see `src/pages/ReferenceResolver.tsx`) calls the
`lookup_by_reference` SECURITY DEFINER RPC and redirects to the
canonical internal route. The client-side `refRouteMap`
(`src/modules/workspace/shell/refRouteMap.ts`) powers the
WorkspaceSearchLauncher + CommandPalette (Ctrl/Cmd+K) so that typing
`WO-1000042` jumps straight to the right dashboard surface.

## Prefixes supported by v1.0

| Prefix    | Entity                              | Route                                        |
|-----------|-------------------------------------|----------------------------------------------|
| WO        | Work order                          | `/dashboard/work-orders?ref=…`               |
| WOQ       | Work order quote                    | `/dashboard/work-orders?ref=…`               |
| TASK      | Operational task                    | `/dashboard/operations/feed?ref=…`           |
| BOQ       | Bill of quantities                  | `/dashboard/work-orders?ref=…`               |
| BOQI      | BOQ line item                       | `/dashboard/work-orders?ref=…`               |
| RFQ       | Request for quotation               | `/dashboard/procurement?ref=…`               |
| PO        | Purchase order                      | `/dashboard/procurement?ref=…`               |
| CONTRACT  | Contract (canonical)                | `/dashboard/contracts?ref=…`                 |
| CNT       | Contract (legacy alias)             | `/dashboard/contracts?ref=…`                 |
| QUOTE     | Quotation (canonical)               | `/dashboard/provider/leads?ref=…`            |
| QTE       | Quotation (legacy alias)            | `/dashboard/provider/leads?ref=…`            |
| LED       | Lead                                | `/dashboard/leads?ref=…`                     |
| BKG       | Booking                             | `/dashboard/bookings?ref=…`                  |
| TEAM/STF  | Team member / staff                 | `/dashboard/settings/staff?ref=…`            |
| NOTE      | Operations note                     | `/dashboard/operations/feed?ref=…`           |
| APT       | Installation appointment            | `/dashboard/work-orders?ref=…`               |
| CLS       | Project closure                     | `/dashboard/work-orders?ref=…`               |
| WAR       | Work order warranty                 | `/dashboard/work-orders?ref=…`               |
| FDB       | Customer feedback                   | `/dashboard/operations/feed?ref=…`           |
| CPN       | Customer portal notification        | `/dashboard/operations/feed?ref=…`           |
| CTL       | Customer tracking link              | `/dashboard/work-orders?ref=…`               |
| PDE       | Project delivery evidence           | `/dashboard/work-orders?ref=…`               |

## Security guardrails

- `/r/:refId` rejects raw UUIDs and oversized strings before calling the
  RPC (`SAFE_REF_PATTERN`, max length 48).
- Customer emails never contain raw UUIDs or RPC tokens. Customer URLs
  always use the `?token=<token>` query (token_hash stored, raw never
  logged) or human-readable refs.
- Admin-only fallback for raw UUID lookups lives in the DB function,
  gated by `has_admin_access()`.

## Tests

- `src/__tests__/appShellRearchitecture1.refRouteMap.test.ts`
- `src/tests/releaseReadiness2.smoke.test.ts`