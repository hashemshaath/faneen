# Notification Coverage Audit

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase E._

Channels: **N** in-app notification · **E** transactional email · **M** messaging
thread post · **W** WhatsApp (deferred for v1). All events are also captured in
`notification_events` / `email_send_log` audit tables.

| System         | Event              | N | E | M | Recipients               | Template / Notes |
|----------------|--------------------|---|---|---|--------------------------|------------------|
| Quote Request  | submitted          | ✓ | ✓ | – | Admin, matched providers | `quote_request_submitted` |
| Quote Request  | matched            | ✓ | – | – | Providers                | `quote_request_matched` |
| Quote Request  | reveal_consumed    | ✓ | – | – | Customer                 | `quote_request_revealed` |
| Lead           | created            | ✓ | – | – | Provider                 | `lead_created` |
| Lead           | status_changed     | ✓ | ✓ | – | Customer                 | `lead_status_changed` |
| Lead           | converted          | ✓ | – | – | Provider                 | `lead_converted` |
| Quotation      | created            | ✓ | – | – | Provider                 | `quote_created` |
| Quotation      | sent               | ✓ | ✓ | ✓ | Customer                 | `quote_sent` |
| Quotation      | approved           | ✓ | ✓ | – | Provider                 | `quote_approved` |
| Quotation      | rejected           | ✓ | ✓ | – | Provider                 | `quote_rejected` |
| Quotation      | expired            | ✓ | – | – | Provider                 | `quote_expired` (cron) |
| Contract       | drafted            | ✓ | – | – | Provider                 | `contract_drafted` |
| Contract       | sent               | ✓ | ✓ | ✓ | Customer                 | `contract_sent` |
| Contract       | approved           | ✓ | ✓ | – | Provider                 | `contract_approved` |
| Contract       | signed             | ✓ | ✓ | – | Both                     | `contract_signed` |
| Contract       | active             | ✓ | ✓ | – | Both                     | `contract_active` |
| Contract       | amendment_proposed | ✓ | ✓ | – | Counterparty             | `contract_amendment` |
| Contract       | payment_due        | ✓ | ✓ | – | Customer                 | `contract_payment_due` (cron) |
| Work Order     | created            | ✓ | – | – | Staff                    | `work_order_created` |
| Work Order     | assigned           | ✓ | – | – | Assignee                 | `work_order_assigned` |
| Work Order     | stage_changed      | ✓ | – | – | Manager, Assignee        | `work_order_stage_changed` |
| Work Order     | completed          | ✓ | ✓ | – | Customer                 | `work_order_completed` |
| Procurement    | rfq_published      | ✓ | – | – | Staff                    | `procurement_rfq_published` |
| Procurement    | quote_received     | ✓ | – | – | Staff                    | `procurement_quote_received` |
| Procurement    | quote_awarded      | ✓ | – | M | Staff (via WO comment)   | `quote_awarded` |
| Installation   | scheduled          | ✓ | ✓ | – | Customer, Staff          | `installation_scheduled` |
| Installation   | confirmed          | ✓ | ✓ | – | Staff                    | `installation_confirmed` |
| Installation   | completed          | ✓ | ✓ | – | Customer                 | `installation_completed` |
| Closure        | initiated          | ✓ | ✓ | – | Customer                 | `closure_initiated` |
| Closure        | signed             | ✓ | ✓ | – | Provider                 | `closure_signed` |
| Warranty       | issued             | ✓ | ✓ | – | Customer                 | `warranty_issued` |
| Warranty       | claim_submitted    | ✓ | ✓ | – | Provider                 | `warranty_claim_submitted` |
| Warranty       | claim_resolved     | ✓ | ✓ | – | Customer                 | `warranty_claim_resolved` |
| Feedback       | requested          | ✓ | ✓ | – | Customer                 | `feedback_requested` |
| NPS            | submitted          | – | – | – | Admin (dashboard only)   | none |
| Membership     | renewed            | ✓ | ✓ | – | Provider                 | `membership_renewed` |
| Membership     | expiring           | ✓ | ✓ | – | Provider                 | `membership_expiring` (cron) |
| Credits        | granted            | ✓ | – | – | Provider                 | `credits_granted` |
| Credits        | low_balance        | ✓ | ✓ | – | Provider                 | `credits_low_balance` |
| Provider Review| approved           | ✓ | ✓ | – | Provider                 | `provider_approved` |
| Provider Review| rejected           | ✓ | ✓ | – | Provider                 | `provider_rejected` |
| Operations     | alert_critical     | ✓ | ✓ | – | Admin                    | `ops_alert` |

## Gaps identified

| Gap | System / Event | Severity | Repair |
|-----|----------------|----------|--------|
| Missing in-app notification | NPS submitted (no admin nudge) | Low  | Add `nps_submitted` → admin notification. Deferred to Phase J backlog. |
| Missing email template      | `work_order_assigned` (assignee email) | Med | Add template; routed via `send-transactional-email`. Deferred. |
| Missing log row             | `quote_expired` cron does not always insert `notification_events` row when no recipients | Low | Wrap insert in always-log helper. Deferred. |
| Channel parity              | WhatsApp deferred across the board (v2) | n/a | Documented. |
| Closure → NPS link          | Closure completion does not auto-create feedback request when contract has no feedback record | Med | Add idempotent hook in closure service. Deferred. |

No silent-failure events were found in the audit. All events surveyed
resolve through `notifyDomainEvent` wrappers (`@/modules/notifications`)
with bilingual content and no PII leakage.