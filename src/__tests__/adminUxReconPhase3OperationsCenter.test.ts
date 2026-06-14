import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN UX RECONSOLIDATION PHASE 3 — Operations Center consolidation guards.
 *
 * Read-only structural assertions on the Operations Center shell and the
 * routing surface. We do NOT mount React here; we parse sources because
 * the contract is structural (no query/mutation leakage into the shell,
 * legacy deep links preserved, no destructive imports).
 */

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const APP = read('src/App.tsx');
const HUB = read('src/pages/admin/AdminOperationsHub.tsx');
const OVERVIEW = read('src/components/admin/centers/operations/OperationsOverviewLanding.tsx');
const LOGS = read('src/components/admin/centers/operations/OperationsLogsLanding.tsx');

const SHELL_FILES = [
  'src/pages/admin/AdminOperationsHub.tsx',
  'src/components/admin/centers/operations/OperationsOverviewLanding.tsx',
  'src/components/admin/centers/operations/OperationsLogsLanding.tsx',
] as const;

const REQUIRED_TAB_KEYS = [
  'overview',
  'sla',
  'notifications',
  'cron',
  'logs',
  'email',
  'queues',
] as const;

const LEGACY_ROUTES = [
  '/admin/operations',
  '/admin/operations-center',
  '/admin/cron-runs',
  '/admin/activity-log',
  '/admin/audit-log',
  '/admin/email-center',
  '/admin/email-deliverability',
  '/admin/provider-growth/queue',
  '/admin/contact-audit-log',
  '/admin/contact-notification-log',
  '/admin/contact-sla-dashboard',
] as const;

describe('PHASE 3 — Operations Center shell shape', () => {
  it('/admin/operations uses the TabbedShell-based hub', () => {
    expect(APP).toContain('path="/admin/operations"');
    expect(APP).toContain('<AdminOperationsHub />');
    expect(HUB).toContain('TabbedShell');
  });

  it('exposes all required canonical tabs', () => {
    for (const key of REQUIRED_TAB_KEYS) {
      expect(HUB, `missing tab key "${key}"`).toMatch(new RegExp(`key:\\s*'${key}'`));
    }
  });
});

describe('PHASE 3 — legacy routes preserved (no deletions)', () => {
  for (const route of LEGACY_ROUTES) {
    it(`route ${route} is still registered`, () => {
      expect(APP, `missing route ${route}`).toContain(`path="${route}"`);
    });
  }
});

describe('PHASE 3 — shell purity (no query/mutation/service leakage)', () => {
  const FORBIDDEN_IMPORTS = [
    '@/integrations/supabase/client',
    '@tanstack/react-query',
    '@/modules/businessService',
    '@/services/',
    'previewSlaSweepForAdmin',
  ];

  for (const file of SHELL_FILES) {
    const src = read(file);
    for (const needle of FORBIDDEN_IMPORTS) {
      it(`${file} does not import ${needle}`, () => {
        expect(src, `${file} leaks ${needle}`).not.toContain(needle);
      });
    }
  }

  it('shell files do not declare mutations or queries', () => {
    for (const file of SHELL_FILES) {
      const src = read(file);
      expect(src).not.toMatch(/useMutation\s*\(/);
      expect(src).not.toMatch(/useQuery\s*\(/);
    }
  });
});

describe('PHASE 3 — no `any` / suppressions / hex colors in shells', () => {
  const BANNED_TOKENS = [
    ': any',
    'as any',
    '@ts-ignore',
    '@ts-expect-error',
    'eslint-disable',
  ];
  for (const file of SHELL_FILES) {
    const src = read(file);
    for (const tok of BANNED_TOKENS) {
      it(`${file} does not contain "${tok}"`, () => {
        expect(src).not.toContain(tok);
      });
    }
    it(`${file} does not contain hardcoded hex colors`, () => {
      // strip JS/TS comments before scanning for #RRGGBB/#RGB literals
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1');
      expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  }
});

describe('PHASE 3 — overview & logs landings are link-only', () => {
  it('overview landing only routes via <Link>', () => {
    expect(OVERVIEW).toContain('from \'react-router-dom\'');
    expect(OVERVIEW).not.toMatch(/onClick\s*=\s*\{[^}]*mutate/);
  });
  it('logs landing only routes via <Link>', () => {
    expect(LOGS).toContain('from \'react-router-dom\'');
    expect(LOGS).toMatch(/\/admin\/activity-log/);
    expect(LOGS).toMatch(/\/admin\/audit-log/);
  });
});