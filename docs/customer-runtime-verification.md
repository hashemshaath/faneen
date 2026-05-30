# Customer Portal Runtime Verification

_RUNTIME-INTEGRATION-VERIFY-1 — Part C._

Verifies the customer-facing portal flows end-to-end against the modules
shipped under `src/modules/customerTracking/**` and the public customer
pages under `src/pages/customer/**`.

## Flow matrix

| Flow | Entry point | RPC / service | Page state update | Notification | Email | Audit row | Observability hit | Status |
|---|---|---|---|---|---|---|---|---|
| Tracking link open | `/c/{ref}/{token}` | `getCustomerProjectSnapshot` → `get_customer_project_snapshot` RPC | snapshot rendered, last-viewed tracked | – | – | ✓ `customer_tracking_visits` | ✓ visit counter | verified |
| Installation confirmation | Customer portal CTA | `confirm-installation` edge fn | status → `confirmed` | ✓ staff | ✓ `installation_confirmed` | ✓ `recordBusinessSourceAudit` | ✓ | verified |
| Project completion confirm | Customer portal CTA | `confirm-project-completion` edge fn | status → `confirmed`, closure unlocked | ✓ provider | ✓ `closure_signed` | ✓ | ✓ | verified |
| Feedback submission | Feedback form | `submit-feedback` edge fn | feedback recorded, thank-you state | ✓ provider | – | ✓ | ✓ | verified |
| NPS submission | NPS widget | `submit-nps` edge fn | score persisted, thank-you state | ✓ admin nudge (HARDENING-1-A — backlog) | – | ✓ `nps_responses` | ✓ NPS rollup | partial |
| Warranty follow-up | Customer portal CTA | `submit-warranty-claim` edge fn | claim opened | ✓ provider | ✓ `warranty_claim_submitted` | ✓ | ✓ | verified |

## Page state guarantees

- Every action invalidates the snapshot query (`useQuery` key includes
  `refId + token`) so the UI re-reads from `get_customer_project_snapshot`
  immediately after mutation.
- No client-side mutation calls `customer_tracking_links` directly; all
  reads go through the SECURITY DEFINER RPC and never log the raw token.

## Observability checks

- Each portal call increments `operations_observability_log` via the same
  `notifyDomainEvent` path used elsewhere — visible in the Operations Center
  Customer Funnel card.
- Help Center contextual mappings exist for every customer surface (see
  `docs/contextual-help-fit-check.md`).

## Known partial

- NPS submitted → admin nudge fanout is registered but the server emit is
  scheduled for pilot week 1 (`HARDENING-1-A`).

## Out of scope

- WhatsApp / SMS replies.
- Native mobile push.
- Supplier-portal flows (not part of v1).