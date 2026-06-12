/**
 * ADMIN-REDESIGN PHASE 4 — Admin Dashboard module barrel.
 * Surface only the public API; everything else is internal.
 */
export {
  ADMIN_DASHBOARD_WIDGETS,
  ADMIN_DASHBOARD_QUICK_ACTIONS,
  ADMIN_DASHBOARD_DEFAULT_ORDER,
  getAdminWidget,
} from './widgets/adminDashboardWidgets';
export type {
  AdminWidgetDefinition,
  AdminWidgetGroup,
  AdminWidgetSize,
  AdminWidgetPermission,
  AdminQuickAction,
} from './widgets/adminDashboardWidgets';
export {
  useAdminDashboardLayout,
  ADMIN_DASHBOARD_LAYOUT_KEY,
} from './hooks/useAdminDashboardLayout';
export type { UseAdminDashboardLayoutResult } from './hooks/useAdminDashboardLayout';
export { AdminWidgetShell } from './components/AdminWidgetShell';
export { AdminDashboardCustomizeBar } from './components/AdminDashboardCustomizeBar';
export { AdminQuickActionsWidget } from './components/AdminQuickActionsWidget';