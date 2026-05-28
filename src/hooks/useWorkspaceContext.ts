/**
 * APP-SHELL-REARCHITECTURE-2 — Context Intelligence Layer.
 *
 * Derives the user's current workspace context (entity, module, ref) from
 * routing state and the active workspace. Pure derivation; no DB, no fetch.
 *
 * Outputs guide:
 *   - smart breadcrumbs (module-grouped)
 *   - context-aware quick actions
 *   - recovery hints (last module / last context)
 */
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { parseRef } from '@/modules/workspace/shell/refRouteMap';

export type WorkspaceModule =
  | 'dashboard'
  | 'work-orders'
  | 'operations'
  | 'contracts'
  | 'leads'
  | 'bookings'
  | 'staff'
  | 'admin'
  | 'settings'
  | 'messages'
  | 'notifications'
  | 'services'
  | 'projects'
  | 'portfolio'
  | 'reviews'
  | 'warranties'
  | 'installments'
  | 'profile-systems'
  | 'unknown';

const MODULE_PATH_MAP: Array<{ prefix: string; module: WorkspaceModule }> = [
  { prefix: '/dashboard/work-orders', module: 'work-orders' },
  { prefix: '/dashboard/operations',  module: 'operations' },
  { prefix: '/dashboard/contracts',   module: 'contracts' },
  { prefix: '/dashboard/leads',       module: 'leads' },
  { prefix: '/dashboard/bookings',    module: 'bookings' },
  { prefix: '/dashboard/settings/staff', module: 'staff' },
  { prefix: '/dashboard/settings',    module: 'settings' },
  { prefix: '/dashboard/messages',    module: 'messages' },
  { prefix: '/dashboard/notifications', module: 'notifications' },
  { prefix: '/dashboard/services',    module: 'services' },
  { prefix: '/dashboard/projects',    module: 'projects' },
  { prefix: '/dashboard/portfolio',   module: 'portfolio' },
  { prefix: '/dashboard/reviews',     module: 'reviews' },
  { prefix: '/dashboard/warranties',  module: 'warranties' },
  { prefix: '/dashboard/installments', module: 'installments' },
  { prefix: '/dashboard/profile-systems', module: 'profile-systems' },
  { prefix: '/admin',                 module: 'admin' },
  { prefix: '/dashboard',             module: 'dashboard' },
];

export function detectModuleFromPath(pathname: string): WorkspaceModule {
  for (const { prefix, module } of MODULE_PATH_MAP) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)) return module;
  }
  return 'unknown';
}

export function detectRefFromUrl(pathname: string, search: string): string | null {
  // 1) ?ref=WO-1000042
  try {
    const params = new URLSearchParams(search);
    const q = params.get('ref');
    if (q) {
      const parsed = parseRef(q);
      if (parsed) return parsed.normalized;
    }
  } catch { /* noop */ }
  // 2) /something/WO-1000042
  const segs = pathname.split('/').filter(Boolean);
  for (const seg of segs) {
    const parsed = parseRef(seg);
    if (parsed) return parsed.normalized;
  }
  return null;
}

export interface RelatedRouteHint {
  label: { ar: string; en: string };
  to: string;
}

function relatedHintsFor(module: WorkspaceModule): RelatedRouteHint[] {
  switch (module) {
    case 'work-orders':
      return [
        { label: { ar: 'تدفق العمليات', en: 'Operations Feed' }, to: '/dashboard/operations/feed' },
        { label: { ar: 'العقود', en: 'Contracts' }, to: '/dashboard/contracts' },
      ];
    case 'contracts':
      return [
        { label: { ar: 'العملاء المحتملون', en: 'Leads' }, to: '/dashboard/leads' },
        { label: { ar: 'أوامر العمل', en: 'Work Orders' }, to: '/dashboard/work-orders' },
      ];
    case 'leads':
      return [{ label: { ar: 'العقود', en: 'Contracts' }, to: '/dashboard/contracts' }];
    case 'operations':
      return [{ label: { ar: 'أوامر العمل', en: 'Work Orders' }, to: '/dashboard/work-orders' }];
    case 'staff':
      return [{ label: { ar: 'الإعدادات', en: 'Settings' }, to: '/dashboard/settings' }];
    case 'admin':
      return [{ label: { ar: 'فرز المراجع', en: 'Bulk Reference Triage' }, to: '/admin/ref/triage' }];
    default:
      return [];
  }
}

export interface WorkspaceContext {
  entity_id: string | null;
  ref: string | null;
  module: WorkspaceModule;
  pathname: string;
  related: RelatedRouteHint[];
}

export function useWorkspaceContext(): WorkspaceContext {
  const { pathname, search } = useLocation();
  const ws = useActiveWorkspace();
  const state = useWorkspaceState();

  const module = detectModuleFromPath(pathname);
  const ref = detectRefFromUrl(pathname, search);

  // Persist last context + last module for recovery.
  useEffect(() => {
    state.setLastContext({
      entity_id: ws.active_entity_id,
      ref,
      module,
      source: 'route',
    });
    if (module !== 'unknown') state.setLastModule(module);
    // intentionally narrow deps; pushing on every render is wasteful
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ref, module, ws.active_entity_id]);

  const related = useMemo(() => relatedHintsFor(module), [module]);

  return {
    entity_id: ws.active_entity_id,
    ref,
    module,
    pathname,
    related,
  };
}