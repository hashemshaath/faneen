# Microservice Boundary Map — v1.0 Monolith → Future Extraction Plan

_Roadmap only. **No extractions performed in this phase.**_

## Current monolith domains

| # | Service | Tables (representative) | Wrappers | UI surfaces | Events emitted | Cross-domain dependencies |
|---|---------|------------------------|----------|-------------|----------------|--------------------------|
| 1 | **Identity & Access** | `profiles`, `user_roles`, `access_violation_log` | `modules/identity`, `modules/users` | `/auth`, `/onboarding`, `/admin/identity` | `user.created`, `role.assigned` | All domains depend on `has_role()` |
| 2 | **Business Directory** | `businesses`, `business_branches`, `business_staff`, `businesses_public` | `modules/businesses` | `/search`, `/:username`, `/admin/businesses` | `business.published`, `business.updated` | Identity |
| 3 | **Contract** | `contracts`, `contract_amendments`, `contract_attachments` | `modules/contracts` | `/contracts/*`, `/dashboard/contracts` | `contract.activated`, `contract.locked` | Identity, Business |
| 4 | **Quote / Lead** | `quote_requests`, `quotations`, `quotation_items`, `boq_*` | `modules/leads`, `modules/quotes` | `/quote`, `/dashboard/leads`, `/dashboard/provider/leads` | `lead.created`, `quote.approved` | Identity, Business, Credits |
| 5 | **Work Order & Production** | `work_orders`, `work_order_stages`, `work_order_notes` | `modules/workOrders` | `/dashboard/work-orders/*` | `wo.created`, `wo.stage.changed`, `wo.completed` | Contract, Procurement, Closure |
| 6 | **Procurement** | `rfqs`, `rfq_items`, `rfq_supplier_quotes`, `purchase_orders` | `modules/procurement` | `/dashboard/procurement/*` | `rfq.awarded`, `po.drafted` | Work Order |
| 7 | **Customer Experience** | `customer_tracking_links`, `customer_tracking_events`, `installation_appointments`, `project_closures`, `customer_feedback`, `customer_nps_responses`, `work_order_warranties` | `modules/customerTracking`, `modules/installationAppointments`, `modules/projectClosure` | `/client/:refId` (token), provider-side cards | `installation.confirmed`, `project.closed`, `feedback.received`, `warranty.started` | Work Order, Notification |
| 8 | **Notification** | `notifications`, `notification_*`, `email_queue` | `modules/notifications`, `_shared/transactional-email-templates` | `/notifications`, email | n/a (consumer) | All domains |
| 9 | **Operations Intelligence** | `cron_runs`, `sla_*`, `audit_log` | `modules/operations`, `modules/health` | `/dashboard/operations-center`, `/admin/operations` | `sla.breached` | Reads all |
| 10 | **Membership / Credits** | `memberships`, `membership_payments`, `credit_*`, `provider_lead_credit_*` | `modules/memberships`, `modules/credits`, `_shared/credits` | `/membership`, `/admin/membership-payments` | `membership.renewed`, `credit.granted`, `credit.debited` | Identity |

## Future extraction order (lowest risk first)

1. **Notification Service** — consumer-only, no upstream deps; easiest to lift first.
2. **Operations Intelligence** — read-only across domains; easy to externalize behind a read API.
3. **Customer Experience** — token-scoped, already isolated by RPC surface.
4. **Membership / Credits** — well-isolated ledger, idempotency in place.
5. **Procurement** — pair with Work Order; share `business_id` boundary.
6. **Quote / Lead** — depends on Credits + Business.
7. **Contract** — central; extract late.
8. **Work Order & Production** — central; extract late.
9. **Business Directory** — foundational; extract second-to-last.
10. **Identity & Access** — foundational; extract last (or keep as shared auth gateway).

## Do-not-cross rules

- No service may `SELECT` from another service's raw tables; cross only via public RPCs or events.
- Customer Experience never reads supplier/staff data.
- Notification never writes domain rows; only reads + dispatches.
- Operations Intelligence is read-only; never mutates outside its own `cron_runs` / `audit_log`.
- Credits ledger is append-only (enforced by trigger).

## Shared tables to avoid coupling on

- `profiles` — read via `listProfilesByUserIds` only.
- `businesses` — read via `businesses_public` view from any non-Business service.
- `email_queue` — write via Notification wrappers only.

## Risk notes

- Highest extraction risk: **Work Order ↔ Procurement ↔ Closure** — share `work_order_id` heavily. Extract together.
- Lowest extraction risk: **Notification**.
- Event-driven candidates: post-publish business indexing, post-closure warranty start, post-payment credit grant.

No extractions in this phase.