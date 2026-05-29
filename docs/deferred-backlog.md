# Deferred Backlog

_Last refreshed: APP-STABILITY-CONTRACTS-PROCUREMENT-HARDENING-1._

Features intentionally deferred so the current production-stability baseline
stays small and auditable. **Nothing here blocks production.** Each item lists
the trigger phase that may pick it up.

## Operations

| # | Item | Trigger / phase | Notes |
|---|------|-----------------|-------|
| 1 | Procurement / RFQ module | `BUSINESS-WORKFLOW-PROCUREMENT-1` | Distinct module under `src/modules/procurement/`. Needs RFQ schema + supplier scoping. |
| 1b | Procurement: Supplier portal + line-item RFQs | `BUSINESS-WORKFLOW-PROCUREMENT-3` | PROCUREMENT-2 added RFQ lifecycle (send/close), supplier invitations, shortlist/reject/award via atomic RPC `procurement_award_quote`. Still deferred: external supplier portal, multi-line items, attachments, RFQ expiry cron, notifications for RFQ events, work-order pipeline event hop on award. |
| 1c | Procurement: Supplier payments | `BUSINESS-WORKFLOW-PROCUREMENT-PAYMENTS-1` | Payments to suppliers explicitly out of scope until the payments phase. |
| 1d | Procurement: Inventory link | `BUSINESS-WORKFLOW-INVENTORY-1` | Awarded quotes do not yet create stock movements. |
| 2 | Inventory module | `BUSINESS-WORKFLOW-INVENTORY-1` | Stock, locations, movements. Tightly coupled to procurement. |
| 3 | Kanban drag/drop on production board | `BUSINESS-WORKFLOW-PRODUCTION-2` | Today the board is read-only. dnd-kit already in deps. |
| 4 | Realtime invalidation on production board | `BUSINESS-WORKFLOW-REALTIME-1` | Use existing `useRealtimeInvalidate`; needs `ALTER PUBLICATION` migration. |
| 5 | Mobile technician mode | `BUSINESS-WORKFLOW-MOBILE-1` | Compact PWA shell for field updates of measurements + status. |
| 6 | Payment schedule generation | `BUSINESS-WORKFLOW-PAYMENTS-1` | Auto-derive 30/40/30 payment schedule from contract value. Touches payment provider logic — out of stabilize scope. |
| 7 | Client portal enhancements | `BUSINESS-WORKFLOW-CLIENT-PORTAL-1` | Self-service status + document download for end customers. |

## Hygiene (non-blocking)

| # | Item | Notes |
|---|------|-------|
| H1 | Migrate remaining legacy `supabase.from` calls in pages to `src/modules/.../services/*` | Gradual, per `mem://tech/refactoring-policy`. |
| H2 | Author missing edge-function logs README per domain | Tracked alongside isolation audits. |

## Out of scope until explicitly re-opened

- Payment provider switches.
- Auth provider switches.
- Ownership-model changes.
- Schema-wide RLS rewrites.

## Verification

The deferred items above are confirmed **not present** in the current build
via the corresponding isolation audits and the green vitest baseline (see
`docs/production-readiness.md`).
## Procurement-3 deferred
- Inventory stock movement linkage on award
- Supplier payments / invoicing
- Public supplier portal (token-scoped quote submission)

## HARDENING-1 confirmation

The current baseline is **contract / quantity / measurement driven**.
Pricing flows through contracts and measurements; procurement is a
sourcing tool for material/service quotes only. The following are
actively guarded as deferred by
`src/__tests__/appStabilityContractsProcurementHardening.test.ts`:

- No `src/modules/inventory` module.
- No `inventory_*` / `stock_*` / `warehouse_*` table access from
  procurement services.
- No `/inventory` or `/dashboard/inventory` routes.
- No `supplier_payments` / `procurement_supplier_payments` table access
  anywhere in `src/`.
- No public `/supplier`, `/supplier-portal`, or `/portal/supplier` route.
- No `PublicSupplierPortal` / `SupplierPortal` page file.
- Procurement award handoff (`awardHandoff.ts`) makes no direct
  Supabase table or RPC calls into work-order stages, inventory, stock,
  or supplier payments — only the approved `addWorkOrderComment` +
  `notifyProcurementEvent` wrappers.

Re-opening any of these requires removing the corresponding guard test
in the same change, which forces an explicit phase decision.
