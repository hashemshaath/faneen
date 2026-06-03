
# PROVIDER-LEAD-INTAKE-FORM-1 — Plan

## Goal
Public bilingual (AR/EN) provider lead intake form for Qitaat at `/join/qitaat` (with `/providers/join` as alias). No login required. Submissions land as `pending` provider leads, reviewed in admin, with confirmation email to applicant and internal admin notification.

## Scope

### 1. Route & Page
- New public route: `/join/qitaat` (primary) + `/providers/join` (alias).
- Page: `src/pages/ProviderJoin.tsx`
  - Hero: brief value prop ("لماذا تنضم لقطاعات؟") — trust signals.
  - Multi-section form (3 sections, accordion-style, not popup):
    1. **بيانات المنشأة** (name AR/EN, CR, unified #, VAT, website, brief)
    2. **بيانات التواصل والمسؤول** (contact name, email, phone, preferred channel)
    3. **النشاط والموقع** (main activity, specialties, brands, city, national address, map link, CR file upload, branches)
  - Inline validation. Bilingual via `<Bi>` and `useBi()`.
  - Success state: fullscreen card with reference number + next-steps copy.
  - `useNoIndex` excluded (page IS indexable for SEO). SEO meta (title, desc, JSON-LD `Organization`).

### 2. Database (migration)
New tables:
- `public.provider_leads` — main lead row.
  - Fields: `id`, `reference_code` (PRV-NNNNNNN via sequence starting 1000), `name_ar`, `name_en`, `contact_name`, `email` (citext), `phone`, `preferred_channel` (enum: phone/whatsapp/email), `website`, `cr_number`, `unified_number`, `vat_number`, `main_activity`, `specialties` (text[]), `brands` (text[]), `brief`, `cr_file_path`, `map_link`, `national_address`, `city`, `branches_count`, `status` (enum: new/under_review/needs_info/approved/rejected/converted_to_business), `admin_notes`, `linked_business_id` (FK nullable), `submitted_ip` (inet, hashed), `user_agent`, `created_at`, `updated_at`, `reviewed_at`, `reviewed_by`.
- `public.provider_lead_branches` — child rows: `id`, `lead_id` (FK cascade), `branch_name`, `city`, `address`, `map_link`, `phone`, `created_at`.
- Sequence + trigger for `reference_code` (PRV-1000001…).
- Unique partial indexes for dedup: lowercase email, normalized phone, cr_number, unified_number (where status NOT IN rejected/converted to allow re-submit after rejection).
- RLS:
  - `provider_leads`: anon INSERT allowed (rate-limited via trigger checking submissions per IP/hour); admin SELECT/UPDATE; no public SELECT.
  - `provider_lead_branches`: anon INSERT (only as part of same submission via RPC); admin SELECT.
- GRANTs: `anon INSERT`, `authenticated INSERT, SELECT (admin via policy)`, `service_role ALL`.
- SECURITY DEFINER RPC `submit_provider_lead(payload jsonb)` returning `{ reference_code, lead_id }` — handles dedup checks, branch inserts, IP hashing atomically.

### 3. Storage
- New private bucket: `provider-lead-documents`.
- Path: `provider-leads/{reference_code}/cr.{ext}`.
- Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`. Max 5MB.
- RLS on `storage.objects`: anon INSERT to this bucket only with size/mime constraints; only admins SELECT.
- Wrapper: `src/modules/files/domain/providerLeadDocuments.ts`.

### 4. Services Layer (no direct Supabase in page)
- `src/modules/providers/services/submitProviderLead.ts` — calls RPC, uploads CR file via files module, returns reference code.
- `src/modules/providers/services/listProviderLeads.ts` — admin list with filters.
- `src/modules/providers/services/updateProviderLeadStatus.ts` — admin status change + notes.
- Barrel: `src/modules/providers/index.ts`.

### 5. Email
- New transactional template: `supabase/functions/_shared/transactional-email-templates/provider-lead-confirmation.tsx` (bilingual, Qitaat logo, reference code, thank-you copy).
- Register in `registry.ts`.
- Trigger via existing `sendTransactionalEmail` wrapper from submission RPC postprocess (call from page after RPC success — call site already in services).
- Internal admin notification: insert into `notifications` for admins (existing pattern), and optionally send email to admin distribution list using `provider-lead-admin-alert` template.

### 6. Admin Dashboard
- New page: `src/pages/admin/AdminProviderLeads.tsx`
  - List with status filter, search, badges per status (colored).
  - Inline detail panel (no popup) — view all fields, CR file signed URL, branches list.
  - Status change inline (select), notes field, link-to-business action.
- Add nav entry under existing admin sidebar group (Requests / Leads).
- RBAC guarded via existing admin access patterns.

### 7. Security
- Server-side Zod validation in RPC (length limits, regex for phone/email/CR).
- Magic-byte sniffing for CR file via existing `validateImageFile` (extended for PDF).
- Rate limit: max 5 submissions per IP per hour (table `provider_lead_rate_limit` or check on `provider_leads.submitted_ip_hash` + `created_at`).
- Honeypot field + minimum form-time check (anti-spam without captcha).
- No DB errors exposed — services map to generic bilingual messages.

### 8. Tests
- `src/tests/providerLeadIntake1.test.ts`:
  - Route exists and is public.
  - Required fields enforced.
  - Email/phone validation.
  - No direct `supabase.functions.invoke` or `supabase.from` in `ProviderJoin.tsx`.
  - Service wrapper exists.
  - Email template registered.
  - Admin page exists and is gated.
- Run: `tsc`, vitest focused, `broken-links-audit`, `storage-isolation-audit`, `edge-functions-isolation-audit`.

## Technical Notes
- Reference code via Postgres sequence `provider_leads_ref_seq` start 1000, formatted in BEFORE INSERT trigger: `'PRV-' || lpad(nextval(...)::text, 7, '0')`.
- Dedup uses partial unique indexes on `lower(email)`, normalized phone (strip non-digits, prepend 966), `cr_number`, `unified_number` — all `WHERE status NOT IN ('rejected','converted_to_business')`.
- IP stored as `encode(digest(ip || salt, 'sha256'), 'hex')` to avoid PII raw storage.
- Uses existing `IBM Plex Sans Arabic`, `.hover-lift`, semantic tokens, `h-12 rounded-xl`.
- Branches rendered as add/remove cards; max 20 to bound payload.

## File Plan

**Created:**
- `supabase/migrations/<ts>_provider_leads.sql`
- `src/pages/ProviderJoin.tsx`
- `src/pages/admin/AdminProviderLeads.tsx`
- `src/modules/providers/index.ts`
- `src/modules/providers/services/submitProviderLead.ts`
- `src/modules/providers/services/listProviderLeads.ts`
- `src/modules/providers/services/updateProviderLeadStatus.ts`
- `src/modules/providers/types.ts`
- `src/modules/files/domain/providerLeadDocuments.ts`
- `supabase/functions/_shared/transactional-email-templates/provider-lead-confirmation.tsx`
- `supabase/functions/_shared/transactional-email-templates/provider-lead-admin-alert.tsx`
- `src/tests/providerLeadIntake1.test.ts`

**Edited:**
- `src/App.tsx` (route registration)
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- Admin sidebar config (existing nav file)
- `src/modules/files/constants/buckets.ts` + `constraints.ts`
- `mem://index.md` + new memory file `mem://features/provider-lead-intake`

## Final Report (after impl)
Will include: final route, tables/services created, dedup mechanism, CR upload flow, email IDs sent, admin notification path, files touched, test results.

---

**Note**: This is a large feature (~12-15 files). Confirm to proceed, or ask for adjustments (e.g., skip branches, simpler dedup, no admin page in this pass).
