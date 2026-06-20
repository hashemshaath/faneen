## RFQ Location-First Submission + Matching Governance

### Audit summary (current state)

`quote_requests` already has: `city`, `district`, `service_location_type`, `location_id` (acts as saved-site link), `metadata` (jsonb). Missing: `region`, `project_id`, explicit `no_location_selected` flag.

- `Quote.tsx` (1319 lines): 3-step form, free-text city/district, no saved-site picker, no project link, no "no address" option.
- `submit-quote-request` edge (323 lines): accepts city/district as strings, no location validation gate.
- `match-quote-request` edge (429 lines): matches by city; district handling partial; no precision tier; no guard for empty location.
- Admin RFQ detail: shows city/district text; no precision indicator, no site/project linkage display.

### Decision needed before I implement

This work spans UI, two edge functions, admin views, and 22 test assertions. Some pieces require DB columns (`region`, `project_id`, `no_location_selected` flag — could be folded into `metadata` jsonb to avoid migrations). I'd like to confirm the scope split before coding.

### Proposed plan (3 phases)

**Phase 1 — UI: location-first RFQ form** (no DB changes; uses existing columns + `metadata` jsonb)
- New `LocationStep` component inserted into `Quote.tsx` between sector and details:
  - Tab A: Saved sites — list user's `client_sites` + business sites via existing `addresses` module; selecting sets `location_id`, auto-fills city/district/region.
  - Tab B: New address — uses `RegionCitySelector` + district dropdown + optional detail line + "save to address book" checkbox.
  - Tab C: "بدون عنوان محدد" — toggles `metadata.no_location_selected=true`; still requires at least city or region; shows accuracy warning.
- Optional project picker: lists user's `projects`; if project has a site, pre-fills location; never required.
- Submit-time validation: `location_id` OR (region+city+district) OR (`no_location_selected=true` AND (city OR region)).

**Phase 2 — Edge functions**
- `submit-quote-request`: enforce the same validation server-side; persist `region` + `project_id` + `no_location_selected` into `metadata` jsonb; reject with 400 if invalid.
- `match-quote-request`: rank providers by tier (district → city → region → no-location/admin-review); skip notification if provider's service areas don't intersect; dedupe by `(quote_request_id, provider_user_id)`; downgrade no-location requests to admin-review queue rather than mass notify.

**Phase 3 — Admin + tests**
- Admin RFQ detail card: show saved-site flag, project link, region/city/district, precision tier (حي/مدينة/منطقة/غير محدد).
- New tests: `rfqLocationFirstSubmission.test.ts` (12 cases) + `rfqProviderServiceAreaMatching.test.ts` (6 cases).

### What I want to confirm

1. **DB strategy**: OK to keep `region`, `project_id`, `no_location_selected` inside existing `metadata` jsonb (zero migrations), or do you want real columns + indexes? Real columns are cleaner for matching SQL but require a migration.
2. **Saved sites source**: use `client_sites` for individuals + `business_branches` for orgs (current pattern), or only `addresses` module?
3. **Scope today**: ship all 3 phases in one pass, or Phase 1 (UI + client validation) first, then Phase 2–3 next?

Once you answer these I'll implement straight through and deliver the report.