# Workflow Architecture

_Last refreshed: APP-CODEBASE-CLEANUP-STABILIZE-2._

End-to-end map of how a sales/operations workflow flows through Qitaat. Each
stage links to its module in `src/modules/` and is enforced by RLS + isolation
audits (`scripts/*-isolation-audit.mjs`).

```text
Lead ─▶ Quote Request ─▶ Quotation ─▶ E-Signature ─▶ Contract Draft
                                                       │
                                                       ▼
                                            Work Order ─▶ Measurements
                                                       │       │
                                                       │       ▼
                                                       │   BOQ + Pricing
                                                       ▼
                                              Production Pipeline ─▶ SLA
                                                       │
                                                       ▼
                                              Delivery / Closeout
```

## Stage ownership

| Stage              | Module                                  | Notes |
|--------------------|-----------------------------------------|-------|
| Lead               | `src/modules/leads/`                    | Provider lead credits enforced via `@/modules/credits`. |
| Quote Request      | `src/modules/quotes/`                   | File uploads only through `uploadQuoteRequestFile` + `createSignedQuoteFileUrl`. |
| Quotation          | `src/modules/quotes/`                   | E-signature handled inside the same module. |
| Contract           | `src/modules/contracts/`                | Attachments through `src/modules/contracts/services/attachments/`. |
| Work Order         | `src/modules/workOrders/`               | Barrel: `src/modules/workOrders/index.ts`. |
| Measurements / BOQ | `src/modules/workOrders/lib/`           | mm units, CSV import. |
| Production Board   | `/dashboard/work-orders/board`          | Page: `src/pages/dashboard/ProductionBoardPage.tsx`. |
| SLA processor      | `src/modules/operations/`               | Cron-driven; see `docs/edge-cron-inventory.md`. |
| Notifications      | `src/modules/notifications/`            | 14 rich card types; industry-specific logic. |
| Files / Storage    | `src/modules/files/`                    | All buckets routed through canonical wrappers. |
| Procurement / RFQ  | `src/modules/procurement/`              | Request → RFQ → supplier quote → award. Inventory & supplier payments deferred. |

## Cross-cutting invariants

- **No direct `supabase.storage` from pages** — enforced by
  `scripts/storage-isolation-audit.mjs` + `f5StorageFinalSweep.test.ts`.
- **No direct `supabase.from('profiles' | 'user_roles')` from pages** —
  enforced by `scripts/identity-isolation-audit.mjs` +
  `scripts/profiles-isolation-audit.mjs`.
- **Credit operations** only via `@/modules/credits` (client) and
  `supabase/functions/_shared/credits` (edge) — see
  `docs/credits-architecture.md`.
- **Contracts lock on Active** — see `mem://features/contracts/lifecycle-and-legal`.
- **Edge functions always return 200 OK JSON** — see
  `src/modules/edge-functions-boundary.md`.

## Related docs

- `docs/work-order-lifecycle.md`
- `src/modules/procurement/README.md`
- `docs/contracts-system-overview.md`
- `docs/contract-pricing-engine.md`
- `docs/contracts-rpc-reference.md`
- `docs/deferred-backlog.md`
- `docs/production-readiness.md`
## BUSINESS-WORKFLOW-PROCUREMENT-3 — Line-Item RFQs, Notifications, Award Handoff

- **RFQ line items**: `procurement_rfq_items` (name, qty, unit, target_price, sort_order). CRUD via `createRfqItem`/`updateRfqItem`/`deleteRfqItem`/`listRfqItemsByRfq`/`reorderRfqItems`.
- **Supplier quote line items**: `procurement_supplier_quote_items` (unit_price, qty, total_price). Service: `submitQuoteItems`, `listQuoteItemsByQuote`, `listQuoteItemsByRfq`, `calculateLineTotal`.
- **Line-item comparison**: pure helper `compareQuotesWithLineItems` (no Supabase). Sorts by completeness DESC → effective total ASC → lead ASC → submitted ASC. Surfaces `missing_items` / `no_total` warnings and reason codes (`lowest_total`, `fastest_lead_time`, `most_complete`).
- **Notifications**: `notifyProcurementEvent` wraps `createNotificationFireAndForget`. Bilingual generic content, no supplier PII, never throws, no SMS/email/push/WhatsApp.
- **Award pipeline hop**: `awardRfqQuote` invokes the atomic `procurement_award_quote` RPC then best-effort calls `executeAwardHandoff` which posts a work-order comment via `addWorkOrderComment` (approved wrapper) and fans out `quote_awarded` notifications. No WO stage mutation, no inventory, no payments.
- **Idempotency**: `procurement_award_quote` returns successfully when re-awarding the same already-winning quote; awarding a different quote after one is awarded raises `rfq_already_awarded`.

### Deferred
- Inventory stock movements
- Supplier payments
- Public supplier portal access

## APP-STABILITY-CONTRACTS-PROCUREMENT-HARDENING-1 — Scope guards

The platform pricing engine remains **contract / quantity / measurement
driven**. Procurement is a sourcing tool for material and service
quotes — it does not feed inventory, does not generate supplier
payments, and does not expose a public supplier portal. These
boundaries are now enforced by
`src/__tests__/appStabilityContractsProcurementHardening.test.ts`
(10 static-source guards). Re-opening any of them must remove the
matching guard in the same change.
