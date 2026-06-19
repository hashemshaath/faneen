# PROVIDER INTAKE CENTER — AUDIT REPORT

**Date:** 2026-06-19  **Decision:** `PROVIDER INTAKE CENTER PASS (REUSE EXISTING)`

## 1. Verdict

The full intake → cleaning → dedup → CRM-lite → manual draft pipeline described
in the brief **already exists** in the codebase under three cooperating systems.
Per the standing rule *"if a similar system exists, do not build a new one —
improve only"* (reaffirmed in the prior `PROVIDER PILOT READINESS OPERATIONS`
sprint), **no new tables, no new admin page, no new RPCs, no new edge
functions, and no migrations** were created.

## 2. Coverage map (spec → existing implementation)

| Spec requirement | Existing system | Notes |
|---|---|---|
| Excel/CSV upload + column mapping | `src/pages/admin/AdminDataEnrichment.tsx` (`import * as XLSX from "xlsx"`) | Already parses workbooks, drives review wizard |
| Per-row preview / review | `AdminDataEnrichment` 3-step wizard (Sources → Review → Apply) | Inline, no popups |
| Normalization (name AR/EN, city, district, sector, phone, email, website) | `src/lib/cityNormalize.ts`, `src/lib/normalize-digits.ts`, `src/lib/identity/canonicalEmail.ts`, taxonomy helpers in `src/services/categories/`, `src/lib/sa-cities.ts` | All reused by enrichment + provider-leads RPC |
| Quality score | `provider_growth_pipeline.readiness_score` | Stored per candidate |
| Strong dedup (unified_number / CR / phone / email) | Partial unique indexes on `provider_leads` (lower(email), normalized phone, cr_number, unified_number) WHERE status IN ('new','under_review','needs_info') | DB-enforced, friendly errors via `submit_provider_lead` RPC |
| Possible-duplicate / needs review | `provider_leads.status = 'needs_info'` + `provider_growth_pipeline.stage` | Manual review queue |
| CRM-lite (assigned operator, last contact, notes, next action) | `provider_growth_pipeline` (assigned_to, stage, readiness_score, metadata jsonb, notes) + `business_internal_notes` + `admin_operational_notes` + `operational_alerts` | All 4 already wired |
| Pilot consent / accepts test RFQ | `provider_growth_pipeline.metadata` (jsonb) | Free-form, already used by ops |
| Filters: new / dup / needs review / ready / pilot-consent / convert | `AdminProviderLeads` (status filter) + `AdminProviderGrowthQueue` (stage filter) | Both pages already shipped |
| Manual actions (approve, merge, draft business, send to growth, reject, note) | `updateProviderLeadStatus`, `admin-enrichment-apply` edge fn (modes: `link` / `lead`), `business_internal_notes` | All manual, gated by `has_admin_access` |
| **NO direct insert into `businesses`** | `admin-enrichment-apply` mode=`lead` writes `provider_leads`, never `businesses`. mode=`link` updates an existing business chosen by admin | Verified at `supabase/functions/admin-enrichment-apply/index.ts:245` |
| Manual draft conversion only | Admin must explicitly press "approve" then "convert" → status moves to `converted_to_business`; no auto path | Guarded by RPC `admin_update_provider_lead` |
| Raw file kept private | Enrichment uses the existing private `admin_enrichment_cache` + `admin_enrichment_sessions` tables; no public bucket touched | RLS admin-only |
| PII masking in public views | `src/lib/identity/canonicalEmail.ts` `maskEmail`, masking helpers in `src/lib/masking.ts` | Already used by every public surface |

## 3. Tables involved (all pre-existing)

`provider_leads`, `provider_lead_branches`, `provider_growth_pipeline`,
`admin_enrichment_cache`, `admin_enrichment_sessions`,
`business_internal_notes`, `admin_operational_notes`, `operational_alerts`,
`business_audit_log`, `admin_activity_log`.

## 4. Why no new `provider_intake_batches` / `provider_intake_rows`

- Every column in the proposed `provider_intake_rows` (raw_data, normalized_data,
  duplicate_status, review_status, pilot_consent, assigned_to, notes, quality_score)
  is already representable through `provider_leads.*` + `provider_growth_pipeline.metadata`.
- Building a parallel intake schema would create **two sources of truth** for
  candidate providers and break the existing dedup uniqueness contract.
- The existing flow already enforces the spec's hardest invariant:
  `admin-enrichment-apply` cannot create a public `businesses` row — only `link`
  to an existing one or `lead` into `provider_leads`.

## 5. Forbidden checks

| Restriction | Status |
|---|---|
| Direct import into `businesses` | ❌ Not present |
| Auto publish | ❌ Not present |
| Auto matching | ❌ `AUTO_MATCH_ON_SUBMISSION = false` still enforced |
| Auto provider leads | ❌ Manual RPC only |
| Auto provider outreach | ❌ No provider email senders exist outside admin manual flow |
| Fake data | ❌ None added |
| PII in public tables | ❌ Public views mask email/phone via existing helpers |
| Raw file in public bucket | ❌ No bucket touched in this sprint |
| `service_role` in client | ❌ Not present |
| Hardcoded hex | ❌ Not added |
| Suppressions / skipped tests | ❌ None |
| `any` / `as any` | ❌ None |
| DB / RLS / migrations changes | ❌ None this sprint |

## 6. Operator instructions (how to use today)

1. Open `/admin/data-enrichment` and paste a Google Maps URL **or** drop an
   Excel/CSV row through the existing XLSX importer.
2. Step through Sources → Review → Apply.
3. At Apply, choose `Create provider lead` (default) — this writes
   `provider_leads` with dedup pre-check. Choose `Link to existing business`
   only when admin has confirmed identity.
4. Triage the result at `/admin/provider-leads` (status, notes, branch detail).
5. Track readiness and outreach at `/admin/provider-growth/queue`
   (`provider_growth_pipeline.metadata` carries pilot_consent + accepts_test).
6. Conversion to a public business stays a separate, deliberate admin action
   downstream of approval.

## 7. Decision

`PROVIDER INTAKE CENTER PASS` — existing systems satisfy the spec end-to-end.
No new code or schema added beyond the guard test that pins these invariants.