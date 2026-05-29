# Deferred Backlog

_Last refreshed: APP-CODEBASE-CLEANUP-STABILIZE-2._

Features intentionally deferred so the current production-stability baseline
stays small and auditable. **Nothing here blocks production.** Each item lists
the trigger phase that may pick it up.

## Operations

| # | Item | Trigger / phase | Notes |
|---|------|-----------------|-------|
| 1 | Procurement / RFQ module | `BUSINESS-WORKFLOW-PROCUREMENT-1` | Distinct module under `src/modules/procurement/`. Needs RFQ schema + supplier scoping. |
| 1b | Procurement: Supplier portal + line-item RFQs | `BUSINESS-WORKFLOW-PROCUREMENT-2` | Foundation shipped in PROCUREMENT-1 (request → RFQ → supplier quote → award). Supplier-facing portal, multi-line items, attachments still deferred. |
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