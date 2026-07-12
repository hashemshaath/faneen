## Current State (evidence)

**/quote page (`src/pages/Quote.tsx`, 1,319 lines, 5 steps):**
1. Sector — taxonomy dropdown ✅
2. Location + service-location — **free-text `city` + free-text `district`** (`Input` fields at lines 715, 729). Region not captured.
3. Description + measurements + quantity
4. Timeline + budget + optional preferred brands (uses R5.1 `ApprovedBrandPicker`)
5. Contact + OTP + submit → `submitQuoteRequest()` → edge fn `submit-quote-request` → `quote_requests` row → post-insert edge fn `match-quote-request` creates `quote_request_leads`.

**Location data model (actual):**
| Table | Rows | Shape |
|---|---|---|
| `regions` / `saudi_regions` | **does not exist** | — |
| `cities` | 142 (all active) | `id, name_ar, name_en, country_id` — **no `region_id`** |
| `districts` | 2,582 (all active; 82 in Jeddah; all 13 SA regions covered) | `region_ar/en`, `city_ar/en`, `district_ar/en` — **text-linked, no FKs** |
| `location_catalog` | 14 | secondary; unrelated to this flow |

**`quote_requests` already has structured columns (unused by UI):**
`region text`, `city text`, `district text`, `location_id uuid`, `location_precision text`, `no_location_selected bool`. Schema is ready; the page writes text into `city`/`district` only.

**Provider coverage (actual):**
- `business_service_areas` — only **2 rows across the whole platform** (`city text, district text, is_primary`). Effectively empty.
- `businesses.city_id` filled on 5 rows; `businesses.district` text; `businesses.region` text.
- `business_branches.city_id` filled on 14/15; `business_branches.district` text.
- **No provider-facing dashboard UI to declare covered cities/districts.**

**Matching (`supabase/functions/match-quote-request/index.ts`):**
- Filters by (a) sector taxonomy match, (b) fuzzy city name match via `citiesMatch()` string normalizer against `business_service_areas.city` OR `businesses.city_id → cities.name`, (c) optional district string equality.
- On zero matches: writes `quote_matching_failed` event; requester sees success page anyway. No admin fallback notification.
- **Region never used.** IDs never used. Depends on brittle name normalization.

## Gap Analysis

| Stage | Status | Evidence |
|---|---|---|
| Sector | EXISTS | Step 1 uses taxonomy |
| Structured region → city → district | **MISSING** in UI; PARTIAL in DB (no regions table, no `cities.region_id`) | Free-text inputs, no cascading selectors |
| Work details + attachments | EXISTS | Steps 3–4 |
| Contact + OTP | EXISTS | Step 5 |
| Provider coverage declaration | **MISSING (UI)** + effectively unused (DB) | 2 rows in `business_service_areas`; no dashboard page |
| Auto-match to covering providers | PARTIAL | Text-based, region-blind, empty-coverage falls back to business city_id |
| Leads + provider notifications | EXISTS | `quote_request_leads` (2 rows), triggers wired |
| Admin fallback on zero matches | **MISSING** | Only silent event log |

## Design Proposal

### 3a. Location reference data — minimal, additive
Add `saudi_regions` and normalize `cities.region_id`; enrich `districts` with FKs. Do **not** drop existing text columns (backward compatibility during rollout).

```sql
-- 13 KSA regions, stable slug
CREATE TABLE public.saudi_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,          -- 'riyadh','makkah',...
  name_ar text NOT NULL, name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.saudi_regions TO anon, authenticated;
GRANT ALL ON public.saudi_regions TO service_role;
ALTER TABLE public.saudi_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active regions" ON public.saudi_regions
  FOR SELECT USING (is_active);

-- Link cities → region (nullable during backfill, tighten after)
ALTER TABLE public.cities ADD COLUMN region_id uuid REFERENCES public.saudi_regions(id);
CREATE INDEX idx_cities_region ON public.cities(region_id) WHERE is_active;

-- Link districts → city + region (nullable during backfill)
ALTER TABLE public.districts
  ADD COLUMN city_id uuid REFERENCES public.cities(id),
  ADD COLUMN region_id uuid REFERENCES public.saudi_regions(id);
CREATE INDEX idx_districts_city ON public.districts(city_id) WHERE is_active;
```

**Seed strategy:** static seed migration is the pragmatic choice — 13 regions + text-match backfill of `cities.region_id` and `districts.city_id/region_id` from the existing text columns (`region_ar`, `city_ar`). All names already present; National Address API is heavier and adds an ops dependency for data that changes rarely. Keep existing 2,582 districts (Jeddah has 82 — sufficient for phase 1). Add a lightweight admin page later for corrections.

### 3b. Provider coverage — additive per-branch join table
`business_service_areas` is nearly empty; repurpose it or add a proper join. Chosen: **add IDs to existing table** (preserves 2 rows, avoids new table):

```sql
ALTER TABLE public.business_service_areas
  ADD COLUMN branch_id uuid REFERENCES public.business_branches(id) ON DELETE CASCADE,
  ADD COLUMN city_id uuid REFERENCES public.cities(id),
  ADD COLUMN region_id uuid REFERENCES public.saudi_regions(id),
  ADD COLUMN district_ids uuid[] NOT NULL DEFAULT '{}';  -- optional narrowing
CREATE INDEX idx_bsa_city ON public.business_service_areas(city_id);
CREATE INDEX idx_bsa_region ON public.business_service_areas(region_id);
CREATE INDEX idx_bsa_business ON public.business_service_areas(business_id);
CREATE INDEX idx_bsa_district_gin ON public.business_service_areas USING gin(district_ids);
```

Provider dashboard: new section in `DashboardBusinessProfileHub` → **"Service Coverage"** tab. Per branch: multi-select region-city grouped picker + optional district multi-select for cities where districts exist (searchable, RTL, Arabic-first, reuses shadcn `Command` component). Include "covers entire city" (empty `district_ids`) vs "specific districts".

### 3c. Matching — replace name-normalization with ID lookup
New RPC `public.match_quote_to_providers(p_quote_id uuid)` (SECURITY DEFINER, `SET search_path = public`), called by `match-quote-request` edge fn or a trigger:

Logic:
1. Read `quote_requests.region`/`city_id`/`district_id` (new columns — see 3d).
2. Candidate providers: `INNER JOIN business_service_areas bsa` where `bsa.city_id = quote.city_id` **AND** (`array_length(bsa.district_ids,1) IS NULL` OR `quote.district_id = ANY(bsa.district_ids)`).
3. Sector filter on `business_taxonomy_categories`.
4. Insert into `quote_request_leads` (dedupe on `(quote_request_id, business_id)`), fire notifications via existing triggers.
5. Fallback: if 0 candidates, insert an `operational_alerts` row (`type='quote_no_coverage'`) + notify `admin` role + surface honest message to requester ("لم نجد مزودًا يغطي حي/مدينتك حاليًا — سيتواصل فريقنا").

Keep `match-quote-request` edge fn as thin wrapper that calls the RPC (preserves existing invocation sites and tests).

### 3d. /quote wizard — simplified, structured location
Also add structured columns to `quote_requests`:

```sql
ALTER TABLE public.quote_requests
  ADD COLUMN region_id uuid REFERENCES public.saudi_regions(id),
  ADD COLUMN city_id uuid REFERENCES public.cities(id),
  ADD COLUMN district_id uuid REFERENCES public.districts(id);
CREATE INDEX idx_qr_city ON public.quote_requests(city_id);
CREATE INDEX idx_qr_region ON public.quote_requests(region_id);
```
(Keep existing `city`, `district`, `region` text columns for backward compat; edge fn writes both during transition.)

**Redesigned 4-step wizard** (down from 5 by merging timeline+budget into step 3):

```text
Step 1  What?    Sector → specialty (taxonomy) + optional preferred brands
Step 2  Where?   Region → City → District (cascading DB dropdowns, searchable RTL Arabic)
                  + service_location_type (project_site / provider_location / not_sure)
Step 3  Details  Description + measurements + quantity + timeline + budget + attachments
Step 4  Contact  Name + phone + email + client_type + preferred contact + OTP → Submit
```

- Region selector: 13 chips (fast) OR searchable list.
- City selector: filtered by region; searchable; falls back to "المدينة غير موجودة؟" free-text opt-out for edge cases (still writes to `city` text, `no_location_selected=true`, admin routes manually).
- District selector: filtered by city; **only shown if districts exist for that city** (avoids empty dropdowns outside Jeddah/major cities). Optional field.
- Reuse existing OTP mechanism, brand picker, file upload.
- Draft autosave in localStorage keyed on new field IDs.

## Phased Plan (each phase independently smoke-testable, no URL changes)

### Q1 — Location reference tables + seed
- Migration: create `saudi_regions`; ALTER `cities` + `districts` to add FK columns.
- Seed 13 regions (static INSERT with stable codes).
- Backfill `cities.region_id` and `districts.city_id`/`region_id` from existing text via one-shot UPDATE using name matches.
- Smoke: `SELECT count(*)` per region; every `districts` row has non-null `city_id`.
- **No UI change.**

### Q2 — Coverage model + provider dashboard UI
- Migration: ALTER `business_service_areas` (add `branch_id`, `city_id`, `region_id`, `district_ids`, indexes). Keep old text columns.
- New RLS policies: providers manage their own rows (already scoped via `business_id`); admin full access; public **no read** (coverage isn't public).
- Backfill 2 existing rows by resolving text → IDs.
- New dashboard section: `src/pages/dashboard/DashboardBusinessCoverage.tsx` under Business Profile hub. Per branch, save coverage rows. Include "Covers all of {city}" toggle.
- Smoke: provider adds coverage → row visible in DB; unauthorized user cannot read.

### Q3 — /quote wizard rebuild (structured selectors)
- Migration: ALTER `quote_requests` (add `region_id`, `city_id`, `district_id`).
- New shared component: `src/components/location/RegionCityDistrictSelect.tsx` (RTL, searchable, cascade).
- Rewrite Step 2 of `Quote.tsx`; keep text columns populated too (dual-write).
- Same route `/quote`. Merge budget+timeline into step 3 to drop total to 4 steps.
- Also reuse in dashboard New RFQ wizard (`DashboardNewRfq.tsx`) for parity.
- Smoke: submit end-to-end; new row has non-null `city_id`.

### Q4 — Matching + routing + notifications + admin fallback
- New RPC `match_quote_to_providers(uuid)` (SECURITY DEFINER, `search_path = public`).
- Rewrite `match-quote-request/index.ts` to call the RPC.
- Add `operational_alerts` insertion + admin notification for zero-match case.
- Update requester success page copy to reflect honest "we found N providers who cover your area" / "we didn't find coverage — our team will help".
- Retire text-based `citiesMatch` normalizer (keep for one release behind a feature flag as safety net).
- Smoke: submit quote in a covered city → N `quote_request_leads`; submit in uncovered city → alert + zero leads + honest UI.

**All existing URLs preserved.** No breaking changes to edge fn signatures (payload gains optional `region_id/city_id/district_id`; text fields kept).

## Open Questions (for you to confirm before implementation)

1. **Seed source**: OK with static seed migration for regions + text-match backfill of the 142 cities and 2,582 districts? Or prefer we validate against National Address API?
2. **Coverage granularity default**: when a provider picks a city with districts (Jeddah), is the sensible default "covers entire city" (empty `district_ids`), or force them to pick districts?
3. **Zero-coverage UX**: should the requester still be allowed to submit (with admin fallback), or should we hard-block with "no providers in your area yet — leave your contact"? I'm assuming the softer allow+alert path — confirm.
4. **Wizard step count**: OK collapsing timeline+budget into step 3 to reach 4 steps, or keep 5?
