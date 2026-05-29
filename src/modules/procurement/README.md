# Procurement Module

_BUSINESS-WORKFLOW-PROCUREMENT-1._

End-to-end flow:

```text
ProcurementRequest ─▶ RFQ ─▶ SupplierQuote(s) ─▶ Award
```

## Rules

- All Supabase table access is confined to `src/modules/procurement/services/*`.
- Pages/components consume the barrel only.
- `quoteComparison.ts` is a pure helper — no Supabase import.
- Business scoping is enforced by RLS + `business_id` filters in every wrapper.
- Supplier contact fields are limited to `name, contact_name, phone, email`.
- No inventory, no payments, no storage in this phase (see deferred backlog).

## Files

- `types.ts` — row/status types + allowed transitions.
- `services/procurementRequests.ts` — list/create/get/update-status.
- `services/rfqs.ts` — list/create-from-request/update-status.
- `services/suppliers.ts` — list/create/update-status.
- `services/supplierQuotes.ts` — submit/list-by-rfq/award.
- `services/quoteComparison.ts` — pure ranking helper.