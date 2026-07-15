# Provider Onboarding & Activation — Audit + Phased Plan

## 1. Funnel with real counts (today, 12 businesses total)

```text
Signup w/ provider intent → businesses row (any status)   12
   ↓ approval
approval_status = approved/published                       11  (91%)
   ↓ business-level taxonomy set (≥1 BTC row)
business_taxonomy_categories                               10  (91% of approved)
   ↓ coverage set (≥1 business_service_areas row)
has_coverage                                                1  (9%)   ← DOMINANT LEAK
   ↓ ≥1 active service
has_active_service                                          3  (25%)
   ↓ fully matcher-reachable (approved + BTC + coverage + service)
fully_active per matcher WHERE clause                       1  (8%)
   ↓ actually received a lead
provider_leads rows                                         0
```

Time-to-activate (only Bayanat completed):
- created 2026-05-25 → first service +5d → first coverage **+26d**.
- 10 of 11 approved providers are stuck >27 days with **no coverage row and no active service**.

Profile basics: logo 8/12, description ≥20 chars 3/12, phone 3/12.

## 2. Two critical findings (with code evidence)

### 2a. The F1 checklist checks the WRONG taxonomy table (mis-alignment bug)

`match_quote_to_providers` (verified in DB) matches on `business_taxonomy_categories` (business-level primary/secondary activity). The F1 helper `computeProviderActivation` step `service_taxonomy` counts `business_service_taxonomy_categories` (per-service). Provider service creation (`DashboardServices.tsx` → `insertBusinessServiceReturning`, and the RPC `add_business_sub_service`) **never writes BSTC rows** — so this step is 0/N for every provider and always will be, and even completing it wouldn't help matching.

Effect: the checklist tells providers to "classify services" when the real requirement is business-level activity taxonomy (which 10/12 already have). Providers who "complete" the checklist still won't match.

Correct check: at least one `business_taxonomy_categories` row with `role='primary_activity'` (matcher's hard requirement).

### 2b. Coverage is the actual dominant blocker, and it's buried

- Only 1/12 providers have any `business_service_areas` row.
- Coverage lives as a tab inside `DashboardBusinessProfileHub` (`key: 'coverage'`) and separately at `/dashboard/business/coverage`. **Two implementations exist**: `DashboardBusinessCoverage.tsx` (618 lines) and `ProviderServiceAreas.tsx` (611 lines) — duplicate/legacy.
- Sidebar/quick-actions surface Services (`/n`) prominently but never Coverage. The only in-app nudge to coverage is a single link in `ProviderLeads.tsx` empty state.
- Result: providers submit → get approved → never learn coverage is required to receive leads.

### 2c. Entry-point sprawl (4 overlapping paths, one is the "real" one)

| Route | File | Creates | Lands on | Discoverable |
|---|---|---|---|---|
| `/n` | `RegisterEntity.tsx` | businesses row (canonical) | dashboard | Nav, homepage, membership CTA |
| `/onboarding` | `Onboarding.tsx` | wraps `/n`, redirects | `/n` | Legacy links |
| `/start` | `Start.tsx` | routes → `/n` | `/n` | For-providers CTA |
| `/join-provider` | `ProviderJoin.tsx` + `ProviderJoinEdit.tsx` | separate provider-only path | ? | `/for-providers` |
| Admin | `AdminBusinesses.tsx` create-inline | admin-owned rows | admin | Admin only |

Two of these (`/onboarding`, `/start`) are pure redirect shells. `ProviderJoin*` is a parallel flow with its own edit page.

### 2d. Approval visibility

No `ApprovalStatusBanner`-style component exists in `src/components/dashboard`. `approval_status` is read on the business-edit/completion pages, never surfaced as a persistent banner or a "you're approved — do this next" cue. Approved providers get zero in-app signal that they now need coverage.

### 2e. Admin approval side

`AdminApprovalsCenter.tsx` and `AdminProviderReviewHub.tsx` both exist (unified banner links them per existing memory). No aging column, no SLA, no bulk approve visible in the file list — with 12 providers and no queue backlog this is a non-issue right now.

## 3. Phased plan (F2 → F6, small, independently shippable)

Ordered by leak size. Each phase is one PR-sized change; each closes a specific measured gap above. No schema changes are required for F2/F3/F4; F5 has one optional view.

### F2 — Fix the taxonomy check + auto-nudge coverage (leverage: 1)

Two surgical changes, ~1 day.

1. **Rewrite F1 step 4** in `src/modules/providers/activation/computeActivation.ts`: replace `service_taxonomy` (BSTC-based) with `activity_taxonomy` (BTC-based). Input becomes `primaryActivityCount: number`. Update `useProviderActivation` to query `business_taxonomy_categories` with `role='primary_activity'` count. Update the step label to "Business activity" / "نشاط المنشأة" and link to `/dashboard/business-edit` (activity picker). Add unit test that mirrors the matcher SQL.
2. **Coverage-first ordering + copy**: reorder steps so coverage is step 2 (right after approval) and strengthen its hint to name the consequence: "بدون تغطية لن تصلك أي طلبات — 0 من 11 مزوّدًا مغطّون اليوم". Not a schema change; pure UX weight.

Expected impact: turns the checklist from misleading → correct; every "activated" provider becomes matcher-reachable.

### F3 — Approval status banner + post-approval next-step handoff (leverage: 2)

Add `ApprovalStatusBanner` to `DashboardLayout` (above `EntityWelcomeCard`) that renders for providers whose active business is:
- `draft` / `pending_review` → "قيد المراجعة — عادةً خلال 24 ساعة"
- `approved` / `published` **and coverage empty** → success + primary CTA "أضف مناطق التغطية لتبدأ باستقبال الطلبات" linking to `/dashboard/business/coverage`
- Fully active → hide

One-time notification (in-app `notifications` insert) when `approval_status` flips to approved, deep-linked to coverage. This is the moment providers currently miss. Reuse existing `notifications` table; no schema change.

### F4 — Auto-link BTC on business creation & auto-add `primary_activity` from sector (leverage: 3)

Verify in a follow-up read: today the activity picker in `RegisterEntity.tsx` collects a sector but the sector→BTC row may not be written automatically for all paths (2 providers have 0 BTC rows despite being created via the normal flow — worth confirming). If confirmed, add a small server-side backfill trigger (DB migration): after `businesses` insert, if `sector` is set and no BTC row exists, insert one `primary_activity` row using the sector→taxonomy mapping already in `sectors`. Include the SQL only, gated behind a fresh trace of the write path in a follow-up:

```sql
-- pseudocode, do NOT run without confirming the sector→taxonomy_categories mapping column
CREATE OR REPLACE FUNCTION public.ensure_business_primary_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE v_cat uuid;
BEGIN
  IF NEW.sector IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_cat FROM public.taxonomy_categories
   WHERE slug = NEW.sector AND is_active AND NOT is_archived LIMIT 1;
  IF v_cat IS NOT NULL THEN
    INSERT INTO public.business_taxonomy_categories(business_id, category_id, role)
    VALUES (NEW.id, v_cat, 'primary_activity')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
```

### F5 — Consolidate entry points and remove the two duplicates (leverage: 4, mostly cleanup)

- Delete or hard-redirect `Onboarding.tsx` and `Start.tsx` (both are already pass-throughs to `/n`). Keep `/n` (canonical) and `/for-providers` (marketing).
- Decide between `DashboardBusinessCoverage.tsx` and `ProviderServiceAreas.tsx` — pick the one used by `DashboardBusinessProfileHub` and delete the other; update the single sidebar link. Add a Coverage entry to the provider sidebar quick actions (currently only Services is there).
- Decide fate of `ProviderJoin.tsx` / `ProviderJoinEdit.tsx` — either fold into `/n` or clearly label as invitation-only. Owner/ops call, not code-only.

No schema change.

### F6 — Activation-rate metric on admin dashboard (leverage: 5, small)

Add a KPI card to `AdminDashboardView`: "% providers matcher-reachable" = fully_active / total_approved, with the same 4 sub-counts we produced above. Uses existing tables only; a small view is nice but not required:

```sql
CREATE OR REPLACE VIEW public.v_provider_activation_rollup AS
SELECT
  count(*) FILTER (WHERE approval_status IN ('approved','published')) approved,
  count(*) FILTER (WHERE approval_status IN ('approved','published')
    AND EXISTS(SELECT 1 FROM business_taxonomy_categories t WHERE t.business_id = b.id AND t.role='primary_activity')
    AND EXISTS(SELECT 1 FROM business_service_areas a WHERE a.business_id = b.id)
    AND EXISTS(SELECT 1 FROM business_services s WHERE s.business_id = b.id AND s.is_active))
    AS fully_active
FROM public.businesses b;
```

Weekly, watch it move from 8% toward the 50-provider target.

## Explicitly deferred / not-code

- Admin approval SLA / bulk actions — no backlog today (1 provider in `draft`, 1 in `approved` awaiting publish). Revisit when queue >10.
- Notification granularity, digests, per-role templates — separate initiative.
- Removing/merging duplicate coverage pages is safe but touches routing; do it in F5 with tests.
- Cleaning the 2 unnamed placeholder business rows (`name_en` empty) is an ops task, not code.

## Recommended order and why

F2 first — it turns a misleading checklist into a correct one and unblocks every future signal. F3 next — captures providers at the highest-intent moment (just approved). F4 verifies/repairs the silent taxonomy write. F5 cleanup. F6 gives us the number we're trying to move.
