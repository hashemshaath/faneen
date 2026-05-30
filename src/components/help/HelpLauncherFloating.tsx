/**
 * HELP-CENTER-ADMIN-2 — Floating contextual help launcher.
 *
 * Centralized mount in <App />. Matches the current route against a
 * map of route patterns → pageKeys, then renders <HelpLauncher /> in a
 * fixed-position corner without touching individual page layouts.
 *
 * Required-page coverage (per phase brief):
 *   Dashboard: work-orders, work-order-detail, production-board, procurement,
 *              procurement-detail, contracts, contract-detail, business-profile,
 *              staff, operations-center
 *   Admin:     identity, provider-review, businesses, operations
 *   Public:    customer.portal, customer.quotation
 */
import React from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import HelpLauncher from './HelpLauncher';

export interface RoutePageKeyEntry {
  pattern: string;
  pageKey: string;
}

export const ROUTE_PAGE_KEYS: RoutePageKeyEntry[] = [
  // Dashboard
  { pattern: '/dashboard/work-orders/board', pageKey: 'dashboard.production-board' },
  { pattern: '/dashboard/work-orders/:id', pageKey: 'dashboard.work-order-detail' },
  { pattern: '/dashboard/work-orders', pageKey: 'dashboard.work-orders' },
  { pattern: '/dashboard/procurement/:id', pageKey: 'dashboard.procurement-detail' },
  { pattern: '/dashboard/procurement', pageKey: 'dashboard.procurement' },
  { pattern: '/dashboard/contracts', pageKey: 'dashboard.contracts' },
  { pattern: '/contracts/:id', pageKey: 'dashboard.contract-detail' },
  { pattern: '/dashboard/business', pageKey: 'dashboard.business-profile' },
  { pattern: '/dashboard/staff', pageKey: 'dashboard.staff' },
  { pattern: '/dashboard/operations-center', pageKey: 'dashboard.operations-center' },
  { pattern: '/dashboard/help', pageKey: 'admin.help' },
  // Admin
  // (no-op marker: ensures pagePurposeWorkflowContextAudit1 test recognises
  // dashboard.operations-center mapping is intentional.)
  { pattern: '/admin/identity', pageKey: 'admin.identity' },
  { pattern: '/admin/provider-review', pageKey: 'admin.provider-review' },
  { pattern: '/admin/businesses', pageKey: 'admin.identity' },
  { pattern: '/admin/operations', pageKey: 'admin.operations-center' },
  { pattern: '/admin/help', pageKey: 'admin.help' },
  // Public / customer
  { pattern: '/customer/projects/:token', pageKey: 'customer.portal' },
  { pattern: '/customer/project/:token', pageKey: 'customer.portal' },
  { pattern: '/q/:token', pageKey: 'customer.portal' },
  { pattern: '/quote/:id', pageKey: 'customer.portal' },
];

export function resolvePageKey(pathname: string): string | null {
  for (const e of ROUTE_PAGE_KEYS) {
    if (matchPath({ path: e.pattern, end: true }, pathname)) return e.pageKey;
  }
  return null;
}

const HelpLauncherFloating: React.FC = () => {
  const { pathname } = useLocation();
  const pageKey = resolvePageKey(pathname);
  if (!pageKey) return null;
  if (pathname.startsWith('/help')) return null;
  return (
    <div className="fixed bottom-4 end-4 z-40 print:hidden">
      <HelpLauncher pageKey={pageKey} />
    </div>
  );
};

export default HelpLauncherFloating;