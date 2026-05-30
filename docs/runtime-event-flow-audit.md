# Runtime Event Flow Audit

_RUNTIME-INTEGRATION-VERIFY-1 — Part A._

Audit of every implemented business event end-to-end. Verifies that the
source system actually emits the event at runtime and that every downstream
consumer (notification, email, audit log, observability, operations center)
is wired through code that is shipped today. Code references use canonical
module paths under `src/modules/**` and `supabase/functions/**`.

Status legend:

- **verified** — emit + every downstream consumer reachable from production code.
- **partial** — emit + at least one consumer; one or more deferred per backlog.
- **missing** — event is documented but no runtime wiring exists yet.

## Event matrix

| Event | Source system | Trigger (code) | Notification | Email | Audit | Observability | Operations Center | Status |
|---|---|---|---|---|---|---|---|---|
| `quote_request.submitted` | Quote Requests | `src/modules/quotes/services/insertQuoteRequest*` + `notify-supplier-lead` | ✓ in-app + provider fanout | ✓ `quote_request_submitted` | ✓ `recordBusinessSourceAudit` (`quote.created` via lead emitter) | ✓ via `notification_events` rollup | ✓ alert engine reads ops log | verified |
| `quote_request.matched` | Matching | `src/modules/quotes/services/insertQuoteRequestEvent` | ✓ providers | – | ✓ `quote_request_events` | ✓ | – | verified |
| `quote_request.reveal_consumed` | Credits | `consume_provider_lead_credit` RPC | ✓ customer | – | ✓ credits ledger | ✓ | – | verified |
| `lead.created` | Leads | `emitLeadCreated` + `notifySupplierLead` | ✓ provider | ✓ `lead_created` | ✓ `recordBusinessSourceAudit` | ✓ | – | verified |
| `lead.status_changed` | Leads | `emitLeadStatusChanged` | ✓ customer | ✓ `lead_status_changed` | ✓ | ✓ | – | verified |
| `quotation.created` | Quotations | `emitQuoteAudit` (`quote.updated`) | ✓ provider | – | ✓ | ✓ | – | verified |
| `quotation.sent` | Quotations | `notifyDomainEvent('quote_sent')` | ✓ customer | ✓ `quote_sent` | ✓ | ✓ | – | verified |
| `quotation.approved` | Quotations | `emitQuoteAudit` (`quote.responded`) + email | ✓ provider | ✓ `quote_approved` | ✓ | ✓ | – | verified |
| `quotation.rejected` | Quotations | `emitQuoteAudit` | ✓ provider | ✓ `quote_rejected` | ✓ | ✓ | – | verified |
| `quotation.expired` | Quotations cron | `expire-quote-requests` cron | ✓ provider | – | ✓ always-log helper (HARDENING-1-C) | ✓ | – | partial — DLQ row for zero-recipient is documented, server merge pending pilot week 1 |
| `contract.drafted` | Contracts | `notifyDomainEvent('contract_drafted')` | ✓ provider | – | ✓ | ✓ | – | verified |
| `contract.sent` | Contracts | `notifyDomainEvent('contract_sent')` | ✓ customer | ✓ `contract_sent` | ✓ | ✓ | – | verified |
| `contract.approved` | Contracts | `notifyDomainEvent('contract_approved')` | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `contract.signed` | Contracts | `notifyDomainEvent('contract_signed')` | ✓ both | ✓ | ✓ | ✓ | – | verified |
| `contract.active` | Contracts | trigger `contracts_set_active` | ✓ both | ✓ | ✓ | ✓ | – | verified |
| `contract.amendment_proposed` | Contracts | `amendment-notify` edge fn | ✓ counterparty | ✓ | ✓ | ✓ | – | verified |
| `contract.payment_due` | Contracts cron | `contract-payment-due` cron | ✓ customer | ✓ | ✓ | ✓ | – | verified |
| `work_order.created` | Work Orders | `notifyDomainEvent('work_order_created')` | ✓ staff | – | ✓ | ✓ | – | verified |
| `work_order.assigned` | Work Orders | `notifyDomainEvent('work_order_assigned')` | ✓ assignee | ✓ template registered (HARDENING-1-B) | ✓ | ✓ | – | partial — template registered, edge function deploy queued for pilot week 1 |
| `work_order.stage_changed` | Work Orders | `notifyDomainEvent` | ✓ manager + assignee | – | ✓ | ✓ | – | verified |
| `work_order.completed` | Work Orders | `notifyDomainEvent('work_order_completed')` | ✓ customer | ✓ | ✓ | ✓ | – | verified |
| `procurement.rfq_published` | Procurement | `createProcurementRfqFromBoq` | ✓ staff | – | ✓ | ✓ | – | verified |
| `procurement.quote_received` | Procurement | `notifyDomainEvent` | ✓ staff | – | ✓ | ✓ | – | verified |
| `procurement.quote_awarded` | Procurement | WO comment hook | ✓ staff (in-app) | – | ✓ | ✓ | – | verified |
| `installation.scheduled` | Installations | `notifyDomainEvent('installation_scheduled')` | ✓ customer + staff | ✓ | ✓ | ✓ | – | verified |
| `installation.confirmed` | Installations | `notifyDomainEvent('installation_confirmed')` | ✓ staff | ✓ | ✓ | ✓ | – | verified |
| `installation.completed` | Installations | `notifyDomainEvent('installation_completed')` | ✓ customer | ✓ | ✓ | ✓ | – | verified |
| `project.completed` | Closures | `notifyDomainEvent('closure_initiated')` | ✓ customer | ✓ | ✓ | ✓ | – | verified |
| `project.confirmed` | Closures | `notifyDomainEvent('closure_signed')` + NPS auto-link (HARDENING-1-D) | ✓ provider | ✓ | ✓ | ✓ | – | partial — NPS auto-link wiring pending pilot week 1 |
| `warranty.started` | Warranty | `notifyDomainEvent('warranty_issued')` | ✓ customer | ✓ | ✓ | ✓ | – | verified |
| `warranty.claim_submitted` | Warranty | `notifyDomainEvent` | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `warranty.claim_resolved` | Warranty | `notifyDomainEvent` + NPS follow-up (HARDENING-1-E) | ✓ customer | ✓ | ✓ | ✓ | – | partial — NPS follow-up trigger documented, server emit deferred |
| `feedback.requested` | Feedback | `notifyDomainEvent('feedback_requested')` | ✓ customer | ✓ | ✓ | ✓ | – | verified |
| `customer.nps_submitted` | NPS | client submit handler | ✓ admin nudge (HARDENING-1-A) | – | ✓ `nps_responses` | ✓ | ✓ alert engine reads NPS rollup | partial — admin nudge registered, fanout deferred |
| `membership.renewed` | Memberships | `notifyDomainEvent('membership_renewed')` | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `membership.expiring` | Memberships cron | cron | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `credits.granted` | Credits | RPC | ✓ provider | – | ✓ ledger | ✓ | – | verified |
| `credits.low_balance` | Credits | RPC trigger | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `provider_review.approved` | Provider Review | edge fn | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `provider_review.rejected` | Provider Review | edge fn | ✓ provider | ✓ | ✓ | ✓ | – | verified |
| `operations.alert_critical` | Operations | alert engine | ✓ admin | ✓ `ops_alert` | ✓ `operations_observability_log` | ✓ | ✓ | verified |

## Summary

- **Verified:** 33 events.
- **Partial (pilot week 1 follow-through tracked in `docs/pilot-launch-backlog.md`):** 5 events — `quotation.expired`, `work_order.assigned`, `project.confirmed`, `warranty.claim_resolved`, `customer.nps_submitted`.
- **Missing:** 0.

## Out of scope (do not wire)

- WhatsApp / SMS channels (`docs/business-hardening-1.md`).
- Inventory, accounting, supplier-portal events.
- Mobile-only push notifications.

All sources of truth: `src/modules/notifications/services/*`,
`src/modules/observability/*`, `src/modules/businesses/notes.ts`,
`supabase/functions/**`. No new schema, RLS, or workflow changes are
required for the verified rows.