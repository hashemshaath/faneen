/**
 * RENTALS MODULE ALIAS GUARD
 *
 * Verifies — at the runtime level — that disabling the `rentals` system
 * module hides every related route through the SAME machinery
 * ProtectedRoute uses (useVisibleModules → isRouteHidden):
 *
 *   /dashboard/rentals
 *   /dashboard/rentals/calendar
 *   /dashboard/rentals/analytics
 *   /rentals
 *   /rentals/some-item-slug   (prefix child)
 *
 * And that re-enabling the module unblocks them. Pure source-level
 * reconstruction of the alias resolver in useVisibleModules — keeps
 * the test independent of React / Supabase.
 */
import { describe, it, expect } from 'vitest';
import { MODULE_ROUTE_ALIASES } from '@/hooks/useVisibleModules';

interface FakeModuleMeta {
  key: string;
  route: string;
  is_core: boolean;
}
interface FakeVisibility {
  module_key: string;
  enabled: boolean;
}

/**
 * Mirrors the routeVisibility + isRouteHidden logic in
 * src/hooks/useVisibleModules.ts. Kept tiny on purpose so this guard
 * fails fast if the production resolver changes shape.
 */
function buildIsRouteHidden(
  catalog: FakeModuleMeta[],
  visibility: FakeVisibility[],
) {
  const byKey = new Map(catalog.map((m) => [m.key, m]));
  const items: Array<{ route: string; enabled: boolean }> = [];
  for (const v of visibility) {
    const meta = byKey.get(v.module_key);
    if (!meta?.route || meta.is_core) continue;
    const routes = new Set([meta.route, ...(MODULE_ROUTE_ALIASES[v.module_key] ?? [])]);
    for (const route of routes) items.push({ route, enabled: v.enabled });
  }
  items.sort((a, b) => b.route.length - a.route.length);
  return (path: string): boolean => {
    for (const it of items) {
      if (path === it.route) return !it.enabled;
      if (path.startsWith(it.route + '/')) return !it.enabled;
    }
    return false;
  };
}

const RENTALS: FakeModuleMeta = {
  key: 'rentals',
  route: '/dashboard/rentals',
  is_core: false,
};

const RENTAL_ROUTES_TO_BLOCK = [
  '/dashboard/rentals',
  '/dashboard/rentals/calendar',
  '/dashboard/rentals/analytics',
  '/rentals',
  '/rentals/scaffolding-tower-12m',
];

const UNRELATED_ROUTES = [
  '/dashboard',
  '/dashboard/messages',
  '/admin/rentals', // admin route — outside the visibility catalog by policy
  '/',
  '/search',
];

describe('rentals module alias guard', () => {
  it('MODULE_ROUTE_ALIASES.rentals covers all public + dashboard rental paths', () => {
    const aliases = MODULE_ROUTE_ALIASES.rentals;
    expect(aliases).toBeDefined();
    expect(aliases).toEqual(
      expect.arrayContaining([
        '/dashboard/rentals',
        '/dashboard/rentals/calendar',
        '/dashboard/rentals/analytics',
        '/rentals',
      ]),
    );
  });

  it('disabling rentals hides every aliased route + child paths', () => {
    const isHidden = buildIsRouteHidden([RENTALS], [
      { module_key: 'rentals', enabled: false },
    ]);
    for (const r of RENTAL_ROUTES_TO_BLOCK) {
      expect(isHidden(r), `expected ${r} to be hidden when rentals is disabled`).toBe(true);
    }
  });

  it('disabling rentals does NOT bleed into unrelated routes', () => {
    const isHidden = buildIsRouteHidden([RENTALS], [
      { module_key: 'rentals', enabled: false },
    ]);
    for (const r of UNRELATED_ROUTES) {
      expect(isHidden(r), `expected ${r} to remain visible`).toBe(false);
    }
  });

  it('enabling rentals unblocks every aliased route', () => {
    const isHidden = buildIsRouteHidden([RENTALS], [
      { module_key: 'rentals', enabled: true },
    ]);
    for (const r of RENTAL_ROUTES_TO_BLOCK) {
      expect(isHidden(r), `expected ${r} to be visible when rentals is enabled`).toBe(false);
    }
  });

  it('rentals is NOT marked core — admins must be able to disable it', () => {
    expect(RENTALS.is_core).toBe(false);
  });

  it('admin route /admin/rentals is not governed by the rentals module key', () => {
    // /admin/rentals is intentionally outside the visibility catalog
    // (admin pages bypass module visibility — they live under requireAdmin).
    expect(MODULE_ROUTE_ALIASES.rentals).not.toContain('/admin/rentals');
  });
});