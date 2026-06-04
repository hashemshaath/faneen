# GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1

## 1. Inventory (audit phase — read-only)

Produce `docs/google-integration-audit.md` covering:

**Services found in code**
- Google Maps JavaScript API — `LocationPicker.tsx`, `ExecutionSiteSection.tsx`, `SearchMap.tsx` (currently Leaflet/OSM, not Google), `BusinessProfileTabs.tsx`
- Places API (New) — used inside `admin-enrichment-search`, `admin-enrichment-fetch`
- Geocoding API — referenced in enrichment edge functions
- Routes / Address Validation — not yet wired
- Google OAuth — `GoogleAuthButton.tsx` (managed by Lovable Cloud)
- Google Tag Manager / Analytics — `lib/gtm.ts`, `analytics-events.ts`, `ConsentBanner.tsx`
- Google Search Console — `ping-search-engines`, `audit-sitemap-status`
- reCAPTCHA / Firebase / FCM — **not present** (confirm and document)

**Keys**
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (browser, referrer-restricted)
- `GOOGLE_MAPS_API_KEY` (server, via connector gateway) + `LOVABLE_API_KEY`
- Google OAuth client (managed)
- GTM container ID (public, env)

**Architectural defects to flag** (and fix in phase 3)
- Any frontend code that calls `connector-gateway.lovable.dev/google_maps/*` directly with browser-exposed bearer (must go through edge function).
- Any edge function importing the browser key.
- Any hardcoded `AIza…` strings.
- Duplicate ad-hoc fetchers for Places/Geocoding outside a service layer.

## 2. New unified module — `src/modules/google/`

```
src/modules/google/
  index.ts                  // barrel
  mapsService.ts            // browser Maps JS loader (single source)
  placesService.ts          // client wrapper → edge fn `google-places`
  geocodingService.ts       // client wrapper → edge fn `google-geocoding`
  addressValidationService.ts // → edge fn `google-address-validation`
  routesService.ts          // → edge fn `google-routes`
  types.ts
  README.md
```

Each *service* file is a thin client wrapper that calls a corresponding edge function — **no direct gateway calls from the browser**.

## 3. Edge functions (server-side, use gateway)

New / consolidated:
- `supabase/functions/google-places/index.ts` — searchText, searchNearby, place details
- `supabase/functions/google-geocoding/index.ts` — forward + reverse
- `supabase/functions/google-address-validation/index.ts`
- `supabase/functions/google-routes/index.ts`
- `supabase/functions/google-health/index.ts` — calls `verify_credentials` + one cheap probe per API, returns `{ places, geocoding, routes, addressValidation } → { ok, latencyMs, lastError, checkedAt }`

Migrate existing usages in `admin-enrichment-*` to import from `_shared/google/*` helpers (DRY) instead of repeating fetch boilerplate.

## 4. Admin health dashboard

New route `src/pages/admin/AdminGoogleServices.tsx` mounted at `/admin/integrations/google`:
- Cards per API: status dot, latency, last success, last failure, daily call count (from a lightweight `google_api_usage_log` table written by edge functions).
- "Re-check now" button → calls `google-health`.
- Never prints keys; never accepts keys via UI.
- Add to admin sidebar under Integrations.

Tiny migration: `google_api_usage_log(id, api, status, latency_ms, error_code, created_at)` + RLS (admin read only) + GRANTs.

## 5. Security hardening

- Strip browser key out of any non-Maps-JS code paths.
- Edge functions: never echo `GOOGLE_MAPS_API_KEY` or `LOVABLE_API_KEY` in error messages — central error mapper.
- Add a CI scanner script `scripts/google-keys-isolation-audit.mjs` (parallel to existing `*-isolation-audit.mjs` family).

## 6. Tests — `src/tests/googleIntegrationGovernanceAudit1.test.ts`

Assertions (ripgrep-based, no runtime):
1. No `connector-gateway.lovable.dev/google_maps` references in `src/` (only `supabase/functions/`).
2. No `AIza` literal anywhere in `src/` or `supabase/functions/`.
3. No `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` outside `src/modules/google/mapsService.ts`.
4. No `import.meta.env.VITE_*GOOGLE*` references inside `supabase/functions/`.
5. Frontend pages importing Places/Geocoding/Routes/AddressValidation only via `@/modules/google`.
6. Edge functions `google-places|geocoding|routes|address-validation|health` exist.
7. Admin page + sidebar entry exist.

## 7. Final report

Append PASS/FAIL summary + cost notes (cache opportunities: dedupe geocoding by `(lat,lng)` rounded; cache Place details for 30d) to `docs/google-integration-audit.md`.

## Technical notes
- All edge functions: zod-validated input, CORS shared, `verify_jwt = false` only for `google-health` if invoked from public health probes — otherwise auth-gated to admin via `has_admin_access`.
- Logging table writes are best-effort (`try/catch`, never block response).
- No popups in admin UI — inline cards per project UX rule.
- Keep Leaflet-based `SearchMap` as-is (not Google) but document it explicitly so future contributors don't "migrate" it accidentally.

## Out of scope
- Migrating `SearchMap` from Leaflet to Google Maps.
- Refactoring GTM/Analytics (separate audit).
- Google OAuth changes (managed, working).
