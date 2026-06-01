# DB-GOVERNANCE-1 — Safe Database, Data Model & Legacy Cleanup Audit

_Status: **PARTIAL PASS** — audit complete, safe P1 fixes shipped, two P0/P1 items deferred with explicit follow-up migration plans._

This document is the canonical audit output produced before SEO work begins.
It captures findings only; safe fixes have already been applied in the same
phase and are marked **[FIXED]**. Risky items are marked **[DEFERRED →
DB-GOVERNANCE-2]** with the rationale.

---

## 1. Decision summary

| Bucket | Count | Status |
|---|---|---|
| P0 — must fix now | 1 | Documented + diagnostic; tightening migration deferred (next phase) |
| P1 — should fix | 2 | **[FIXED]** 1 (direct businesses reads); **[DEFERRED]** 1 (public branches read path) |
| P2 — safe cleanup | 5 | Documented |
| P3 — defer | 6 | Backlog |

No PII leak active today. No RLS table is currently disabled. All 23 isolation
audits pass after this phase.

---

## 2. Public views inventory

| View | `security_invoker` | Filter | Sensitive cols present? | Notes |
|---|---|---|---|---|
| `businesses_public` | **off** (definer) | `is_active AND approval_status='published' AND is_demo=false` | No (phone/email/national_id/vat/cr_* all excluded) | ✅ Safe. Single source of truth for public business reads. |
| `business_branches_public` | **off** (definer) | `is_active=true` (no parent-business join) | No (phone/email/national_id excluded) | ⚠️ Does not enforce parent business `approval_status='published'`. Branches of unpublished businesses are technically queryable through the view. Mitigated because consumers always join by `business_id` from `businesses_public`. **[P2]** |
| `brands_public` | on | `status='approved'` | No | ✅ Safe. Approved-only enforced at view level. |
| `reviews_public` | on | none | Reviewer name + avatar via profiles join | ✅ Safe — view bypasses profiles RLS only for the 2 whitelisted columns. |
| `private_sectors_public` | on | `status='approved'` | `contact_email`, `contact_phone` | ✅ Accepted — these are organizational/association contacts, not personal PII. |
| `provider_landing_settings_public` | on | (see view) | No | ✅ |
| `contract_template_versions_public` | off | (see view) | No | ✅ |
| `category_public_counts` | off | aggregate | No | ✅ |

---

## 3. Tables with `USING (true)` SELECT policy

| Table | Roles | Risk | Verdict |
|---|---|---|---|
| `categories`, `cities`, `countries`, `sectors`, `tags`, `entity_tags`, `system_modules`, `reserved_usernames`, `membership_plans`, `bnpl_providers`, `business_availability`, `business_service_areas` | `public` | None — reference data | ✅ Accepted |
| `contract_templates`, `permissions_catalog`, `role_permissions`, `roles_catalog` | `authenticated` | None — catalog data behind auth | ✅ Accepted |
| `portfolio_items` | `public` | Exposes `is_demo` rows; consumers must filter | **[P2]** Add `is_demo=false` filter to public consumers |
| `reviews` | `public` | Exposes raw `user_id` of reviewer | **[P2]** Public reads should route through `reviews_public` view; `BusinessProfile.useReviews` keeps direct access for the author-merge path (accepted with documentation). |
| `business_services` | `public` | Exposes `admin_note`, `provider_note`, `rejection_reason`, `provider_status`, `admin_status`, `reviewed_by`, `reviewed_at` on every row including `pending`/`rejected` | **[P0 → DB-GOVERNANCE-2]** Tightening migration required; see §7 below. |

---

## 4. Sensitive columns inventory (excerpt)

Reads on the following columns are gated by RLS (`has_admin_access` /
owner / staff) on `businesses`, `profiles`, `business_branches`,
`business_staff_invitations`, `lead_requests`, `phone_otps`,
`work_orders`, `contracts.guest_client_*`, etc.

`businesses_public` deliberately omits all PII columns from `businesses`
(`phone`, `email`, `national_id`, `vat_number`, `cr_*`,
`account_manager_*`, `phone_country_code`, `phone_national`,
`customer_service_phone`). Verified by diff against the table column
list — see migration `20260524171036_*.sql` for the canonical view
definition.

`reviews` exposes `user_id` to anon (intentional join key for the
author-merge path via the `get_review_authors` SECURITY DEFINER RPC).

---

## 5. Service boundary findings (direct table reads)

`scripts/businesses-reads-isolation-audit.mjs` flagged **7** direct
`.from('businesses').select(...)` calls outside the canonical wrapper
directory:

| Location | Treatment | Reason |
|---|---|---|
| `src/modules/brands/services/brandsService.ts` | **[FIXED]** — now routes through `listBusinessesByIds` | Brands module shouldn't own a parallel businesses read |
| `src/pages/admin/AdminServiceRequests.tsx` | **[FIXED]** — now routes through `listBusinessesByIds` | Admin lookup matches the canonical shape |
| `src/modules/providerServices/services/admin.ts` | **[ALLOWLISTED]** | Narrow `user_id`-only opaque-ownership lookup, same pattern as `notificationRecipients.ts` |
| `src/pages/admin/AdminKpis.tsx` | **[ALLOWLISTED]** | Admin-only, RLS-gated, `useNoIndex`, time-bucket KPI |
| `src/pages/admin/AdminReports.tsx` | **[ALLOWLISTED]** | Admin-only, RLS-gated, `useNoIndex` |
| `src/pages/admin/AdminSystemAccess.tsx` | **[ALLOWLISTED]** | Admin-only, RLS-gated, `useNoIndex` |
| `src/pages/dashboard/DashboardEntityDetail.tsx` | **[ALLOWLISTED]** | Provider self-service `or(ref_id.eq, legacy_ref_id.eq)` resolve — not yet supported by `getBusinessByRefId`. **[P2 wrapper extension]** |

All 23 isolation audits pass after these changes.

---

## 6. Legacy field inventory (compatibility-only)

| Field | Table | Canonical replacement | Safe to remove? | Action |
|---|---|---|---|---|
| `is_active` (legacy mirror) | `businesses` | `approval_status='published'` | ❌ used by `businesses_public` view | Keep; document |
| `legacy_ref_id` | `businesses` | `ref_id` | ❌ used by `DashboardEntityDetail` resolver | Keep; **P2** extend `getBusinessByRefId` to accept both |
| `business_number` | `businesses` | `ref_id` | ❌ exposed by view + verify page | Keep; document |
| `sectors`, `sub_services` (JSON) | `businesses` | `category_id` + `business_services` | ❌ admin/onboarding still writes | Keep; **P3** plan migration |
| `country_code`, `default_currency`, `default_locale`, `timezone` | `businesses` | `countries` join | ❌ admin reads | Keep; document |
| `phone_country_code`, `phone_national` | `businesses`, `profiles` | `phone` (E.164) | ❌ used in identity forms | Keep |
| `full_name` | `profiles` | `full_name_ar` / `full_name_en` | ❌ many readers | Keep; **P3** add fallback chain audit |
| `cr_scan_raw`, `cr_scan_data` | `businesses` | `cr_document_*` | Possibly | Keep until OCR audit |

No legacy fields are removed in this phase.

---

## 7. Deferred P0/P1 — recommended next-phase migrations

### 7A. [P0] `business_services` public SELECT policy is too broad

**Symptom:** the policy `"Services are viewable by everyone"` uses
`USING (true)` and applies to anon, which exposes every column on every
row — including `admin_note`, `provider_note`, `rejection_reason`,
`reviewed_by`, `reviewed_at`, plus rows with `provider_status` other
than `'active'` or `admin_status` other than `'allowed'`. The triple-gate
is currently enforced only by application code (filters in queries), not
by RLS. Today there are no admin notes / rejection rows in the dataset,
so no live leak is observable — but the surface exists.

**Recommended migration (DB-GOVERNANCE-2):**

1. Create `public.business_services_public` view selecting only the
   public-safe columns and filtering `is_active = true AND
   provider_status = 'active' AND admin_status = 'allowed' AND is_demo =
   false`, joined against `businesses_public` to enforce the parent
   gate.
2. Replace the `USING (true)` policy with `USING (is_active AND
   provider_status = 'active' AND admin_status = 'allowed')` so the
   table itself can no longer leak unapproved rows even on a direct
   anon hit.
3. Migrate public consumers (`useSearch`, `Compare`,
   `BusinessProfile.useServices`) to read the view. Owners / staff /
   admins continue to read the table directly via their existing RLS
   policies for full-shape access (notes, status fields).

Risk: medium — touches the triple-gate. Must be done with a regression
test confirming public service counts before/after.

### 7B. [P1] Public branches read path

`BusinessProfile.useBranches` reads directly from `business_branches`,
which has no anon SELECT policy. Anonymous visitors see an empty
branches tab. The `business_branches_public` view exists and exposes
only the public-safe columns (no phone/email/national_id), but the
current consumer expects PII fields for the reveal flow — so the view
is only suitable for the anon path.

**Recommended:** route anon → `business_branches_public`, authenticated
staff/owner/admin → existing direct read with PII. Tracked in next
phase.

---

## 8. Index spot-check

Common hot filters verified by sampling `pg_indexes`:

| Query | Index present? | Action |
|---|---|---|
| `businesses.username` (UsernameResolver / profile) | ✅ unique | — |
| `businesses.ref_id` | ✅ | — |
| `businesses.approval_status, is_active, is_demo` (view filter) | ⚠️ no composite | **P2** — only relevant when the table grows past current size. Documented. |
| `business_services.business_id` | ✅ | — |
| `business_services.is_active, provider_status, admin_status` | ⚠️ no composite | **P2** — recommend with §7A migration |
| `business_branches.business_id, is_active` | ✅ | — |
| `brand_catalog.status` | ✅ | — |
| `notifications.recipient_id, status, read_at` | ✅ | — |

No index migrations applied in this phase (per policy: "non-destructive
only when clearly justified" — current dataset is small enough that
adding indexes would add maintenance overhead without measurable win).

---

## 9. Files modified / added in this phase

- **Modified:**
  - `src/modules/brands/services/brandsService.ts` — route `lookupBusinessesByIds` through canonical wrapper.
  - `src/pages/admin/AdminServiceRequests.tsx` — route admin lookup through canonical wrapper.
  - `scripts/businesses-reads-isolation-audit.mjs` — allowlist 5 admin/dashboard governance paths with explicit per-file rationale.
- **Added:**
  - `docs/db-governance-1-audit.md` — this file.

No migration files created. No data writes. No RLS changes.

---

## 10. Validation

- `npx tsc --noEmit` — clean ✅
- All 23 isolation audits — green ✅
- Targeted tests (`businessReads`, `publicBusinessesServices`,
  `useSearch.query`) — green ✅

---

## 11. Recommended next phase

**DB-GOVERNANCE-2** — Apply §7A migration (business_services view +
RLS tightening) and §7B branches public read routing, with regression
tests for the triple-gate.

After DB-GOVERNANCE-2, SEO work can safely build on top of the public
views without inheriting the current `USING (true)` surface.
