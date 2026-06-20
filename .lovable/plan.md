## ADMIN BUSINESSES + PROVIDERS CONTROL CENTER — Professional Rebuild Plan

### Goal
Replace the inside of `/admin/businesses` with a new, design-first control center: "إدارة الجهات والمزودين". Route preserved. No DB/RLS/RPC/edge/migrations. No fake data. All existing actions (create, edit, publish, open public page, copy link, complete data) carried over.

### Approach
Phase 1 already shipped `Overview` tab + tabs shell. This plan completes the rebuild over the remaining 5 tabs as a single coherent design pass, then retires the legacy single-page layout as the default view.

### New IA (6 tabs, RTL-first)
```
[ نظرة عامة ] [ الجهات ] [ مزودو الخدمة ] [ التصنيفات والقطاعات ] [ المراجعة والظهور ] [ جاهزية التشغيل ]
```
- URL state: `?tab=<id>` (already in shell).
- Default tab: `overview`.

### Tab designs

1. **نظرة عامة** (exists, polish only)
   - Keep KPI cards + MetricBarList.
   - Add: "إجراءات سريعة" row → links to Review tab pre-filtered (drafts, pending, missing-contact).

2. **الجهات** (refactor of current page body)
   - Header strip: search + entity-type filter + status filter + region filter (real columns only).
   - Card/grid view (default) using `MetricCard`-like business cards with: logo, name (ar/en), ref_id, status badges (verified, published, demo), city, completeness chips (contact/link/desc/media).
   - Row actions: تعديل، عرض عام، نسخ الرابط، نشر/إلغاء نشر — wired to existing handlers extracted from `AdminBusinesses.tsx`.
   - "إضافة جهة" button → existing inline create form (reused as-is).

3. **مزودو الخدمة**
   - Filter source rows by `entity_type` provider-like values OR `is_service_provider` if such a column exists; otherwise show empty state explaining data source.
   - Sections (chips): مؤهلون، ناقصو تواصل، بدون تصنيف، بدون رابط عام، غير منشورين.
   - Card explains *why* provider is ready / not ready (rule list from `businessAdminMetrics`).

4. **التصنيفات والقطاعات**
   - Distribution bars by `entity_type` (already implemented helper).
   - If a real sector/category column is missing on the row shape → empty-state card: "لا يتوفر مصدر تصنيف دقيق على مستوى الصف حاليًا" — explicit, no fake data.
   - Reuse `MetricBarList`.

5. **المراجعة والظهور**
   - Buckets: drafts، pending review، approved غير منشور، inactive، demo، بدون username، بدون تواصل.
   - Each bucket = collapsible list of business mini-cards with quick actions: تعديل، فتح عام، نسخ الرابط.
   - Counts derived from `businessAdminMetrics`.

6. **جاهزية التشغيل (Pilot)**
   - "جاهز" vs "غير جاهز" using `isPilotReady`.
   - Distribution bars: by city (`city_id`/`region`) and entity_type.
   - List of not-ready with explicit reason chips (missing contact / missing link / pending review / rejected).

### Shared building blocks (new)
- `src/components/admin/businesses/control-center/BusinessCard.tsx` — unified card.
- `src/components/admin/businesses/control-center/BusinessBucketList.tsx` — collapsible bucket with mini list.
- `src/components/admin/businesses/control-center/ReadinessReasonChips.tsx` — pure render of reasons.
- `src/components/admin/businesses/control-center/ProvidersTab.tsx`
- `src/components/admin/businesses/control-center/TaxonomiesTab.tsx`
- `src/components/admin/businesses/control-center/ReviewTab.tsx`
- `src/components/admin/businesses/control-center/PilotTab.tsx`
- `src/components/admin/businesses/control-center/BusinessesTab.tsx` — new card-grid view replacing legacy table as default.

### Metric helpers (extend `businessAdminMetrics.ts`)
- `pilotReadinessReasons(b)` → string[] (bilingual via labels file).
- `providerSegment(b)` → 'qualified' | 'no_contact' | 'no_link' | 'no_taxonomy' | 'unpublished'.
- `cityDistribution(rows, isRTL)` → DistributionBucket[] (using `region`/`city_id`).

### Action wiring
Extract existing handlers from `AdminBusinesses.tsx` (openEdit, publishBusiness, openPublic, copyPublicLink) into `src/modules/admin/businesses/businessAdminActions.ts` so all tabs share the same callbacks. No behavior change.

### Legacy retirement
- The legacy single-page layout (filters bar + big table) becomes opt-in via `?tab=businesses&view=legacy` for one release, default = new card grid. Document in code comment. No file deletions.

### Tests
- Extend `adminBusinessesProvidersControlCenterPhase1.test.tsx` and add:
  - `adminBusinessesProvidersControlCenterRebuild.test.tsx` — mounts each tab with a fixed real-shape fixture, asserts:
    - tabs render and switch via `?tab=`
    - KPI counts match fixture
    - provider segments correctly classified
    - pilot readiness reasons present for not-ready rows
    - no hex colors, no `any`, no `@ts-ignore`, no direct `supabase.from(` in new components
    - `/admin/businesses` route still resolves
    - action callbacks invoked on card buttons

### Constraints (enforced)
- No DB / RLS / RPC / migrations / edge.
- No fake data; missing-source → empty state.
- No hardcoded hex; design tokens only.
- No `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, skipped tests.
- Route `/admin/businesses` unchanged.
- Provider leads + data enrichment untouched.

### Deliverable
Final report titled **ADMIN BUSINESSES + PROVIDERS CONTROL CENTER PROFESSIONAL REBUILD REPORT** with tsc + test results and PASS/NEEDS FIX decision.
