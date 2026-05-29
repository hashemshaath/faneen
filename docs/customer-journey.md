# Customer Journey — Qitaat v1.0

End-to-end, anonymous-token-gated flow from first contact to warranty.
No customer login exists in v1.0 — all customer interactions are
authenticated via per-link `token` parameters that hash-match a row in
the DB. The customer never sees raw UUIDs, internal notes, supplier
quotes, RFQ data, technician identifiers, or audit metadata.

## Stages

1. **Lead** — Captured via `/contact`, public quotation viewer
   (`/q/:refId`), or provider intake. Stored as `LED-…`.
2. **Quotation** — Provider drafts `QUOTE-…` from the lead. Customer
   reviews via `/q/:refId` (no token needed for the public viewer when
   the provider chose "share publicly"; otherwise tokenised link).
3. **Approval** — Customer accepts in the public viewer; quotation
   transitions to `approved` and a draft contract is auto-suggested.
4. **Contract Draft** — Provider finalises `CONTRACT-…` (BOQ, payment
   schedule 30/40/30, VAT 15% inclusive, mm measurements). Contract
   locks on `active`.
5. **Work Order** — Active contract emits `WO-…` with pipeline stages
   (planning → measurement → production → finishing → delivery →
   installation → completed).
6. **Production** — Internal only. Customer sees a sanitised progress
   percentage through the tracking portal; no staff names, no internal
   notes, no procurement data.
7. **Installation** — Provider schedules `APT-…`. Customer receives an
   email + portal entry to **confirm**, **request reschedule**, or view
   the date. After installation the provider marks complete.
8. **Completion** — Provider creates `CLS-…` (project closure). Customer
   gets a "your project is ready — please confirm" email + portal CTA.
   Customer can confirm or report an issue (token-gated).
9. **Feedback** — Optional `FDB-…` with rating + comment.
10. **NPS** — Optional 0–10 score, classified Promoter/Passive/Detractor.
11. **Warranty** — Provider activates `WAR-…` on closure; portal shows
    coverage scope, start/end dates, status (active/expired). Customer
    is notified by email; expiry alerts surface in Operations Center.

## Customer-facing surfaces

| Surface                          | Auth                | Reveals                                                |
|----------------------------------|---------------------|--------------------------------------------------------|
| `/q/:refId`                      | Public or `?token=` | Quotation totals, line items, accept/reject            |
| `/customer/projects/:refId`      | `?token=` only      | Sanitised work-order snapshot, appointment, closure    |
| Email templates                  | Per-event           | Bilingual; no UUIDs; deep-links carry token            |

## Privacy contract

The `get_customer_project_snapshot` RPC strips: `internal_note`,
supplier quotes, RFQ comparison data, staff PII, raw UUIDs, login email,
phone (unless the provider explicitly published it), and tokens.

## Known v1.0 limits

- No customer account / login.
- No warranty-claim workflow.
- No service requests / maintenance visits.
- No SMS / WhatsApp channels — email + portal only.