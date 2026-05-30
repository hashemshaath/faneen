# Cross-System Integration Audit

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase F._

For every system: inbound (creators) and outbound (children). Sourced from
`docs/system-relationship-map.md` and verified against module barrels under
`src/modules/**/index.ts`.

| System              | Inbound                          | Outbound                                      |
|---------------------|----------------------------------|-----------------------------------------------|
| Quote Request       | Public Quote form, Sectors page  | Lead (via `match-quote-request`)              |
| Lead                | Quote Request, manual provider entry | Quotation, Messaging conversation         |
| Quotation           | Lead, manual provider entry      | Contract, E-Signature                         |
| Contract            | Quotation                        | Work Order, Payment plan, Amendment, Closure  |
| Work Order          | Contract                         | Measurements, Production Board, Installation, Procurement Request |
| Measurements        | Work Order                       | BOQ                                           |
| BOQ                 | Measurements                     | Procurement Request                           |
| Procurement Request | BOQ, manual                      | Procurement RFQ                               |
| Procurement RFQ     | Procurement Request              | Supplier Quotes, Award                        |
| Supplier Quote      | Procurement RFQ                  | Award                                         |
| Award               | Supplier Quote                   | Work Order comment (PO handoff)               |
| Installation Appt   | Work Order                       | Customer Tracking event, Project Closure trigger |
| Customer Tracking   | Token issued from Contract/Install/Closure | Tracking events feed                |
| Project Closure     | Work Order completed / Install completed | Warranty issuance, Feedback request   |
| Warranty            | Project Closure                  | Warranty Claim → Claim Resolution             |
| Feedback / NPS      | Project Closure                  | (terminal — feeds Operations Center reports)  |
| Membership          | Provider onboarding              | Credits ledger                                |
| Credits             | Membership tier change, manual grant | Lead reveal eligibility                   |
| Provider Review     | Provider onboarding submission   | Live Provider Profile                         |
| Operations Center   | Reads all                        | Observability snapshot, alerts                |
| Observability       | Reads all                        | Pilot launch backlog entries                  |
| SEO Surface         | Businesses, Blog                 | Sitemap, JSON-LD, structured search           |
| Help Center         | Manual content + analytics       | Help Assistant context, contextual help mapping |

## Dead ends (terminal nodes — expected)
- Feedback / NPS — reports only
- Observability snapshot — feeds backlog only
- Sitemap — public surface
- Warranty Claim Resolved — closes the warranty loop

## Missing transitions (gaps)

| Edge | Status |
|------|--------|
| BOQ → Procurement Request (auto) | Manual today. Acceptable for pilot. Tracked in deferred backlog. |
| Award → dedicated PO entity | Handoff via WO comment. PO scaffold deferred to v2. |
| Closure → NPS auto-request | Inconsistent. Flagged in notification audit; safe repair queued. |
| Warranty Resolved → NPS re-prompt | Not present; deferred to v2. |

## Duplicate transitions
None found. The single creator/owner rule holds (one create-path per
entity, verified by isolation audits).

## Parallel systems
- **Messaging** runs in parallel with the sales chain (lead/quote/contract
  conversations). This is by design — not a duplicate.
- **Customer Tracking** runs in parallel with notifications — different
  audiences (customer self-service vs. authed dashboard).

## Verdict
Integration graph is **complete for v1.0 pilot** except the four gaps
above, all of which have documented safe repairs or deferred-backlog
entries.