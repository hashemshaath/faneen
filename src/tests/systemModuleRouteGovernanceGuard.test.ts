/**
 * SYSTEM MODULE ROUTE GOVERNANCE GUARD
 *
 * Permanent guard tests preventing regressions where:
 *   1. an active system module points to a route that doesn't exist in App.tsx,
 *   2. ProtectedRoute stops honouring `useVisibleModules().isRouteHidden()`,
 *   3. route aliases for payments / credits / staff_management / activity_log
 *      stop covering both old + new paths,
 *   4. sidebar visibility & route access drift apart,
 *   5. dead modules (ai_assistant, ai_tools, documents) get silently
 *      re-activated without a real backing page.
 *
 * Pure source-scan. No DB / no React render — runs in CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const APP = read('src/App.tsx');
const PROTECTED = read('src/components/auth/ProtectedRoute.tsx');
const VISIBLE = read('src/hooks/useVisibleModules.ts');

/* Registered route paths in App.tsx (both real routes and Navigate aliases). */
const REGISTERED_ROUTES: string[] = Array.from(
  APP.matchAll(/<Route\s+path="([^"]+)"/g),
).map((m) => m[1]);

const isRegistered = (url: string): boolean => {
  const path = url.split('?')[0].split('#')[0];
  if (REGISTERED_ROUTES.includes(path)) return true;
  return REGISTERED_ROUTES.some(
    (r) => r === path || (r.endsWith('/*') && path.startsWith(r.slice(0, -2))),
  );
};

/**
 * Frozen snapshot of the active system_modules catalog (key → expected route).
 * Update intentionally when the catalog changes — never to silence the test.
 */
const EXPECTED_ACTIVE_MODULES: Record<string, string> = {
  activity_log: '/dashboard/operations/feed',
  analytics: '/dashboard/analytics',
  blog: '/dashboard/blog',
  bookings: '/dashboard/bookings',
  business_info: '/dashboard/business-edit',
  communication_prefs: '/dashboard/communication-preferences',
  contract_analytics: '/dashboard/contract-analytics',
  contracts: '/dashboard/contracts',
  credits: '/dashboard/provider/membership',
  customers: '/dashboard/clients',
  dashboard: '/dashboard',
  entities: '/dashboard/entities',
  installments: '/dashboard/installments',
  leads: '/dashboard/leads',
  loyalty: '/dashboard/loyalty',
  marketing: '/dashboard/promotions',
  membership_credits: '/dashboard/provider/membership',
  memberships: '/membership',
  messaging: '/dashboard/messages',
  notifications: '/dashboard/notifications',
  operations_log: '/dashboard/operations/feed',
  payments: '/dashboard/installments',
  portfolio: '/dashboard/portfolio',
  private_sectors: '/dashboard/private-sectors',
  profile: '/dashboard/profile',
  projects: '/dashboard/projects',
  quote_inbox: '/dashboard/rfq/inbox',
  quote_requests: '/dashboard/rfq',
  quotes: '/dashboard/provider/leads',
  reviews: '/dashboard/reviews',
  rewards_store: '/dashboard/loyalty/store',
  service_areas: '/dashboard/provider/service-areas',
  services: '/dashboard/services',
  settings: '/dashboard/settings',
  staff: '/dashboard/settings/staff',
  staff_management: '/dashboard/settings/staff',
  staff_permissions: '/dashboard/settings/staff-access',
  verification_badge: '/dashboard/badge',
  warranty: '/dashboard/warranties',
  work_orders: '/dashboard/work-orders',
};

/** Modules deactivated because they have no real backing page. */
const MUST_REMAIN_INACTIVE = ['ai_assistant', 'ai_tools', 'documents'] as const;

/* ──────────────────────────────────────────────────────────────────────── */
/* 1. every active module points to a real registered route                  */
/* ──────────────────────────────────────────────────────────────────────── */
describe('Guard 1 — every active module has a real route', () => {
  it('catalog snapshot covers ≥40 active modules', () => {
    const count = Object.keys(EXPECTED_ACTIVE_MODULES).length;
    expect(count).toBeGreaterThanOrEqual(40);
  });

  it.each(Object.entries(EXPECTED_ACTIVE_MODULES))(
    'active module %s → route %s exists in App.tsx',
    (_key, route) => {
      expect(route, `module route must not be empty`).toBeTruthy();
      expect(route, `module route must not be a placeholder`).not.toMatch(
        /(coming-?soon|placeholder|todo|wip)/i,
      );
      expect(
        isRegistered(route),
        `${route} is not registered in App.tsx (active module points to ghost route)`,
      ).toBe(true);
    },
  );
});

/* ──────────────────────────────────────────────────────────────────────── */
/* 2. ProtectedRoute honours module visibility                              */
/* ──────────────────────────────────────────────────────────────────────── */
describe('Guard 2 — ProtectedRoute blocks disabled modules', () => {
  it('imports useVisibleModules', () => {
    expect(PROTECTED).toMatch(/from\s+['"]@\/hooks\/useVisibleModules['"]/);
    expect(PROTECTED).toMatch(/useVisibleModules\s*\(/);
  });

  it('calls isRouteHidden against the current pathname', () => {
    expect(PROTECTED).toMatch(/isRouteHidden\s*\(\s*location\.pathname/);
  });

  it('redirects denied paths to /dashboard/no-access (not just hides sidebar)', () => {
    expect(PROTECTED).toMatch(/to\s*=\s*["']\/dashboard\/no-access["']/);
    expect(PROTECTED).toMatch(/reason:\s*['"]module_disabled['"]/);
  });

  it('does not bypass the visibility check on /dashboard/no-access itself (infinite loop guard)', () => {
    expect(PROTECTED).toMatch(
      /location\.pathname\s*!==\s*['"]\/dashboard\/no-access['"]/,
    );
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* 3. route aliases cover both old + new paths                              */
/* ──────────────────────────────────────────────────────────────────────── */
describe('Guard 3 — route aliases cover legacy + canonical paths', () => {
  const ALIAS_REQUIREMENTS: Array<[string, string[]]> = [
    ['payments', ['/dashboard/installments', '/dashboard/payments']],
    ['credits', ['/dashboard/provider/membership', '/dashboard/credits']],
    ['staff_management', ['/dashboard/settings/staff', '/dashboard/team']],
    ['activity_log', ['/dashboard/operations/feed', '/dashboard/activity']],
  ];

  it.each(ALIAS_REQUIREMENTS)(
    'module %s alias entry exists and covers all required paths',
    (key, paths) => {
      const entryRe = new RegExp(`${key}\\s*:\\s*\\[([^\\]]+)\\]`);
      const match = VISIBLE.match(entryRe);
      expect(match, `MODULE_ROUTE_ALIASES is missing entry for ${key}`).toBeTruthy();
      const body = match![1];
      for (const p of paths) {
        expect(body, `alias for ${key} must include ${p}`).toContain(p);
      }
    },
  );
});

/* ──────────────────────────────────────────────────────────────────────── */
/* 4. sidebar visibility and route access are coherent                      */
/* ──────────────────────────────────────────────────────────────────────── */
describe('Guard 4 — sidebar visibility ↔ route access are coherent', () => {
  it('every aliased path also resolves to a registered route', () => {
    // Extract every URL string inside MODULE_ROUTE_ALIASES.
    const aliasBlock = VISIBLE.match(
      /MODULE_ROUTE_ALIASES[^=]*=\s*\{([\s\S]*?)\n\}\s*;/,
    );
    expect(aliasBlock, 'MODULE_ROUTE_ALIASES block not found').toBeTruthy();
    const paths = Array.from(
      aliasBlock![1].matchAll(/['"](\/[a-z0-9/_\-:]+)['"]/gi),
    ).map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      // Aliases may point to subpaths that exist via a parent Route; accept
      // when either the exact path or a parent prefix is registered.
      const ok =
        isRegistered(p) ||
        REGISTERED_ROUTES.some((r) => p.startsWith(r + '/'));
      expect(ok, `aliased path ${p} has no matching route in App.tsx`).toBe(true);
    }
  });

  it('DashboardSidebar consumes the same useVisibleModules hook', () => {
    const sidebar = read('src/components/dashboard/DashboardSidebar.tsx');
    expect(sidebar).toMatch(/useVisibleModules/);
  });
});

/* ──────────────────────────────────────────────────────────────────────── */
/* 5. no-fake-pages guard — dead modules must stay inactive                 */
/* ──────────────────────────────────────────────────────────────────────── */
describe('Guard 5 — dead modules remain inactive (no placeholder pages)', () => {
  it.each(MUST_REMAIN_INACTIVE)(
    '%s is not in the active catalog snapshot',
    (key) => {
      expect(
        Object.prototype.hasOwnProperty.call(EXPECTED_ACTIVE_MODULES, key),
        `${key} must remain is_active=false (no real page exists). ` +
          `If a real page was added, register the route in App.tsx ` +
          `AND add the module to EXPECTED_ACTIVE_MODULES in this file.`,
      ).toBe(false);
    },
  );

  it('no ghost routes (ComingSoon / Placeholder / TODO) registered in App.tsx', () => {
    // Component identifiers used as Route elements.
    const elements = Array.from(APP.matchAll(/element=\{<([A-Z][A-Za-z0-9_]+)/g)).map(
      (m) => m[1],
    );
    const banned = elements.filter((e) =>
      /^(ComingSoon|Placeholder|Todo|Wip|Stub)$/i.test(e),
    );
    expect(
      banned,
      `App.tsx must not register placeholder components: ${banned.join(', ')}`,
    ).toEqual([]);
  });
});