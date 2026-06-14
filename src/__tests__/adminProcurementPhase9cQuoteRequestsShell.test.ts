/**
 * Phase 9C — RFQ List Shell / Filters / Stats adoption guard.
 *
 * Asserts that AdminQuoteRequests.tsx adopts the new procurement
 * shared primitives (Shell, FiltersBar, StatsStrip, QuoteStatusBadge)
 * without leaking Supabase, mutations, or executive service writes
 * into the new presentational components, and without touching
 * forbidden modules/routes/libs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SHARED_DIR = path.resolve(
  __dirname,
  '../components/admin/procurement/shared',
);

const NEW_COMPONENT_FILES = [
  'ProcurementAdminPageShell.tsx',
  'ProcurementFiltersBar.tsx',
];

const FORBIDDEN_MODULE_FILES = [
  'src/lib/quoteRequests.ts',
  'src/lib/quoteOperationsAggregation.ts',
  'src/lib/providerCommercialConfig.ts',
];

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}
function readShared(file: string): string {
  return fs.readFileSync(path.join(SHARED_DIR, file), 'utf8');
}

describe('Phase 9C — RFQ list adopts procurement shared primitives', () => {
  it('new shared components exist on disk', () => {
    for (const f of NEW_COMPONENT_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
  });

  it('barrel re-exports the new components', () => {
    const src = readShared('index.ts');
    expect(src).toMatch(/\bProcurementAdminPageShell\b/);
    expect(src).toMatch(/\bProcurementFiltersBar\b/);
  });

  it('AdminQuoteRequests.tsx adopts the new primitives', () => {
    const src = readRepo('src/pages/admin/AdminQuoteRequests.tsx');
    expect(src.includes('ProcurementAdminPageShell')).toBe(true);
    expect(src.includes('ProcurementFiltersBar')).toBe(true);
    expect(src.includes('ProcurementStatsStrip')).toBe(true);
    expect(src.includes('QuoteStatusBadge')).toBe(true);
    expect(
      /from\s+['"]@\/components\/admin\/procurement\/shared['"]/.test(src),
    ).toBe(true);
  });

  it('new shared components do not import Supabase or executive services', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/quotes',
      '@/modules/brands',
      '@/modules/leads/services',
      '@/services',
      'businessService',
      'adminApprove',
      'adminReject',
      'revealLead',
      'matchLead',
    ];
    for (const f of NEW_COMPONENT_FILES) {
      const src = readShared(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('new shared components contain no queries or mutations', () => {
    const forbiddenTokens = [
      'useQuery(',
      'useMutation(',
      'useInfiniteQuery(',
      '.from(',
      'supabase',
    ];
    for (const f of NEW_COMPONENT_FILES) {
      const src = readShared(f);
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('new shared components contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_COMPONENT_FILES) {
      expect(hex.test(readShared(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('new shared components contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_COMPONENT_FILES) {
      const src = readShared(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('App.tsx is not modified to reference the new procurement shared barrel', () => {
    const src = readRepo('src/App.tsx');
    expect(src.includes('@/components/admin/procurement/shared')).toBe(false);
  });

  it('forbidden quote/brand/lead modules and libs remain untouched', () => {
    for (const rel of FORBIDDEN_MODULE_FILES) {
      const src = readRepo(rel);
      expect(
        src.includes('@/components/admin/procurement/shared'),
        `${rel} must not reference the procurement shared primitives`,
      ).toBe(false);
    }
    const scanDirs = [
      'src/modules/quotes',
      'src/modules/brands',
      'src/modules/leads/services',
    ];
    for (const dir of scanDirs) {
      const abs = path.join(REPO_ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      const walk = (d: string): string[] =>
        fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
          const p = path.join(d, e.name);
          return e.isDirectory() ? walk(p) : [p];
        });
      for (const file of walk(abs)) {
        if (!/\.(ts|tsx)$/.test(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        expect(
          src.includes('@/components/admin/procurement/shared'),
          `${file} must not import the procurement shared primitives`,
        ).toBe(false);
      }
    }
  });
});