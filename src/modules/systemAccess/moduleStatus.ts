/**
 * ADMIN SYSTEM SETTINGS UX CLARITY — module status classifier.
 *
 * Pure helper. Maps a `system_modules` row plus admin override / scope
 * context to one of five user-facing statuses, with bilingual
 * microcopy and the linked-route list. Re-used by the System Access
 * console UI and by the governance guard tests so the labels never
 * drift from the source of truth.
 */
import { MODULE_ROUTE_ALIASES } from '@/hooks/useVisibleModules';
import type { SystemModule } from '@/modules/systemAccess';

/** Module keys deliberately kept `is_active = false` because no real
 *  backing page exists yet. Cross-referenced by
 *  `systemModuleRouteGovernanceGuard` and the activation guard below. */
export const DEAD_MODULE_KEYS = ['ai_assistant', 'ai_tools', 'documents'] as const;
export type DeadModuleKey = typeof DEAD_MODULE_KEYS[number];

/**
 * Snapshot of every dashboard route registered in `App.tsx`. Frozen
 * here so the admin console can answer "does this module point to a
 * real page?" without reading the router at runtime. Update
 * intentionally — never to silence the guard test.
 */
export const REGISTERED_DASHBOARD_ROUTES: ReadonlySet<string> = new Set([
  '/dashboard',
  '/dashboard/analytics',
  '/dashboard/assets',
  '/dashboard/badge',
  '/dashboard/blog',
  '/dashboard/bookings',
  '/dashboard/bookmarks',
  '/dashboard/branches',
  '/dashboard/brands',
  '/dashboard/business-completion',
  '/dashboard/business-draft',
  '/dashboard/business-edit',
  '/dashboard/clients',
  '/dashboard/communication-preferences',
  '/dashboard/contract-analytics',
  '/dashboard/contracts',
  '/dashboard/credentials',
  '/dashboard/diagnostics',
  '/dashboard/entities',
  '/dashboard/help',
  '/dashboard/inquiries',
  '/dashboard/installments',
  '/dashboard/leads',
  '/dashboard/loyalty',
  '/dashboard/loyalty/store',
  '/dashboard/messages',
  '/dashboard/my-requests',
  '/dashboard/no-access',
  '/dashboard/notifications',
  '/dashboard/operations',
  '/dashboard/operations-center',
  '/dashboard/operations/feed',
  '/dashboard/portfolio',
  '/dashboard/private-sectors',
  '/dashboard/procurement',
  '/dashboard/profile',
  '/dashboard/profile-systems',
  '/dashboard/projects',
  '/dashboard/promotions',
  '/dashboard/provider/leads',
  '/dashboard/provider/membership',
  '/dashboard/provider/service-areas',
  '/dashboard/rentals',
  '/dashboard/rentals/analytics',
  '/dashboard/rentals/calendar',
  '/dashboard/reviews',
  '/dashboard/rfq',
  '/dashboard/rfq/inbox',
  '/dashboard/services',
  '/dashboard/settings',
  '/dashboard/settings/staff',
  '/dashboard/settings/staff-access',
  '/dashboard/showcase',
  '/dashboard/sites',
  '/dashboard/warranties',
  '/dashboard/work-orders',
  '/dashboard/work-orders/board',
  '/dashboard/work-orders/overview',
  // Non-dashboard routes that some modules legitimately point to:
  '/membership',
]);

export type ModuleStatus =
  | 'active_with_page'
  | 'disabled_by_admin'
  | 'not_ready'
  | 'hidden_by_permissions';

export interface ModuleStatusLabel {
  readonly status: ModuleStatus;
  readonly ar: string;
  readonly en: string;
  readonly tone: 'success' | 'warning' | 'muted' | 'destructive';
}

export const MODULE_STATUS_LABELS: Record<ModuleStatus, ModuleStatusLabel> = {
  active_with_page: {
    status: 'active_with_page',
    ar: 'نشط وله صفحة',
    en: 'Active with page',
    tone: 'success',
  },
  disabled_by_admin: {
    status: 'disabled_by_admin',
    ar: 'معطّل من الإدارة',
    en: 'Disabled by admin',
    tone: 'destructive',
  },
  not_ready: {
    status: 'not_ready',
    ar: 'غير جاهز — لا توجد صفحة مفعّلة بعد',
    en: 'Not ready — no active page yet',
    tone: 'muted',
  },
  hidden_by_permissions: {
    status: 'hidden_by_permissions',
    ar: 'مخفي بسبب الصلاحيات',
    en: 'Hidden by permissions',
    tone: 'warning',
  },
};

export const LINKED_ROUTES_BADGE = {
  ar: 'يملك أكثر من مسار مرتبط',
  en: 'Has linked routes',
} as const;

export const DISABLE_WARNING_TEXT = {
  ar: 'تعطيل هذا النظام سيخفيه من القائمة ويمنع الوصول المباشر إلى مساراته.',
  en: 'Disabling this module hides it from navigation and blocks direct route access.',
} as const;

export const ACTIVATE_BLOCKED_TEXT = {
  ar: 'لا يمكن تفعيل هذا النظام قبل ربطه بصفحة فعلية.',
  en: 'Cannot activate this module before it is linked to a real page.',
} as const;

export const NO_PAGE_HINT_TEXT = {
  ar: 'لا تتوفر صفحة فعلية مرتبطة بهذا النظام بعد.',
  en: 'No real page is linked to this module yet.',
} as const;

export interface ClassifyContext {
  /** Effective enabled state for the current scope (override OR default). */
  effectiveEnabled: boolean;
  /** Whether an explicit admin override exists for the current scope and is disabling. */
  hasDisablingOverride?: boolean;
  /** For per-user scope: viewer lacks permission to reach this module. */
  hiddenByPermissions?: boolean;
}

export interface ModuleStatusInfo {
  status: ModuleStatus;
  label: ModuleStatusLabel;
  hasRealRoute: boolean;
  isDead: boolean;
  primaryRoute: string | null;
  linkedRoutes: readonly string[];
  /** True only when the module is safe to flip ON from the admin UI. */
  canActivate: boolean;
  /** Reason an activation attempt would be rejected. */
  blockedReason: { ar: string; en: string } | null;
}

/** Does the given route exist in the App.tsx snapshot? Accepts parent
 *  prefixes (e.g. `/dashboard/sites` covers `/dashboard/sites/:id`). */
export function isRealDashboardRoute(route: string | null | undefined): boolean {
  if (!route) return false;
  if (REGISTERED_DASHBOARD_ROUTES.has(route)) return true;
  for (const r of REGISTERED_DASHBOARD_ROUTES) {
    if (route.startsWith(r + '/')) return true;
  }
  return false;
}

export function getLinkedRoutes(moduleKey: string): readonly string[] {
  return MODULE_ROUTE_ALIASES[moduleKey] ?? [];
}

export function classifyModule(
  module: SystemModule,
  ctx: ClassifyContext,
): ModuleStatusInfo {
  const isDead = (DEAD_MODULE_KEYS as readonly string[]).includes(module.key);
  const hasRealRoute = isRealDashboardRoute(module.route);
  const linkedRoutes = getLinkedRoutes(module.key);

  // Activation is blocked when the module has no real page OR is on the
  // dead-list. Core modules are always active by design.
  const canActivate = !isDead && hasRealRoute;
  const blockedReason = !canActivate ? ACTIVATE_BLOCKED_TEXT : null;

  let status: ModuleStatus;
  if (!module.is_active || isDead || !hasRealRoute) {
    status = 'not_ready';
  } else if (ctx.hiddenByPermissions) {
    status = 'hidden_by_permissions';
  } else if (ctx.hasDisablingOverride || !ctx.effectiveEnabled) {
    status = 'disabled_by_admin';
  } else {
    status = 'active_with_page';
  }

  return {
    status,
    label: MODULE_STATUS_LABELS[status],
    hasRealRoute,
    isDead,
    primaryRoute: module.route ?? null,
    linkedRoutes,
    canActivate,
    blockedReason,
  };
}