# Work Order Lifecycle

_Last refreshed: APP-CODEBASE-CLEANUP-STABILIZE-2._

Operational reference for the BUSINESS-WORKFLOW work-order stack.

## State machine

```text
draft ─▶ measuring ─▶ priced ─▶ quoted ─▶ signed ─▶ in_production ─▶ delivered ─▶ closed
   │                                                │
   └──────────── cancelled ◀────────────────────────┘
```

- Source of truth: `src/modules/workOrders/lib/` (state machine + guards).
- UI: `src/pages/dashboard/ProductionBoardPage.tsx` (`/dashboard/work-orders/board`).
- Regression: `src/__tests__/businessWorkflow7.productionBoard.test.tsx` — 17/17 pass.

## Sub-systems

### 1. Measurements & templates
- Units: millimetres only (see `mem://features/contracts/measurements-and-site-data`).
- CSV import + reusable templates per work-type.
- Editor mounted from the work-order detail page.

### 2. Attachments / signed URLs
- Bucket: `work-order-files` (private).
- Canonical upload: `src/modules/workOrders/services/uploadWorkOrderAttachmentFile.ts`.
- Direct `supabase.storage` access is **only** allowed inside
  `src/modules/workOrders/services/` — enforced by
  `scripts/storage-isolation-audit.mjs` and
  `src/modules/files/__tests__/f5StorageFinalSweep.test.ts`.
- Signed URLs created via the same module; never inline a `createSignedUrl`
  call from a page.

### 3. BOQ + pricing
- Engine: `src/lib/contract-pricing.ts` (shared with contract module).
- Reference: `docs/contract-pricing-engine.md`.

### 4. Quotation + e-signature → contract draft
- Quotation lives in `src/modules/quotes/`.
- E-signature flips state to `signed` and triggers contract-draft conversion
  in `src/modules/contracts/` (lifecycle locks on Active).

### 5. Production pipeline (board)
- Read-only board today (no drag/drop — see deferred backlog).
- Columns map 1:1 to states `in_production` → `delivered`.

### 6. SLA processor
- Cron-driven (`docs/edge-cron-inventory.md`).
- Flags overdue stages and writes notifications via
  `src/modules/notifications/`.

### 7. Procurement (optional link)
- Work orders may spawn `procurement_requests` (see
  `src/modules/procurement/`).
- Procurement does NOT yet create inventory movements or supplier payments.
- Cancelling a procurement request never mutates the parent work-order
  state machine.

## Privacy & security

- All work-order tables are RLS-scoped to the owning business +
  `is_business_staff()` membership.
- Edge functions touching work-orders use the shared credits/identity helpers
  (`supabase/functions/_shared/`).
- No PII (phone/email) is returned by lookup endpoints — public projections
  exclude these columns (`mem://tech/security/public-data-masking`).

## Verification commands

```bash
bunx vitest run src/__tests__/businessWorkflow7.productionBoard.test.tsx
node scripts/storage-isolation-audit.mjs
node scripts/identity-isolation-audit.mjs
```