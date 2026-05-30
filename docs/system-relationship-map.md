# System Relationship Map

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase C._

End-to-end dependency graph between business systems. Arrows = "creates" or
"feeds". Cross-cutting systems (Notifications, Reference Resolver, Files,
Observability) are inputs to almost every node and are listed separately.

## Primary sales-to-delivery chain

```text
Public Directory (SEO) ─▶ Quote Request ─▶ Lead ─▶ Quotation
                                                       │
                                                       ▼
                                                E-Signature
                                                       │
                                                       ▼
                                                  Contract
                                                       │
                                                       ▼
                                                Work Order
                                                       │
                       ┌───────────────────────────────┼───────────────────────────┐
                       ▼                               ▼                           ▼
                Measurements ─▶ BOQ ─▶ Procurement     Production Board       Installation Appt
                                       │                                            │
                                       ▼                                            ▼
                              Supplier RFQ ─▶ Supplier Quotes ─▶ Award ─▶ PO Handoff
                                                                                    │
                                                                                    ▼
                                                                          Project Closure
                                                                                    │
                                                                                    ▼
                                                                       Warranty ─▶ Feedback / NPS
```

## Customer self-service loop

```text
Customer Portal Token ─▶ Customer Tracking
                                │
                                ├─▶ Contract View / Sign
                                ├─▶ Installation Confirm
                                ├─▶ Closure Sign-off
                                ├─▶ Warranty Claim
                                └─▶ Feedback / NPS Submit
```

## Provider acquisition loop

```text
Public Directory ─▶ Provider Onboarding ─▶ Provider Review ─▶ Live Profile
                                                                       │
                                                                       ▼
                                                       Membership ─▶ Credits
                                                                       │
                                                                       ▼
                                                              Lead Eligibility
```

## Admin/ops loop

```text
Operations Center ─▶ Observability Snapshot ─▶ Alerts ─▶ Pilot Backlog
        │                                                       │
        ├─▶ Help Center analytics                               │
        ├─▶ Provider Growth metrics                             │
        └─▶ Data Integrity diagnostics ─────────────────────────┘
```

## Cross-cutting (consumed by every system above)

| System            | Consumed by |
|-------------------|-------------|
| Identity & Roles  | every authed surface |
| Notifications     | every state transition |
| Transactional Email | every external-facing event |
| Messaging         | leads, quotes, contracts, work-orders |
| Reference Resolver | every entity with a `ref_id` |
| Files / Storage   | quotes, contracts, work-orders, closure, warranty |
| Help Center       | every dashboard route (contextual help) |
| Observability     | reads from every domain |
| SEO Surface       | businesses, sectors, blog |

## Discovered relationships

| Source            | → | Target               | Channel |
|-------------------|---|----------------------|---------|
| Quote Request     | → | Lead                 | edge `match-quote-request` |
| Lead              | → | Quotation            | `convertLeadToQuotation` |
| Quotation         | → | Contract             | `convertQuotationToContract` |
| Contract          | → | Work Order           | `createWorkOrderFromContract` |
| Work Order        | → | Measurements         | `work_order_measurements` |
| Measurements      | → | BOQ                  | `work_order_boq` |
| BOQ               | → | Procurement Request  | manual + helper |
| Procurement RFQ   | → | Supplier Quote       | suppliers respond |
| Supplier Quote    | → | Award                | `procurement_award_quote` RPC |
| Award             | → | Work Order comment   | `executeAwardHandoff` |
| Work Order        | → | Installation Appt    | `installation_appointments` |
| Installation Appt | → | Customer Tracking    | tracking event |
| Work Order        | → | Project Closure      | `project_closures` |
| Project Closure   | → | Warranty             | warranty issuance |
| Project Closure   | → | Feedback / NPS       | feedback token |

## Known gaps (carried to Phase F)

- Purchase Orders has no dedicated entity — Award currently lands as a
  work-order comment. Acceptable for pilot; flagged in scorecard.
- BOQ → Procurement is partially manual (no auto-generation from BOQ rows).
- Warranty → Feedback loop exists, but warranty claim resolution does not
  re-trigger an NPS prompt.