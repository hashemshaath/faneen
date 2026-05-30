# BRANDS-GOVERNANCE-2 — Audit Report & Phased Plan

## 1) Re-audit of shipped V1

### Tables present (confirmed in DB)
- `brand_catalog` — full set: `id, ref_id, name_ar, name_en, slug, logo_url, website, sector_id, is_active, created_by, created_at, updated_at, description_ar/en, country_of_origin_code/name_ar/name_en, brand_owner_company, founded_year, is_local, is_verified, status, verification_status, source, submitted_by, approved_by, …`
- `brand_manufacturing_countries` — present
- `brand_sector_links` — present
- `brand_audit_logs` — `brand_id, brand_request_id, provider_brand_link_id, actor_id, action, old_values, new_values, created_at`
- `business_service_brands` — extended (PBL- ref_id, relationship_type, authorization fields)
- `brand_addition_requests` — extended: `request_type, brand_id, proposed_country_of_origin_code, proposed_manufacturing_countries (jsonb), proposed_sector_ids/service_ids, relationship_type, documents (jsonb), notes, admin_notes`
- `sectors` registry — present
- `brands_public` view — correctly filters `WHERE status='approved'` ✅

### RPCs present
`admin_approve_brand(_brand_id)`, `admin_reject_brand(_brand_id,_reason)`, `admin_archive_brand(_brand_id)`, `admin_merge_brands(_source_id,_target_id)`, `admin_approve_provider_brand_link(_link_id)`, `admin_reject_provider_brand_link(_link_id,_reason)`, `approve_brand_addition_request(p_request_id,p_admin_note)`, `reject_brand_addition_request(p_request_id,p_reason)`, ref_id triggers.

### Routes wired
- `/admin/brands` ✅
- `/dashboard/brands` ✅
- `/brands`, `/brands/:slug` exist BUT are the **legacy private-sectors pages** (use `listSpecializations` / `listDistributors`, not `brand_catalog`). Not yet wired to the new registry.
- `/admin/brands/:id` ❌ missing
- `/admin/brand-requests` ❌ missing (AdminServiceRequests covers service requests, not brand requests yet — needs verification)

### Direct Supabase access for brand tables outside the service layer
Only **1 file**: `src/components/dashboard/ServiceBrandsPicker.tsx` — 7 direct calls to `business_service_brands`, `brand_catalog`, `brand_addition_requests`.
All other access goes through `src/modules/brands/services/brandsService.ts` ✅.

### 🔴 CRITICAL FINDINGS

1. **Pending/rejected brands are publicly readable.**
   Policy `brand_catalog_select_public` is `USING (true)` — anyone querying `from('brand_catalog')` sees draft/pending/rejected/archived rows. Only `brands_public` view filters. Violates the constraint *"Do not expose pending/rejected brands publicly"*.

2. **`business_service_brands` is fully publicly readable** (`bsb_select_public USING (true)`) — exposes provider→pending-brand links too.

3. **`brand_addition_requests` INSERT policy requires `business_id` to match a business owned by the user** — blocks new `request_type='create'` flows where no business is attached yet, and blocks user-only flows (duplicate reports). Needs softening (e.g. `user_id = auth.uid() AND (business_id IS NULL OR owned-by-user)`).

4. **Missing notification events** — current `brandsService` emits ~9; spec requires 11 (missing `brand_request_in_review`, `brand_request_needs_more_info`, possibly `brand_archived`, `brand_merged`).

5. **No isolation audit test, no service tests** for the brands module.

### Other audit notes
- `sectors` registry duplicates nothing destructively — old TS data still used in pages; sync is one-way (TS → DB).
- No `updated_at` triggers verified on the new tables — needs confirmation.
- No `pg_trgm` index for duplicate detection; current normalization is JS-only.

---

## 2) Phased plan (proposed)

Given the scope (12 sections, new pages, tests, RLS rewrites), I propose 3 phases. Each phase is independently shippable and reviewable.

### Phase A — Security + Isolation hardening (do first, blocking)
1. **Migration** — fix RLS:
   - `brand_catalog_select_public`: restrict to `status='approved'` for non-admins; admins see all.
   - `business_service_brands` public read: only when linked brand is `approved`.
   - Soften `brr_insert_owner` to allow user-only requests (no business required).
   - Add `updated_at` triggers where missing.
2. **Refactor** `ServiceBrandsPicker.tsx` → use `brandsService` exclusively. Drop 7 direct calls.
3. **Isolation audit test** `src/modules/brands/services/__tests__/brandsIsolationAudit.test.ts` — greps source for forbidden direct access outside allowed paths. Fails CI if regressed.
4. **TypeScript triage** — run `tsc --noEmit`, categorize errors (A/B/C/D), fix A+B.

### Phase B — Admin workflow completion
5. **`/admin/brands/:id` detail page** — 7 sections per spec (header, basic, mfg countries, sector links, provider relationships, requests/history, audit log) + actions (approve/reject/archive/merge/edit), all via `brandsService`.
6. **Brand requests queue** — audit `AdminServiceRequests`; if it doesn't cover brand requests, build `/admin/brand-requests` (filters, duplicate warnings, approve/reject/needs_more_info, admin notes).
7. **Notifications** — add the 2–3 missing events, ensure bilingual titles/bodies + payload metadata, document recipient/link rules.
8. **Ops Center** — pending counts + review links (no new SLA engine).

### Phase C — Provider QA + data quality + tests
9. **`/dashboard/brands` QA** — empty states, hide raw enums, ensure pending vs approved separation, document upload if available.
10. **Duplicate detection** — extend Arabic/English normalization helpers (prefixes/legal suffixes/tatweel), surface candidate matches in admin review UI.
11. **Service tests** — `brandsService.test.ts` + `brandHelpers.test.ts` covering listings, RPC dispatch, request creation, normalization.
12. **Final validation** — `tsc --noEmit`, `vitest run`, manual checklist (15 items from spec §12).

---

## 3) Technical notes

- All new admin/provider DB writes route through `brandsService` — pages must not import `supabase` for brand tables.
- Reuse `has_admin_access(auth.uid())` for admin gating; never re-implement.
- Use existing `createNotification` only; do not add a parallel system.
- Keep `ref_id` generation server-side (triggers `set_brand_ref_id`, `set_brand_request_ref_id`); never construct in frontend.
- Do not delete the legacy `/brands` pages in this scope — they map to private-sectors, not brand registry. A separate decision is needed about whether to merge or keep both.

---

## 4) Confirmation needed before implementation

1. **Approve Phase A first** (security + isolation + tsc triage), then I report and you green-light B and C separately? Or run A→B→C straight through in one large turn?
2. **Legacy `/brands` & `/brands/:slug` pages** — leave untouched (they serve private-sectors content), or unify with the new brand registry? Recommend leaving untouched in this scope.
3. **TypeScript pre-existing errors** — if `tsc --noEmit` reveals unrelated errors, fix only brand-related ones and document the rest? (matches spec rule)
