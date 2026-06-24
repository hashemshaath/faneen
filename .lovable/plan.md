# CONTRACT CREATION FLOW STABILIZATION + SECURITY CLEANUP — Plan

This is a large audit/cleanup pass. Before touching code, I want to confirm scope so I don't burn credits on the wrong areas.

## Scope I will cover

1. **Create flow cleanup** (`DashboardContracts.tsx` + `create/*` sections)
   - Verify step order: purpose/work type → template → parties → details → site → review.
   - Remove any remaining duplicate headers/state; ensure no removed sections regress.
   - Extract duplicated state between `TemplateSelectionSection` and `DashboardContracts` where safe.

2. **Template picker hardening**
   - Single Arabic pricing-method helper (`formatPricingMethodLabel`) — remove inline strings.
   - Confirm search works AR+EN, categorized grouping, "عرض جميع القوالب" preserves `status=published` + `is_active` filter.
   - Admin-only "إضافة قالب"; ensure "طلب إضافة قالب" is gone.

3. **Work type / activity**
   - Use taxonomy-backed `WORK_TYPES` only.
   - Auto-fill EN from AR only when EN is empty (no overwrite of manual input).
   - Remove any `any`/`as any`.

4. **Parties**
   - Provider can't pick self as client; client can't pick self as provider; no duplicate second-party row.
   - No client duplication on submit (rely on existing RPC).

5. **RLS / GRANTs audit**
   - Re-check the four recent migrations for templates.
   - Tighten: `anon` should only read via `contract_template_versions_public` (published) — not raw `contract_template_versions`.
   - `authenticated` SELECT on raw `contract_template_versions` must keep `USING (status='published')`.
   - `contract_template_pricing_rules` / `required_fields` reads scoped to published versions only.
   - If the previous wide GRANT to `anon` on raw tables exists, narrow it via a follow-up migration.

6. **Tests**
   - Targeted: template picker, party model, client auto-fill, enable-creation, dashboardContractsPageExtractionCloseout.
   - `tsgo` typecheck.
   - Full `bunx vitest run`.

## What I will NOT touch

- Contract lifecycle (create/sign/approve RPCs).
- PDF / QR / email / notifications.
- Any UI outside the create flow + template picker.
- Removed sections will stay removed (execution-site duplicate, "طلب إضافة قالب", duplicate status header, duplicate second-party row).

## Deliverable

The full `CONTRACT CREATION FLOW STABILIZATION + SECURITY CLEANUP REPORT` with all 21 items answered, after running typecheck + targeted tests + full suite.

## Risk / cost note

This audit will touch ~6 frontend files, possibly 1 tightening migration, and run the full vitest suite. It will consume meaningful credits. Please confirm before I proceed, or tell me to narrow scope (e.g., RLS-only, or picker-only).
