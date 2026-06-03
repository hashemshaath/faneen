---
name: provider-lead-intake
description: Public bilingual provider join intake form, RPC-backed dedup, private CR uploads, admin review console
type: feature
---
**Route:** `/join/qitaat` (alias `/providers/join`). Admin: `/admin/provider-leads`.

**Tables:** `provider_leads` (status enum: new/under_review/needs_info/approved/rejected/converted_to_business; reference `PRV-NNNNNNN` via `provider_leads_ref_seq` start 1000000; trigger `trg_provider_leads_ref_code`) and `provider_lead_branches` (FK cascade). Both RLS: admin-only SELECT/UPDATE/DELETE.

**Dedup:** Partial unique indexes on `lower(email)`, normalized phone (`regexp_replace(phone,'\D','','g')`), `cr_number`, `unified_number` WHERE status IN ('new','under_review','needs_info'). RPC pre-checks to give friendly errors.

**Submission RPC:** `public.submit_provider_lead(payload jsonb)` SECURITY DEFINER, GRANT EXECUTE to `anon, authenticated`. Returns `{ lead_id, reference_code }`. Validates email/phone, rate-limits (5/hour per `submitted_ip_hash`), inserts branches in same tx.

**Admin RPC:** `public.admin_update_provider_lead(lead_id, status, notes, linked_business_id)` SECURITY DEFINER gated by `has_admin_access`.

**Storage:** Private bucket `provider-lead-documents`. Policies: anon/authenticated INSERT only under `prv-leads/` prefix; admin-only SELECT/DELETE. Helper: `src/modules/files/domain/providerLeadDocuments.ts` enforces PDF/JPG/PNG and 5MB cap. 10-minute signed URLs for admin preview.

**Module:** `@/modules/providers` exposes `submitProviderLead`, `listProviderLeads`, `listProviderLeadBranches`, `updateProviderLeadStatus`. Page MUST NOT call supabase directly.

**Email:** Template `provider-lead-confirmation` in shared registry; uses `BilingualEmail` with badge/reference/tip. Sent best-effort from `submitProviderLead` after RPC success; failures are swallowed.

**Anti-spam:** Hidden honeypot input + min 1.5s form-fill time. Fingerprint hashing (UA + screen + tz, SHA-256) — never stores raw IP.
