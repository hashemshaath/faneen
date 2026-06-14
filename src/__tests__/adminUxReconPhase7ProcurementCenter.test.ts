import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN UX RECONSOLIDATION PHASE 7 — Procurement Center guards.
 *
 * Read-only structural assertions on the Procurement Center shell,
 * its presentational landings, and the routing surface. We do NOT
 * mount React here; the contract is structural (no query/mutation
 * leakage into the shell, legacy deep links preserved, no RFQ /
 * matching / lead / reveal / credit behavior changes).
 */

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const APP = read('src/App.tsx');
const CENTER = read('src/pages/admin/AdminProcurementCenter.tsx');
const OVERVIEW = read('src/components/admin/centers/procurement/ProcurementOverviewLanding.tsx');
const MATCHING = read('src/components/admin/centers/procurement/MatchingLanding.tsx');
const FOLLOWUP = read('src/components/admin/centers/procurement/FollowUpLanding.tsx');
const REPORTS = read('src/components/admin/centers/procurement/ReportsLanding.tsx');

const SHELL_FILES: ReadonlyArray<{ name: string; src: string }> = [
  { name: 'AdminProcurementCenter.tsx', src: CENTER },
  { name: 'ProcurementOverviewLanding.tsx', src: OVERVIEW },
  { name: 'MatchingLanding.tsx', src: MATCHING },
  { name: 'FollowUpLanding.tsx', src: FOLLOWUP },
  { name: 'ReportsLanding.tsx', src: REPORTS },
];

const REQUIRED_TAB_KEYS = [
  'overview',
  'requests',
  'matching',
  'leads',
  'operations',
  'follow-up',
  'reports',
] as const;

const LEGACY_ROUTES = [
  '/admin/procurement',
  '/admin/quote-requests',
  '/admin/quote-requests/:id',
  '/admin/quote-operations',
] as const;

describe('PHASE 7 — Procurement Center shell shape', () => {
  it('/admin/procurement uses AdminProcurementCenter (TabbedShell-based)', () => {
    expect(APP).toMatch(/path="\/admin\/procurement"[^\n]*<AdminProcurementCenter\s*\/>/);
    expect(CENTER).toContain('TabbedShell');
  });

  it('exposes all required canonical tabs', () => {
    for (const key of REQUIRED_TAB_KEYS) {
      expect(CENTER, `missing tab key "${key}"`).toMatch(new RegExp(`key:\\s*'${key}'`));
    }
  });

  it('Requests tab embeds AdminQuoteRequests (not Operations)', () => {
    expect(CENTER).toMatch(/key:\s*'requests'[\s\S]*?import\('\.\/AdminQuoteRequests'\)/);
  });

  it('Operations tab embeds AdminQuoteOperations', () => {
    expect(CENTER).toMatch(/key:\s*'operations'[\s\S]*?import\('\.\/AdminQuoteOperations'\)/);
  });
});

describe('PHASE 7 — legacy routes preserved (no deletions)', () => {
  for (const route of LEGACY_ROUTES) {
    it(`route ${route} is still registered`, () => {
      expect(APP, `missing route ${route}`).toContain(`path="${route}"`);
    });
  }
});

describe('PHASE 7 — shell purity (no query/mutation/service leakage)', () => {
  const FORBIDDEN_IMPORTS = [
    '@/integrations/supabase/client',
    '@tanstack/react-query',
    '@/services/',
    '@/modules/leads/services',
    '@/modules/credits',
    'consume_provider_lead_credit',
    'provider_lead_credit_transactions',
  ];

  for (const { name, src } of SHELL_FILES) {
    it(`${name} contains no forbidden service/query imports`, () => {
      for (const needle of FORBIDDEN_IMPORTS) {
        expect(src, `${name} touches ${needle}`).not.toContain(needle);
      }
    });

    it(`${name} does not run queries / mutations`, () => {
      expect(src).not.toMatch(/\buseQuery\b/);
      expect(src).not.toMatch(/\buseMutation\b/);
      expect(src).not.toMatch(/\buseQueryClient\b/);
      expect(src).not.toMatch(/\.rpc\(/);
    });

    it(`${name} does not own CSV building/download`, () => {
      expect(src).not.toMatch(/\bbuildCsv\b/);
      expect(src).not.toMatch(/\bdownloadCsv\b/);
      expect(src).not.toMatch(/new Blob\(/);
    });

    it(`${name} contains no hardcoded hex colors`, () => {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it(`${name} contains no any / suppressions`, () => {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
    });
  }
});