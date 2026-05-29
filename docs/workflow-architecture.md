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
- `docs/contracts-system-overview.md`
- `docs/contract-pricing-engine.md`
- `docs/contracts-rpc-reference.md`
- `docs/deferred-backlog.md`
- `docs/production-readiness.md`