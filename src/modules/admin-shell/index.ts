/**
 * ADMIN-REDESIGN PHASE 3 — Admin shell module barrel.
 *
 * Centralizes the admin navigation registry and shell helpers so that
 * the sidebar, command palette, breadcrumbs and tests all import from a
 * single, stable entry point.
 */
export {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  findAdminNavItem,
  filterByPermission,
} from './navigation/adminNavigation';
export type {
  AdminNavGroup,
  AdminNavGroupId,
  AdminNavItem,
  AdminNavBadge,
  AdminNavPermission,
} from './navigation/adminNavigation';