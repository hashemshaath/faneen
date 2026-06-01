# Database Drift Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

## Method
- Spot-checked code references to tables, RPCs, views, enums, storage buckets against `src/integrations/supabase/types.ts` (regenerated from live schema).

## Results

| Surface | Result |
|---------|--------|
| Tables referenced in code but missing from types | **0** — schema includes `businesses`, `profiles`, `contracts`, `work_orders`, `notifications`, `quote_requests`, `help_articles`, plus `brand_*` family, `rfq_*` family, `membership_*` family, `provider_subscriptions`, `provider_credit_*`, etc. |
| Tables in schema with no code reference | not flagged as drift (history/audit tables intentionally schema-only) |
| RPCs referenced in code but missing | spot-check on `admin_search_users_for_transfer`, `has_role`, `consume_provider_lead_credit`, `admin_adjust_provider_credits`, `validate_brand_id_approved` — all present (covered by `src/__tests__/supabaseFunctionsInventory.test.ts`, `src/tests/rfqBrandModelAudit1.test.ts`, `credits-isolation-audit`) |
| Storage buckets referenced in code | All 7 (`business-assets`, `portfolio-images`, `project-images`, `blog-images`, `showcase`, `business-documents`, `brand-assets`) match `docs/database-inventory.md` |
| Generated types mismatch | none detected at audit time |

## Drift findings

**None.** Generated types match live schema (RFQ brand picker 1A/1B/1C columns present: `preferred_brand_ids`, `brand_preference_mode`, `brand_id`, `requested_brand_id`, `proposed_brand_id`).

## Recommended actions

None. No repair migration required.