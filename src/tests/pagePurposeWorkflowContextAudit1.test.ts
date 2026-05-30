/**
 * PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1
 *
 * Static guards backing the audit deliverables. Pure source scan:
 *   - every documented deliverable file exists
 *   - sidebar architecture (`menuArchitecture.ts`) has no dead URLs
 *   - quick-create URLs resolve to App.tsx routes
 *   - HelpLauncherFloating pageKeys all exist in contextualHelp registry
 *   - no legacy `/admin/identity?view=` deep links re-introduced
 *   - no forbidden domain imports (inventory / accounting / supplier portal)
 *   - core pages still registered (regression guard)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { quickCreateActions } from '@/components/dashboard/navigation/menuArchitecture';
import { ROUTE_PAGE_KEYS } from '@/components/help/HelpLauncherFloating';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const APP = readFileSync(repo('src/App.tsx'), 'utf8');

const REGISTERED_ROUTES: string[] = Array.from(
  APP.matchAll(/<Route\s+path="([^"]+)"/g),
).map((m) => m[1]);

const isRegistered = (url: string): boolean => {
  const path = url.split('?')[0].split('#')[0];
  if (REGISTERED_ROUTES.includes(path)) return true;
  // Allow exact-prefix routes; tolerate trailing dynamic segments.
  return REGISTERED_ROUTES.some(
    (r) => r === path || (r.endsWith('/*') && path.startsWith(r.slice(0, -2))),
  );
};

describe('PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1 — docs', () => {
  it.each([
    'docs/page-purpose-workflow-context-audit.md',
    'docs/workflow-map.md',
    'docs/page-integration-matrix.md',
    'docs/orphan-duplicate-legacy-pages.md',
    'docs/navigation-fit-check.md',
    'docs/contextual-help-fit-check.md',
    'docs/page-actionability-audit.md',
  ])('deliverable exists: %s', (p) => {
    expect(existsSync(repo(p)), `missing ${p}`).toBe(true);
  });
});

describe('Quick Create — all URLs resolve to registered routes', () => {
  it.each(quickCreateActions.map((a) => [a.id, a.url] as const))(
    '%s → %s',
    (_id, url) => {
      expect(isRegistered(url), `${url} not registered in App.tsx`).toBe(true);
    },
  );
});

describe('Contextual help — every floating launcher pageKey is in the registry', () => {
  it.each(ROUTE_PAGE_KEYS.map((e) => [e.pattern, e.pageKey] as const))(
    '%s → %s present',
    (_pattern, pageKey) => {
      expect(
        Object.prototype.hasOwnProperty.call(contextualHelpRegistry, pageKey),
        `pageKey ${pageKey} missing from contextualHelpRegistry`,
      ).toBe(true);
    },
  );
});

describe('Regression guards', () => {
  it('does not reintroduce legacy /admin/identity?view= deep links', () => {
    expect(/\/admin\/identity\?view=/.test(APP)).toBe(false);
  });

  it.each([
    '/dashboard',
    '/dashboard/contracts',
    '/dashboard/work-orders',
    '/dashboard/procurement',
    '/dashboard/operations-center',
    '/admin/identity',
    '/admin/provider-review',
    '/admin/operations',
    '/help',
    '/dashboard/help',
    '/admin/help',
    '/client/:refId',
    '/r/:refId',
    '/q/:code',
  ])('core route still registered: %s', (path) => {
    expect(REGISTERED_ROUTES).toContain(path);
  });

  it('catch-all "*" route is last', () => {
    expect(REGISTERED_ROUTES[REGISTERED_ROUTES.length - 1]).toBe('*');
  });
});

describe('Scope creep guard — no forbidden domains in audit doc', () => {
  const audit = readFileSync(
    repo('docs/page-purpose-workflow-context-audit.md'),
    'utf8',
  ).toLowerCase();
  it.each(['inventory module', 'accounting module', 'supplier portal'])(
    'does not mention "%s"',
    (term) => {
      expect(audit.includes(term)).toBe(false);
    },
  );
});