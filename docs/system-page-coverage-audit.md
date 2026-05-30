# System Page Coverage Audit

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase G._

L = list page · D = detail page · C = creation flow · E = edit flow ·
R = reporting / dashboard · H = contextual help mapping (`src/modules/helpCenter/contextualHelp.ts`).

| System              | L | D | C | E | R | H | Notes |
|---------------------|---|---|---|---|---|---|-------|
| Identity & Roles    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Admin Users + self-profile |
| Businesses          | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Dashboard Business + admin Business Admin |
| Provider Directory  | ✓ | ✓ | n/a | n/a | n/a | ✓ | Public read-only |
| Provider Review     | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | Admin queue |
| Memberships         | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | Self-serve renewal + admin |
| Leads               | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Quote Requests      | ✓ | ✓ | ✓ (public) | ✓ | ✓ | ✓ | |
| Quotations          | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Contracts           | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Work Orders         | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Board view is the "R" |
| Measurements & BOQ  | – | ✓ | ✓ | ✓ | – | ✓ | List subsumed under WO detail |
| Production Board    | ✓ | – | n/a | n/a | ✓ | ✓ | Kanban acts as both L+R |
| Procurement         | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Procurement detail help mapping added in audit phase |
| Supplier Quotes     | – | ✓ | ✓ | ✓ | – | ✓ | List subsumed under RFQ detail |
| Purchase Orders     | – | – | – | – | – | – | Scaffold — no UI yet |
| Installation Appts  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Customer Tracking   | – | ✓ | n/a | n/a | ✓ | ✓ | Public token routes + admin dashboard |
| Project Closure     | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Warranty            | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Feedback / NPS      | ✓ | ✓ | ✓ (public) | n/a | ✓ | ✓ | |
| Notifications       | ✓ | ✓ | n/a | n/a | ✓ | ✓ | |
| Messaging           | ✓ | ✓ | ✓ | n/a | – | ✓ | |
| Help Center         | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Help Assistant      | – | – | n/a | n/a | ✓ | ✓ | Floating launcher only |
| Provider Growth     | – | – | n/a | n/a | ✓ | ✓ | Dashboard-only |
| Operations Center   | – | – | n/a | n/a | ✓ | ✓ | Single dashboard surface |
| Observability       | – | – | n/a | n/a | ✓ | ✓ | Embedded in Operations Center |
| Bookings            | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Catalog & Categories| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Client Sites        | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Loyalty             | ✓ | ✓ | n/a | n/a | ✓ | ✓ | |
| Installments / BNPL | – | ✓ | ✓ | n/a | – | ✓ | Inline under contracts |
| Blog / Content      | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Contact Center      | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | |

## Findings

- **Missing UI**: Purchase Orders (scaffold only) — by design until v2.
- **Hidden but reachable**: Customer Tracking has no L for staff (only
  embedded list under dashboard customer-experience). Acceptable —
  customer audience is token-based.
- **Duplicate pages**: None found. The orphan/duplicate sweep in
  `docs/orphan-duplicate-legacy-pages.md` is still green.
- **Admin-only**: Provider Review, Operations Center, Observability,
  Contact Center, Blog admin, Categories admin. All gated by `has_role`.
- **Customer-only**: Quote (public), Customer Tracking token routes,
  Closure sign-off, Warranty claim form, Feedback form.

No new pages created in this audit. Coverage matches the inventory in
`docs/page-integration-matrix.md`.