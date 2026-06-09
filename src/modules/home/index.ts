export type { HomeFaqItem, HomeFaqInput } from './types';
export {
  fetchPublicHomeFaq,
  fetchAllHomeFaq,
  createHomeFaq,
  updateHomeFaq,
  deleteHomeFaq,
} from './services/homeFaq';
export {
  useHomeFaq,
  useAdminHomeFaq,
  HOME_FAQ_FALLBACK,
  HOME_FAQ_PUBLIC_KEY,
  HOME_FAQ_ADMIN_KEY,
} from './hooks/useHomeFaq';

// Home sector tiles CMS (P2.1)
export {
  fetchPrimaryActivities,
  fetchAllPrimaryActivities,
  updateHomeSectorOverride,
  type HomeSectorRow,
  type HomeSectorOverride,
} from './services/homeSectors';
export {
  useHomeSectorTiles,
  useAdminHomeSectors,
  HOME_SECTOR_TILES_KEY,
  HOME_SECTOR_TILES_ADMIN_KEY,
  type SectorTile,
  type DefaultTile,
} from './hooks/useHomeSectorTiles';
export { SECTOR_ICONS, SECTOR_ICON_NAMES, resolveSectorIcon } from './data/sectorIconRegistry';