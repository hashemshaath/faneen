# `@/modules/google`

Unified Google integration module. **All Google Maps Platform usage in the
app must import from here.** Created by `GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1`.

## Layout

| Service | Purpose | Backed by |
|---|---|---|
| `mapsService` | Browser Maps JS loader + Static Maps URL (browser key) | `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` |
| `placesService` | Places API (New) — searchText / searchNearby / getDetails | edge fn `google-places` |
| `geocodingService` | Forward + reverse geocoding | edge fn `google-geocoding` |
| `addressValidationService` | Address Validation API | edge fn `google-address-validation` |
| `routesService` | Routes + Distance Matrix | edge fn `google-routes` |
| `healthService` | Admin health probes + 24h usage | edge fn `google-health` |

## Rules

- **Frontend never calls** `connector-gateway.lovable.dev/google_maps/*` directly.
- **Edge functions never read** `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
- The browser key is **only** read by `mapsService.ts`.
- All server keys live in Supabase Secrets (`GOOGLE_MAPS_API_KEY`, `LOVABLE_API_KEY`).
- Every server edge fn writes to `google_api_usage_log` (best-effort) for the admin dashboard.