# BRANDS-GOVERNANCE-1 — Phased Plan

This is a large, governance-heavy task. I'll execute it in strict phases — **audit first**, **decide second**, **migrate third**, **build UI last** — and stop for your approval between Phase 1 (audit report) and Phase 2 (migrations), because the entire downstream design depends on the audit findings.

## Phase 1 — System & Database Audit (read-only, no code changes)

I will spawn parallel investigations to produce an audit report covering:

1. **Sectors / services taxonomy** — discover canonical tables (`service_catalog`, `categories`, `business_services`, `businesses.sub_services`, `onboarding-sectors.ts`, etc.), their fields (ar/en, slug, ref_id presence), and how providers currently attach to them.
2. **Ref-ID system** — confirm `next_ref_id()` generator, existing prefixes from `docs/reference-id-architecture.md` (USR, ENT, LED, QTE, CRN, TKT…), sequence pattern (start 1000, 7 digits), trigger vs. app generation. Propose **BRD-**, **BRQ-**, **PBL-** only if no existing prefix fits.
3. **Notifications** — locate `src/modules/notifications/*`, `createNotification`, event-naming convention, bilingual template pattern, recipient resolution. Reuse, do not fork.
4. **Operations / admin review queues** — inspect `AdminServiceRequests.tsx`, `help_feature_requests`, `brand_addition_requests` (already created last turn!), SLA log, operations observability. Decide whether to **extend the existing `brand_addition_requests`/`brand_catalog` tables from the previous migration** instead of creating parallel ones.
5. **Permissions / RLS** — `user_roles`, `has_role`, admin vs. provider scopes, `business_staff` membership.
6. **Provider/business model** — confirm `businesses` is canonical (it is), FK target for provider links.

**Output:** a written audit report posted in chat, plus the concrete architecture decisions table the spec requires (canonical sector table, ref_id generator, brand prefix, notification service, operations queue, RLS strategy).

⚠️ **Critical finding I already know:** in the previous turn we created `brand_catalog`, `business_service_brands`, and `brand_addition_requests`. The new spec wants a much richer `brands` registry (manufacturing countries, sector/service links, claim/merge/duplicate workflow, audit log, BRD-/BRQ- ref_ids). I will recommend **evolving** the existing tables rather than creating a parallel `brands` table — most likely by:
- Renaming/extending `brand_catalog` → keep table name, add the missing columns (`name_en`, `slug`, `country_of_origin_*`, `status`, `verification_status`, `submitted_by`, `approved_by`, `merged_into_brand_id`, `metadata`, `ref_id` with BRD- prefix).
- Renaming/extending `brand_addition_requests` → add `request_type`, `proposed_*`, `documents`, `admin_notes`, `ref_id` with BRQ- prefix.
- Keeping `business_service_brands` as the provider↔brand link, extending it into `provider_brand_links` semantics (relationship_type, authorization_status, documents, ref_id PBL-).

This avoids duplicate tables and keeps the work consistent with last turn's migration.

## Phase 2 — Architecture decision (stop for your approval)

I'll post the decision table and the proposed migration outline. **You approve before I write any SQL.** This is mandatory because the spec explicitly forbids guessing table names and duplicating taxonomy.

## Phase 3 — Database migrations (after approval)

In a single migration file:
- Extend `brand_catalog` to full `brands` spec (statuses: draft/pending/in_review/approved/rejected/archived/merged; verification: unverified/claimed/verified/official).
- New `brand_manufacturing_countries`.
- New `brand_sector_links` → FK to the canonical sector table found in audit.
- New `brand_service_links` → FK to the canonical service table found in audit.
- Extend `business_service_brands` → `provider_brand_links` shape (relationship_type, authorization_status, dates, document url, reviewed_by/_at, rejection_reason, ref_id).
- Extend `brand_addition_requests` → full `brand_requests` shape (request_type, proposed_*, documents jsonb, admin_notes).
- Reuse existing generic audit/activity log if suitable; otherwise add minimal `brand_audit_logs`.
- Sequences + `BEFORE INSERT` triggers for BRD-/BRQ-/PBL- ref_ids, following the platform's existing 7-digit start-at-1000 pattern.
- GRANTs (anon SELECT only on approved-brand-safe surfaces via views), RLS policies per the spec's matrix.
- Public views: `brands_public`, `provider_brand_links_public` that filter to `status='approved'` and exclude PII / pending rows.

## Phase 4 — Services layer

`src/modules/brands/services/` with every function listed in the spec (list/search/get/admin CRUD/approve/reject/archive/merge, manufacturing countries, sector/service links, provider links, requests, duplicate detection). Helpers in `src/modules/brands/helpers/`. No page/component touches Supabase brand tables directly — enforced by a new isolation audit script `scripts/brands-isolation-audit.mjs`.

## Phase 5 — Admin UI

- `/admin/brands` — list + filters + bulk actions.
- `/admin/brands/:id` — basic info, origin & manufacturing, sectors/services, provider relationships, requests/history, audit log.
- `/admin/brand-requests` — review queue for all 5 request types, with duplicate-detection panel on approval.
- Wire into existing admin sidebar/navigation (`AdminTabsContext`, sidebar groups). Update `src/test/adminSidebarLinks.test.ts`.

## Phase 6 — Provider UI

- `/dashboard/brands` — my approved brands, pending requests, search catalog, request new brand, request provider↔brand link with relationship type + authorization document upload (reuses existing storage bucket).
- Replace the current `ServiceBrandsPicker` flow to call the new request services so everything funnels through one approval pipeline. Old `brand_addition_requests` rows are migrated in-place.

## Phase 7 — Public / directory integration

- Provider profile: "العلامات التجارية المعتمدة" section showing approved links only.
- Sector / service pages: brand filter chip (approved brands only, country-of-origin badge).
- Optional `/brands/:slug` public page — included if scope allows, otherwise deferred with reason.
- Quote/RFQ buyer brand picker — **deferred** to next phase (explicitly listed as optional in spec) to keep this PR reviewable; noted in deferred items.

## Phase 8 — Notifications & operations integration

All 13 events from the spec wired through existing `createNotification` with bilingual ar/en templates. Admin/operations queue badges hooked into existing operations center counts. No new email logic — reuse existing transactional email wrapper only where needed (request approved/rejected).

## Phase 9 — Duplicate detection

`findPossibleDuplicateBrands` helper: normalizes Arabic name (strip شركة / مصنع / للتجارة / للصناعة / ألمنيوم / زجاج prefixes, normalize alef/yaa/taa marbuta), normalizes English name (lowercase, strip Co./Ltd.), compares against `name_ar`, `name_en`, and `slug` with trigram similarity (`pg_trgm`). Surfaced in admin approval screen.

## Phase 10 — Tests & validation

- Service-layer tests for each major flow (create → approve → link → merge).
- Notification tests for each event.
- Isolation audit script + CI hook.
- Guard test: no duplicate sector/service tables, ref_id is DB-generated, no direct brand table access outside services.
- Run `bunx vitest run` + existing sector/provider/notification/RLS isolation audits.

## Phase 11 — Final report

I'll deliver the 22-point report the spec demands (PASS/FAIL, audit results, decisions, migrations, RLS, prefixes with example IDs, services, UI, notifications, duplicate method, tests, direct-access count before→after, validation results, deferred items, next phase recommendation).

---

## Technical notes

- **Ref-ID generation:** reuses existing `next_ref_id(prefix text)` pattern. Sequences `brand_ref_seq`, `brand_request_ref_seq`, `provider_brand_link_ref_seq` starting at 1000000, 7-digit zero-padded → `BRD-1000001`, `BRQ-1000001`, `PBL-1000001`.
- **Sector/service FKs:** will be set after audit confirms canonical tables. Most likely `service_catalog.id` for services; sectors live in `onboarding-sectors.ts` (TS data, not a DB table) — if no DB sector table exists this is a finding I'll surface in Phase 1 and we'll decide whether to (a) introduce a `sectors` table now or (b) store sector as a `text` slug FK to the TS source. **Defaulting to introducing a real `sectors` table** if missing, to keep brand_sector_links sound.
- **Public exposure:** all anon reads go through `brands_public` / `provider_brand_links_public` views; raw tables get no anon grant. Matches `docs/database-inventory.md` posture.
- **Migration safety:** existing `brand_catalog` / `brand_addition_requests` rows from last turn are preserved via `ALTER TABLE` + backfill (set status='approved' for any pre-existing rows admins have already accepted, 'pending' otherwise, generate ref_ids for all).

---

## What I need from you

**Approve this phased approach.** I'll then start Phase 1 (audit only, no code changes) and come back with the audit report + concrete architecture decisions for your sign-off before touching the database.

If you'd rather skip the audit pause and have me run audit → decisions → migration in a single shot using my current understanding (with the risk of one rework cycle if I get a table name wrong), say "go straight through" and I will.
