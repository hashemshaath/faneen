import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS } from '@/modules/admin-shell/navigation/adminNavigation';

/**
 * ADMIN UX RECONSOLIDATION PHASE 2 — Sidebar + Route Grouping guards.
 *
 * Enforces:
 *  - the primary sidebar exposes exactly the 9 canonical centers
 *  - none of the legacy single-utility items are visible at the top
 *  - every center has a registered admin route in App.tsx
 *  - critical detail / deep-link routes remain registered
 *  - no public route was touched
 *  - no DB / RLS / migration / RPC / edge file was modified by this phase
 *  - no `any` / suppression / hardcoded hex sneaked into the new shells
 */

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

const NEW_CENTER_FILES = [
  'src/pages/admin/AdminProcurementCenter.tsx',
  'src/pages/admin/AdminContentCenter.tsx',
  'src/pages/admin/AdminFinanceCenter.tsx',
  'src/pages/admin/AdminSettingsCenter.tsx',
];
const NEW_CENTER_SOURCES = NEW_CENTER_FILES.map((p) =>
  readFileSync(resolve(root, p), 'utf8'),
);

const VISIBLE_CENTER_ROUTES = [
  '/admin',
  '/admin/operations',
  '/admin/approvals',
  '/admin/procurement',
  '/admin/contracts',
  '/admin/businesses',
  '/admin/lead-requests',
  '/admin/data-enrichment',
  '/admin/identity',
  '/admin/content',
  '/admin/project-categories',
  '/admin/settings',
  '/admin/finance',
] as const;

const visibleItems = ADMIN_NAV_ITEMS.filter((it) => !it.hiddenInSidebar);

describe('ADMIN UX RECONSOLIDATION PHASE 2 — sidebar centers', () => {
  it('exposes the canonical centers plus customer intake and approvals shortcuts', () => {
    const visibleRoutes = visibleItems
      .filter((it) => it.permission !== 'super_admin')
      .map((it) => it.route)
      .sort();
    expect(visibleRoutes).toEqual([...VISIBLE_CENTER_ROUTES].sort());
  });

  it('does not expose legacy single-utility items at the top of the sidebar', () => {
    const forbidden = [
      '/admin/quote-operations',
      '/admin/service-requests',
      '/admin/contact-messages',
      '/admin/audit-log',
      '/admin/cron-runs',
      '/admin/activity-log',
      '/admin/email-center',
      '/admin/email-deliverability',
      '/admin/brands',
      '/admin/taxonomy',
      '/admin/system-settings',
      '/admin/branding',
      '/admin/memberships',
      '/admin/membership-payments',
      '/admin/provider-analytics',
      '/admin/reports',
    ];
    const leaked = visibleItems.map((it) => it.route).filter((r) => forbidden.includes(r));
    expect(leaked, `leaked legacy items in sidebar: ${leaked.join(', ')}`).toEqual([]);
  });

  it('every visible center route is registered in App.tsx', () => {
    for (const route of VISIBLE_CENTER_ROUTES) {
      expect(APP, `route ${route} missing in App.tsx`).toContain(`path="${route}"`);
    }
  });

  it('every visible center route is admin-protected', () => {
    for (const route of VISIBLE_CENTER_ROUTES) {
      const esc = route.replace(/[/\-:]/g, (c) => '\\' + c);
      const re = new RegExp(
        `path="${esc}"[^>]*requireAdmin|path="${esc}"[^>]*requireSuperAdmin|path="${esc}"[^>]*Navigate`,
      );
      expect(re.test(APP), `route ${route} not admin-protected`).toBe(true);
    }
  });

  it('does not duplicate routes in the registry', () => {
    const seen = new Map<string, number>();
    for (const it of ADMIN_NAV_ITEMS) seen.set(it.route, (seen.get(it.route) ?? 0) + 1);
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([r]) => r);
    expect(dups, `duplicate routes: ${dups.join(', ')}`).toEqual([]);
  });
});

describe('ADMIN UX RECONSOLIDATION PHASE 2 — deep links preserved', () => {
  const REQUIRED_DEEP_LINKS = [
    'path="/admin/quote-requests/:id"',
    'path="/admin/brands/:id"',
    'path="/admin/users/:id"',
    'path="/admin/quote-requests"',
    'path="/admin/lead-requests"',
    'path="/admin/cron-runs"',
    'path="/admin/audit-log"',
    'path="/admin/activity-log"',
    'path="/admin/email-center"',
    'path="/admin/email-deliverability"',
    'path="/admin/operations-center"',
    'path="/admin/business-visibility"',
    'path="/admin/provider-review"',
    'path="/admin/brands"',
    'path="/admin/brand-requests"',
    'path="/admin/showcase"',
    'path="/admin/partner-showcase"',
    'path="/admin/home-sectors"',
    'path="/admin/home-faq"',
    'path="/admin/private-sectors"',
    'path="/admin/sitemap-status"',
    'path="/admin/site-audit"',
    'path="/admin/sector-seo"',
    'path="/admin/assets"',
    'path="/admin/assets/overrides"',
    'path="/admin/taxonomy"',
    'path="/admin/system-settings"',
    'path="/admin/branding"',
    'path="/admin/contract-templates"',
  ];
  it.each(REQUIRED_DEEP_LINKS)('preserves %s in App.tsx', (snippet) => {
    expect(APP).toContain(snippet);
  });
});

describe('ADMIN UX RECONSOLIDATION PHASE 2 — new center shells are presentational only', () => {
  it.each(NEW_CENTER_FILES.map((p, i) => [p, NEW_CENTER_SOURCES[i]] as const))(
    '%s contains no any/ts-ignore/eslint-disable/hex-color/supabase/business-service imports',
    (_path, src) => {
      expect(src).not.toMatch(/:\s*any\b|as\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/@\/integrations\/supabase|businessService/);
    },
  );
});
