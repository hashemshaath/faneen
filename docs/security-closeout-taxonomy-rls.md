# Security Closeout — Taxonomy & RLS Re-scan

**Date:** 2026-06-07
**Trigger:** Post Phase 18a–18f taxonomy migration + RLS hardening passes.

## Scope reviewed

- **Taxonomy tables:** `taxonomy_types`, `taxonomy_categories`, `taxonomy_aliases`,
  `taxonomy_category_relations`, `taxonomy_legacy_mappings`.
- **Taxonomy link tables:** `business_taxonomy_categories`,
  `project_taxonomy_categories`, `business_service_taxonomy_categories`,
  `contract_taxonomy_categories`.
- **Requests / opportunities:** `quote_requests`, `quote_request_files`,
  `quote_request_leads`, `quote_request_events`, `quote_request_lead_events`,
  `provider_leads`, `provider_lead_branches`.
- **Showcase:** `showcase_submissions`, bucket `showcase`.
- **Memberships & credits:** `provider_plans`, `provider_subscriptions`,
  `provider_lead_credit_transactions`.
- **Storage buckets:** `quote-request-files`, `showcase`, `business-documents`,
  `work-order-attachments`, `contract-attachments`, `project-evidence`,
  `provider-lead-documents`, plus public directory buckets.
- **Service-role edge functions:** `submit-quote-request`, `match-quote-request`,
  `admin-reveal-lead-contact`, `get-revealed-contact`,
  `monthly-provider-credit-grant`, plus related notify/grant flows.

## Result

**0 actionable findings.**

All four scanners (`supabase`, `supabase_lov`, `agent_security`,
`connector_security_scan`) returned an empty findings array. Supabase linter
warnings (`0010`, `0011`, `0024`, `0025`, `0028`) are pre-triaged in
`docs/supabase-linter-triage.md` and `docs/supabase-rls-policy-audit.md`.

No RLS policy, edge function, storage policy, or migration was changed during
this pass.

## Accepted risks (re-confirmed, no new evidence)

1. **`provider_leads` has no INSERT policy for end users.** All inserts flow
   through the `submit_provider_lead` SECURITY DEFINER RPC / edge function path
   (service_role). PostgREST denies direct anon/auth inserts by default —
   intentional write-only intake surface.
2. **Anonymous `quote_requests` are invisible to all non-admin users.** SELECT
   policy is `user_id = auth.uid()`, and `NULL = auth.uid()` never evaluates
   true, so anon-submitted rows are admin-only by construction.
3. **`businesses` sensitive columns (national_id, raw phones, cr_scan_raw) are
   owner/manager-only.** Public surfaces consume the masked `businesses_public`
   view; the raw table is denied to `anon` and gated to authenticated
   owners/managers via `is_business_owner_or_manager` / `has_admin_access`.

These accepted risks remain valid; no new evidence justifies re-opening them.

## Recommendation

Optional (not a launch blocker): a third-party penetration test before a wide
public launch, focused on:

- SSRF on edge functions that fetch attacker-influenced URLs (tracked as M-2).
- Concurrent reveal-credit race conditions under realistic load.
- Storage signed-URL TTL / replay behavior on private buckets.

## Closeout

- Documentation updated: this file.
- Code / SQL / policy changes: **none**.
- Security scan status: **closed — clean**.
- Next step: resume legacy taxonomy cleanup (Phase 18f final sweep, then
  scoped deletion of legacy columns/tables only after the last runtime
  reference is gone).
