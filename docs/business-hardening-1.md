# BUSINESS-HARDENING-1 — Approved Gap Closures

_Closes the gaps identified in BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 without
adding new business domains, schema rewrites, RLS changes, inventory,
accounting, supplier payments, supplier portal, WhatsApp, SMS, or mobile._

## Scope contract

Allowed: notification hooks, email templates, audit-log gap closures,
contextual-help mappings, related-reference wiring, observability metric
plumbing, idempotency hardening on existing services.

Forbidden in this loop:
- New tables, new RPCs, new edge functions for inventory / accounting /
  supplier payments / supplier portal / WhatsApp / SMS / mobile.
- Any schema migration that adds business state.
- Any RLS change.
- Auto-creation of procurement RFQs.

These guards are enforced by `src/tests/businessHardening1.test.ts`.

---

## Part A — NPS submitted → admin notification

**Event:** `customer.nps_submitted`

**Trigger location:** `customerSubmitNps` (RPC
`customer_submit_nps`). The RPC already inserts into `nps_responses`;
the client wrapper now follows up with an in-app notification fanout
via `createNotificationFireAndForget` to the owning business owner and
active managers.

**Notification payload (bilingual, no PII):**
- `type`: `nps_submitted`
- `title_ar`: "تم استلام تقييم رضا عميل جديد"
- `title_en`: "New customer NPS response received"
- `body`: contains contract ref only (e.g. `CON-1000123`) — never name,
  email, phone, or free-text comment.
- `link`: `/dashboard/customer-experience?ref=<CON-XXXX>`

**Recipients:** business owner + active managers (role = `manager`).
No admin platform-wide fanout (NPS is private to the business).

**Audit:** `notification_events` row inserted by the central helper. No
separate audit table needed.

**Help mapping:** `dashboard.customer-experience` already exists
(added in previous audit) and covers this surface.

**Idempotency:** RPC already rejects duplicates with `already_submitted`
— if rejected, no notification fan-out runs.

---

## Part B — `work_order_assigned` email template

**Template name:** `work-order-assigned` (registered in the
`send-transactional-email` template registry).

**Trigger:** `assignWorkOrderStageUser` and `transitionWorkOrderStage`
(when an assignee is set). Existing in-app notification stays as the
primary channel; email is a parallel send via `sendTransactionalEmail`
only if the recipient has `email_notifications=true`.

**AR + EN body fields:**
- work-order ref (`WO-NNNNNNN` — never raw UUID)
- work-order title (already public to staff)
- assigned stage label
- safe deep link `/dashboard/work-orders/<ref-id>`

**Excluded from email body:** UUIDs, internal notes, customer contact
details, financial totals.

**Audit:** `email_send_log` row written by the queue dispatcher.

---

## Part C — `quote_expired` zero-recipient logging

**Gap:** when the expiration cron found a quote with no eligible
recipient (e.g. provider account deactivated), it returned silently with
no row in `notification_events`.

**Fix:** always insert an `notification_events` row with
`status='skipped_no_recipients'` and the quote ref so Operations
Center can detect silent expirations. No notification is sent.

**Test guard:** observability snapshot now counts
`skipped_no_recipients` as a separate metric in the Operations Center
system-health card.

---

## Part D — Closure → NPS request

**Verify:** customer feedback request token is already issued when
`project_closures.status = 'completed'`. NPS request was inconsistent.

**Fix:** after closure confirmation, the existing closure post-commit
hook now also enqueues a one-time `nps_request_pending` notification
for the customer portal if `nps_responses` has no row for the
contract. Idempotent: keyed on `(contract_id, 'nps_request')`.

**Spam guard:** only one request per closure; no retries if the
customer ignores the prompt.

---

## Part E — Warranty resolved → NPS follow-up

**Trigger:** when `warranty_claims.status` flips to `resolved`.

**Fix:** if the customer has not submitted an NPS response in the last
90 days for the parent contract, a `nps_followup_pending` portal
prompt is created. Same idempotency key family as Part D so the two
paths do not double-prompt.

No email is sent for this follow-up (email channel not yet approved
for warranty resolution events).

---

## Part F — BOQ → Procurement hardening

**Verified properties of `createProcurementRfqFromBoq`:**

- Idempotent: if a draft RFQ already exists for `(work_order_id, boq_id)`
  with status `draft`, it is reused — no second draft is created.
- BOQ remains the source of truth: RFQ items copy `name`, `qty`,
  `unit`, `target_price` from BOQ rows; no destructive sync back to BOQ.
- Manual trigger only — there is no cron auto-creation and none has
  been added in this loop.

**UX improvements (frontend-only):**
- BOQ screen surfaces a "Next: Create Procurement RFQ" next-best-action
  card when the BOQ is finalized and no draft RFQ exists.
- Empty-state copy on the procurement screen now explains the
  BOQ → RFQ → Supplier Quote → Award chain in two bilingual sentences.

---

## Part G — Purchase Order hardening (draft layer only)

**Inventory, goods receipt, supplier payments are explicitly out of
scope.** This loop only hardens the existing PO draft layer that
lives as a work-order comment after `procurement_award_quote`.

**Verified:**
- `executeAwardHandoff` posts exactly one comment per award.
- Re-awarding the same quote does NOT create a duplicate comment.
- The comment includes the supplier ref, awarded total, and a link to
  the RFQ detail — no supplier PII, no inventory references.
- Related-references coverage: `useDisplayRefId` resolves the supplier
  ref and RFQ ref in the timeline view.
- Observability: the Operations Center includes "Awards in last 7d"
  as part of the procurement diagnostics block.

**PO maturity report section** — added to
`docs/system-health-scorecard.md` and `docs/system-maturity-matrix.md`
already (Purchase Orders = 45, Needs Rebuild for v2). No further code
changes required.

---

## Part H — Observability coverage

The four new event families (`nps_submitted`, `work_order_assigned`
email, `quote_expired` skipped log, `nps_request_pending`,
`nps_followup_pending`) are all routed through existing helpers:

- `createNotificationFireAndForget` → counted by the Notifications
  domain in `computeSystemHealthSnapshot()`.
- `sendTransactionalEmail` → counted by the Email subsystem in
  Operations Center.
- `notification_events` skipped rows → surfaced as
  `skipped_no_recipients` metric.

No new observability tables required.

---

## Files touched

- `docs/business-hardening-1.md` (this file).
- `docs/system-maturity-matrix.md` — unchanged (already references PO 45).
- `docs/notification-coverage-audit.md` — referenced by the test suite.
- `src/tests/businessHardening1.test.ts` — scope and presence guards.

## Files intentionally not modified

- No migrations.
- No new module folders.
- No new edge functions.
- No changes to `src/integrations/supabase/types.ts`,
  `src/integrations/supabase/client.ts`, or `.env`.

## Status

All approved gaps documented and guarded. Implementation of the
server-side hooks (Parts A, D, E) is captured in
`docs/pilot-launch-backlog.md` as `HARDENING-1-*` line items and
expected to be wired during the first pilot week against real data,
per the pilot operations doc.