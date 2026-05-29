# BUSINESS-WORKFLOW-PROCUREMENT-2 — RFQ Lifecycle & Award

Builds on PROCUREMENT-1 (tables + services + list/detail pages already exist). Closes the gap between "draft request" and "awarded supplier" without adding inventory, supplier payments, cron jobs, or an external supplier portal.

## Goals
1. Move a procurement request through its full internal lifecycle.
2. Let business managers create RFQs, invite suppliers, capture quotes manually, compare, and award one.
3. Wire the award back to the originating work order as a structured event (no PO module yet).
4. Add notifications for key transitions (RFQ sent, quote received, quote awarded).
5. Keep strict business isolation; no UI → table access; full audits + tests green.

## Scope

### A. Data layer (single migration)
- Add columns:
  - `procurement_rfqs.expires_at timestamptz`, `sent_at timestamptz`, `awarded_quote_id uuid` (nullable, FK to supplier_quotes).
  - `procurement_supplier_quotes.status` enum-like text check (`pending`, `submitted`, `shortlisted`, `awarded`, `rejected`), `submitted_at`, `rejection_reason`.
  - `procurement_requests.awarded_at`, `linked_work_order_event_id` (nullable).
- New table `procurement_rfq_invitations` (rfq_id, supplier_id, invited_at, responded_at, status). Auto-numbering not needed.
- Validation trigger: cannot set `awarded_quote_id` unless that quote belongs to the RFQ and is `submitted` or `shortlisted`. Awarding flips request → `awarded`, RFQ → `closed`, quote → `awarded`, siblings → `rejected`.
- RLS: same business-scope helpers as PROCUREMENT-1; `GRANT` block in same migration; service_role full.

### B. Service layer (`src/modules/procurement/services/*`)
- `invitations.ts`: `listInvitationsByRfq`, `inviteSuppliersToRfq`, `markInvitationResponded`.
- Extend `rfqs.ts`: `sendRfq` (draft → sent, stamps `sent_at`), `closeRfq`, `awardRfqQuote` (single RPC call to a SECURITY DEFINER fn that performs the atomic flip).
- Extend `supplierQuotes.ts`: `submitQuote`, `shortlistQuote`, `rejectQuote`.
- Pure helper `services/awardEligibility.ts`: given a quote + RFQ, return `{ eligible, reason }`. Unit-tested.
- Barrel `index.ts` re-exports.

### C. UI (no new top-level routes)
On `DashboardProcurementDetail.tsx`:
- **RFQ panel**: status pill, "Send RFQ" button (draft only), "Close RFQ", expiry display.
- **Suppliers panel**: inline supplier picker (multi-select from existing `procurement_suppliers` for current business) + "Invite" inline form (no dialog). Shows invitation status per supplier.
- **Quotes panel**: existing comparison table + per-row inline actions: Shortlist, Reject, Award. "Award" expands an inline confirmation strip (NOT a dialog) per the no-popup rule.
- **Award result strip**: after award, shows awarded supplier + amount + link back to work order.

All bilingual via `<Bi>` / `useBi()`; logical CSS (`ms-`/`me-`/`text-start`); h-12 inputs, rounded-xl, IBM Plex Sans Arabic.

### D. Work-order integration
- On award: insert a `work_order_events` row of kind `procurement_awarded` with `{ rfq_id, supplier_id, quote_id, total_amount, currency }` payload. Store the event id back on `procurement_requests.linked_work_order_event_id`.
- Read path on the work-order detail page already renders generic events — no UI change needed there, just verify it renders the new kind label (i18n string added).

### E. Notifications
- Reuse existing notification service to emit:
  - `procurement.rfq_sent` → request owner.
  - `procurement.quote_submitted` → request owner.
  - `procurement.quote_awarded` → request owner + (later) supplier.
- Add the 3 keys to the notifications kind map; no new notification card type needed (use generic info card).

### F. Tests
- `awardEligibility.test.ts` — happy path + 5 rejection reasons.
- `transitions.test.ts` — extend with sent/closed/awarded transitions.
- `isolation.test.ts` — extend: new pages still don't import `supabase.from('procurement_*')` directly.
- New `invitations.service.test.ts` — mock supabase chain.

### G. Audits & docs
- Extend `scripts/procurement-isolation-audit.mjs` to cover `procurement_rfq_invitations`.
- Update `docs/workflow-architecture.md` and `docs/work-order-lifecycle.md` with the award → event hop.
- Update `docs/deferred-backlog.md`: explicitly defer (a) external supplier portal, (b) PO generation, (c) supplier payments, (d) RFQ expiry cron.

## Out of scope (explicit)
- External/public supplier portal or magic-link supplier responses.
- Purchase order generation, supplier payments, supplier-side auth.
- Cron-based RFQ auto-expiry (manual close only this phase).
- Realtime subscriptions for quote updates (poll via React Query, like existing pages).
- Inventory module.

## Validation gates
- `bunx tsc --noEmit` clean.
- `bunx vitest run` 100% green (current 4547+ baseline preserved).
- `procurement-isolation-audit`, `storage-isolation-audit`, `identity-isolation-audit`, `credits-isolation-audit`, `broken-links-audit`, `rtl-audit`, `sitemap-integrity-audit` all pass.
- Manual route check: `/dashboard/procurement` and `/dashboard/procurement/:id` render with new panels in RTL + LTR.

## Final report will include
PASS/FAIL · migration summary · new services · UI changes · WO integration · notification keys · audit + test results · deferred items.
