# Notification Runtime Coverage Report

_RUNTIME-INTEGRATION-VERIFY-1 — Part F._

Cross-cuts the event flow audit (`docs/runtime-event-flow-audit.md`), the
notification coverage audit (`docs/notification-coverage-audit.md`), and the
contextual help fit check (`docs/contextual-help-fit-check.md`).

Channel symbols: **N** in-app · **E** transactional email · **A** audit row
· **O** observability rollup · **H** Help Center mapping present.

| Event | N | E | A | O | H | Notes |
|---|---|---|---|---|---|---|
| quotation.created | ✓ | – | ✓ | ✓ | ✓ | – |
| quotation.sent | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| quotation.approved | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| quotation.rejected | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| quotation.expired | ✓ | – | ✓* | ✓ | ✓ | *zero-recipient always-log helper documented; merge in pilot week 1 (HARDENING-1-C) |
| contract.drafted | ✓ | – | ✓ | ✓ | ✓ | – |
| contract.sent | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| contract.approved | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| contract.signed | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| contract.active | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| contract.amendment_proposed | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| contract.payment_due | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| work_order.created | ✓ | – | ✓ | ✓ | ✓ | – |
| work_order.assigned | ✓ | ✓* | ✓ | ✓ | ✓ | *template registered (HARDENING-1-B); pilot wk1 deploy |
| work_order.stage_changed | ✓ | – | ✓ | ✓ | ✓ | – |
| work_order.completed | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| installation.scheduled | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| installation.confirmed | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| installation.completed | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| project.completed | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| project.confirmed | ✓ | ✓ | ✓ | ✓ | ✓ | NPS auto-link wiring pending (HARDENING-1-D) |
| warranty.started | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| warranty.claim_submitted | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| warranty.claim_resolved | ✓ | ✓ | ✓ | ✓ | ✓ | NPS follow-up emit deferred (HARDENING-1-E) |
| customer.nps_submitted | ✓* | – | ✓ | ✓ | ✓ | *admin nudge registered (HARDENING-1-A) |

## Silent failures detected

- `quote_expired` cron previously skipped `notification_events` when zero
  recipients matched. Always-log helper documented in `docs/business-hardening-1.md`; client surface unchanged.

## Missing recipients detected

- None outstanding. Every event has a documented recipient or admin nudge.

## Missing templates detected

- `work_order_assigned` email template registered (HARDENING-1-B). Deploy
  scheduled for pilot week 1.

## Help coverage

- All 25 events above have a `contextualHelpRegistry` mapping, confirmed by
  `src/tests/businessSystemsArchitectureAudit1.test.ts` and
  `src/tests/pagePurposeWorkflowContextAudit1.test.ts`.

## Out of scope

- WhatsApp / SMS channels.
- Supplier portal events.
- Accounting / inventory events.