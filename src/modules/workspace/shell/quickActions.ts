/**
 * APP-SHELL-REARCHITECTURE-1 — Quick-action registry.
 *
 * Static, declarative list. No DB, no network. UI filters by role,
 * required permission, and (optionally) the current pathname.
 */

export type QuickActionAudience = 'admin' | 'provider' | 'user';

export interface QuickActionDefinition {
  id: string;
  label: { ar: string; en: string };
  to: string;
  /** Audiences that can ever see this action. Empty = everyone. */
  audiences: QuickActionAudience[];
  /** Workspace permission required (uses resolveEffectivePermissions). */
  requiresPermission?: string;
  /** Optional predicate: only show on matching pathnames (prefix match). */
  visibleOnPathPrefixes?: string[];
  /** Icon name from lucide — resolved at render site. */
  icon: string;
}

export const QUICK_ACTIONS: readonly QuickActionDefinition[] = [
  {
    id: 'create-work-order',
    label: { ar: 'إنشاء أمر عمل', en: 'Create Work Order' },
    to: '/dashboard/work-orders?create=1',
    audiences: ['admin', 'provider'],
    requiresPermission: 'bookings.view',
    icon: 'ClipboardList',
  },
  {
    id: 'operations-feed',
    label: { ar: 'تدفق العمليات', en: 'Operations Feed' },
    to: '/dashboard/operations/feed',
    audiences: ['admin', 'provider'],
    requiresPermission: 'bookings.view',
    icon: 'Activity',
  },
  {
    id: 'staff-center',
    label: { ar: 'مركز الموظفين', en: 'Staff Center' },
    to: '/dashboard/settings/staff',
    audiences: ['admin', 'provider'],
    requiresPermission: 'staff.view',
    icon: 'Users',
  },
  {
    id: 'contracts',
    label: { ar: 'العقود', en: 'Contracts' },
    to: '/dashboard/contracts',
    audiences: ['admin', 'provider'],
    requiresPermission: 'contracts.view',
    icon: 'FileText',
  },
  {
    id: 'leads',
    label: { ar: 'العملاء المحتملون', en: 'Leads' },
    to: '/dashboard/leads',
    audiences: ['admin', 'provider'],
    requiresPermission: 'leads.view',
    icon: 'Inbox',
  },
  {
    id: 'operations-console',
    label: { ar: 'وحدة العمليات', en: 'Operations Console' },
    to: '/admin/operations/console',
    audiences: ['admin'],
    icon: 'Gauge',
  },
  {
    id: 'bulk-reference-triage',
    label: { ar: 'فرز المراجع', en: 'Bulk Reference Triage' },
    to: '/admin/ref/triage',
    audiences: ['admin'],
    icon: 'Database',
  },
  {
    id: 'admin-reports',
    label: { ar: 'مركز التقارير', en: 'Reports Center' },
    to: '/admin/reports',
    audiences: ['admin'],
    icon: 'BarChart3',
  },
  {
    id: 'admin-contracts',
    label: { ar: 'إدارة العقود', en: 'Manage Contracts' },
    to: '/admin/contracts',
    audiences: ['admin'],
    icon: 'FileText',
  },
  {
    id: 'admin-contract-create',
    label: { ar: 'إنشاء عقد جديد', en: 'Create Contract' },
    to: '/admin/contracts/create',
    audiences: ['admin'],
    icon: 'FilePlus',
  },
];

export interface QuickActionFilterCtx {
  audience: QuickActionAudience;
  hasPermission: (permission: string) => boolean;
  pathname?: string;
}

export function filterQuickActions(
  actions: readonly QuickActionDefinition[],
  ctx: QuickActionFilterCtx,
): QuickActionDefinition[] {
  return actions.filter((a) => {
    if (a.audiences.length > 0 && !a.audiences.includes(ctx.audience)) return false;
    if (a.requiresPermission && !ctx.hasPermission(a.requiresPermission)) return false;
    if (a.visibleOnPathPrefixes && a.visibleOnPathPrefixes.length > 0 && ctx.pathname) {
      if (!a.visibleOnPathPrefixes.some((p) => ctx.pathname!.startsWith(p))) return false;
    }
    return true;
  });
}