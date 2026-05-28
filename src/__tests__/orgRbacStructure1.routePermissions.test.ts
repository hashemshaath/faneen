/**
 * ORG-RBAC-STRUCTURE-1 — Phase G tests.
 *
 * Covers:
 *  - every sidebar URL is either mapped in routePermissions or intentionally
 *    unmapped (admin / deep-link family)
 *  - every mapped route exists as a `path=` in src/App.tsx
 *  - admin override always allows
 *  - owner short-circuits manage-level routes
 *  - viewer (entity.view only) does NOT see manage / billing / settings
 *  - billing pages hidden without `payments.view` / `memberships.view`
 *  - admin routes bypass workspace permissions
 *  - the route map contains no duplicate visibility logic (single source)
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  WORKSPACE_ROUTE_PERMISSIONS,
  canViewWorkspaceRoute,
  getWorkspaceRouteDescriptor,
  listWorkspaceRouteKeys,
} from '@/modules/workspace/permissions/routePermissions';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const APP_TSX = fs.readFileSync(path.join(REPO_ROOT, 'src/App.tsx'), 'utf8');
const SIDEBAR_TSX = fs.readFileSync(
  path.join(REPO_ROOT, 'src/components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);

const appRoutePaths = new Set<string>(
  Array.from(APP_TSX.matchAll(/path="([^"]+)"/g)).map((m) => m[1]),
);

const sidebarUrls = Array.from(
  SIDEBAR_TSX.matchAll(/url:\s*'([^']+)'/g),
).map((m) => m[1]);

const OWNER = { active_role: 'owner', permissions: [] };
const VIEWER = { active_role: 'viewer', permissions: [] };
const SALES = { active_role: 'sales', permissions: [] };
const STAFF = { active_role: 'staff', permissions: [] };
const MANAGER = { active_role: 'business_manager', permissions: [] };
const FINANCE = { active_role: 'finance', permissions: [] };

describe('routePermissions — map integrity', () => {
  it('every mapped route resolves to a real path or path-prefix in App.tsx', () => {
    const missing: string[] = [];
    for (const key of listWorkspaceRouteKeys()) {
      // strip query string for matching
      const base = key.split('?')[0];
      const hit =
        appRoutePaths.has(base) ||
        // allow parametric children e.g. /dashboard/work-orders matches /dashboard/work-orders/:refId
        Array.from(appRoutePaths).some((p) => p.startsWith(base + '/'));
      if (!hit) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  it('no duplicate route keys in the map', () => {
    const keys = Object.keys(WORKSPACE_ROUTE_PERMISSIONS);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every workspace (non-admin, non-membership) sidebar url is mapped', () => {
    const workspaceSidebarUrls = sidebarUrls
      .filter((u) => u.startsWith('/dashboard') || u === '/membership')
      // strip query — base path is what we map
      .map((u) => u.split('?')[0]);
    const unmapped = workspaceSidebarUrls.filter(
      (u) => !getWorkspaceRouteDescriptor(u),
    );
    expect(unmapped).toEqual([]);
  });
});

describe('canViewWorkspaceRoute — overrides', () => {
  it('admin sees every mapped route', () => {
    for (const key of listWorkspaceRouteKeys()) {
      expect(
        canViewWorkspaceRoute(key, { workspace: VIEWER, isAdmin: true }),
      ).toBe(true);
    }
  });

  it('owner sees every mapped route', () => {
    for (const key of listWorkspaceRouteKeys()) {
      expect(
        canViewWorkspaceRoute(key, { workspace: OWNER, isAdmin: false }),
      ).toBe(true);
    }
  });

  it('unmapped routes fall through to visible (safe additive default)', () => {
    expect(
      canViewWorkspaceRoute('/dashboard/some-future-route', {
        workspace: VIEWER,
      }),
    ).toBe(true);
  });
});

describe('canViewWorkspaceRoute — viewer / least-privileged', () => {
  it('viewer does NOT see manage-level entity routes', () => {
    const manageRoutes = listWorkspaceRouteKeys().filter(
      (k) => {
        const d = getWorkspaceRouteDescriptor(k);
        return d?.level === 'manage' && d.scope === 'entity';
      },
    );
    expect(manageRoutes.length).toBeGreaterThan(0);
    for (const r of manageRoutes) {
      expect(canViewWorkspaceRoute(r, { workspace: VIEWER })).toBe(false);
    }
  });

  it('viewer does see view-only entity routes (entity.view) and all personal routes', () => {
    expect(canViewWorkspaceRoute('/dashboard/analytics', { workspace: VIEWER })).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/portfolio', { workspace: VIEWER })).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/profile', { workspace: VIEWER })).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/messages', { workspace: VIEWER })).toBe(true);
    expect(canViewWorkspaceRoute('/membership', { workspace: VIEWER })).toBe(true);
  });

  it('viewer does NOT see leads / quotes / bookings / contracts / settings', () => {
    for (const r of [
      '/dashboard/leads',
      '/dashboard/provider/leads',
      '/dashboard/bookings',
      '/dashboard/contracts',
      '/dashboard/work-orders',
      '/dashboard/settings',
    ]) {
      expect(canViewWorkspaceRoute(r, { workspace: VIEWER })).toBe(false);
    }
  });
});

describe('canViewWorkspaceRoute — billing / membership gating', () => {
  it('hides /dashboard/provider/membership and /dashboard/installments from sales/staff/viewer', () => {
    for (const ws of [SALES, STAFF, VIEWER]) {
      expect(canViewWorkspaceRoute('/dashboard/provider/membership', { workspace: ws })).toBe(false);
      expect(canViewWorkspaceRoute('/dashboard/installments', { workspace: ws })).toBe(false);
    }
  });

  it('shows billing pages to finance role and to owner', () => {
    expect(canViewWorkspaceRoute('/dashboard/provider/membership', { workspace: FINANCE })).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/installments', { workspace: FINANCE })).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/provider/membership', { workspace: OWNER })).toBe(true);
  });

  it('personal /membership is never gated', () => {
    for (const ws of [OWNER, MANAGER, SALES, STAFF, VIEWER, FINANCE]) {
      expect(canViewWorkspaceRoute('/membership', { workspace: ws })).toBe(true);
    }
  });
});

describe('canViewWorkspaceRoute — staff & settings gating', () => {
  it('hides /dashboard/badge and /dashboard/business-edit from non-managers (manage perms required)', () => {
    for (const ws of [SALES, STAFF, VIEWER]) {
      expect(canViewWorkspaceRoute('/dashboard/business-edit', { workspace: ws })).toBe(false);
      expect(canViewWorkspaceRoute('/dashboard/badge', { workspace: ws })).toBe(false);
    }
  });

  it('hides /dashboard/settings from non-managers', () => {
    for (const ws of [SALES, STAFF, VIEWER]) {
      expect(canViewWorkspaceRoute('/dashboard/settings', { workspace: ws })).toBe(false);
    }
    expect(canViewWorkspaceRoute('/dashboard/settings', { workspace: MANAGER })).toBe(true);
  });
});

describe('Admin sidebar bypasses workspace permissions', () => {
  it('admin-only routes are NOT present in the workspace route map', () => {
    const adminLeaks = listWorkspaceRouteKeys().filter((k) => k.startsWith('/admin/'));
    expect(adminLeaks).toEqual([]);
  });

  it('admin sidebar links resolve to App.tsx (no dead admin links from the sidebar)', () => {
    const adminSidebarUrls = sidebarUrls
      .filter((u) => u.startsWith('/admin/'))
      .map((u) => u.split('?')[0]);
    const dead = adminSidebarUrls.filter(
      (u) =>
        !appRoutePaths.has(u) &&
        !Array.from(appRoutePaths).some((p) => p.startsWith(u + '/')) &&
        // wildcard catch
        u !== '*',
    );
    expect(dead).toEqual([]);
  });
});

describe('No duplicated sidebar visibility logic', () => {
  it('DashboardSidebar delegates to canViewWorkspaceRoute (single source of truth)', () => {
    expect(SIDEBAR_TSX).toMatch(/canViewWorkspaceRoute/);
    // The only role-based visibility flag still allowed at the sidebar level
    // is `superAdminOnly` (legacy super-admin reveal for admin sidebar items).
    // Anything else would be a regression of duplicated logic.
    const adHocChecks = SIDEBAR_TSX.match(/isProvider\s*&&|isAdmin\s*&&\s*item|role\s*===/g) ?? [];
    expect(adHocChecks.length).toBe(0);
  });
});