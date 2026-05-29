# Provider Journey — Qitaat v1.0

Provider = a business owner or member of business staff (`is_business_staff`).
All provider actions are authenticated; RLS scopes data to the business.

## Stages

1. **Business** — Onboarded via 3-step wizard. `BIZ` row remains
   `approval_status='draft'` until an admin publishes; only owners /
   staff / admins can preview the profile (`PublicUserProfile` and
   `BusinessProfile` show a "preview only" banner when not published).
2. **Staff** — Owner invites members (`STF-…`). RLS restricts staff to
   the business surface; sensitive admin tools require ownership.
3. **Quotation** — Receive a lead (`LED-…`) or create a quotation
   manually (`QUOTE-…`). Send via the public viewer link.
4. **Contract** — Convert approved quotation → `CONTRACT-…`. Lock on
   `active`; amendments tracked. Health Score and "days remaining"
   surface in the Contracts dashboard.
5. **BOQ** — Generate `BOQ-…` from contract; line items `BOQI-…` carry
   mm measurements and CSV import support.
6. **Procurement** — Issue `RFQ-…` to suppliers; collect supplier
   quotes; award one; emit `PO-…`. Customer never sees this layer.
7. **Work Order** — Active contract emits `WO-…`. Set due date,
   pipeline stage, assignee. Sub-tasks `TASK-…` flow through the
   operations feed.
8. **Production** — Track via pipeline stages, production timeline,
   and the operations center.
9. **Installation** — Create `APT-…`; customer confirms via token-gated
   portal. Provider sees confirmation status + reschedule requests.
10. **Closure** — Create `CLS-…` once installation completes. Optional
    delivery evidence `PDE-…` (customer-visible photos). Activate
    warranty `WAR-…`.

## Provider-only surfaces

| Surface                                | Notes                                          |
|----------------------------------------|------------------------------------------------|
| `/dashboard`                           | KPIs, alerts, recent activity                  |
| `/dashboard/contracts`                 | Contracts list, health, amendments             |
| `/dashboard/work-orders` + `?ref=…`    | Detail panel: BOQ, appointments, closure, war. |
| `/dashboard/procurement`               | RFQ board, supplier quotes, POs                |
| `/dashboard/operations`                | Operations Center: feed, KPIs, diagnostics     |
| `/dashboard/provider/leads`            | Quotations + leads                             |
| `/dashboard/settings/staff`            | Staff invitations + roles                      |

## Privacy contract

- Procurement & supplier data never leak into customer snapshots.
- Staff PII is never rendered on public pages.
- Audit metadata (created_by_uuid, edit history) stays inside admin
  surfaces.