---
name: Home Sectors CMS (P2.1)
description: Admin can edit HomeSectorGrid 10 tiles (title/body/icon/order/show) via /admin/home-sectors. Storage = taxonomy_categories.metadata.home_grid jsonb (no schema migration). HomeSectorGrid falls back to hardcoded SECTORS when no override exists; output byte-identical until admin edits.
type: feature
---
# Home Sectors CMS

- Route: `/admin/home-sectors` (AdminRoute pattern via ProtectedRoute requireAdmin + DashboardLayout).
- Storage: `taxonomy_categories.metadata.home_grid` jsonb — `{ show, position, icon, title_ar, title_en, body_ar, body_en }`. No new migration.
- Module: `src/modules/home/{services/homeSectors,hooks/useHomeSectorTiles,data/sectorIconRegistry}`.
- Hook `useHomeSectorTiles(DEFAULTS)`: returns max 10 tiles. Uses hardcoded defaults until ANY row has `metadata.home_grid.show` set — then admin took over. Slugs must be in `HOME_ALLOWED_SLUGS`.
- Icons: whitelisted Lucide set in `sectorIconRegistry.ts`. Add to SECTOR_ICONS to expose more.
- Default tiles exported from `HomeSectorGrid` as `HOME_SECTOR_GRID_DEFAULTS`.
- The guard test `homeTaxonomyLinkGuard.test.ts` still enforces 13-canonical slugs — DO NOT bypass.
- Reorder: simple up/down (matches AdminHomeFaq), no dnd-kit (kept simple, no popups).
- Admin can also surface the 3 non-grid canonical primaries (security, equipment-rental, contracting-finishing) by toggling show — `buildTileFromRow` builds the tile from DB copy.