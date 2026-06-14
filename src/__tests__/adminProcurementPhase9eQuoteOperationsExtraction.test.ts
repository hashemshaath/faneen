/**
 * Phase 9E — Quote operations dashboard section extraction guard.
 *
 * Locks the read-only contract for the new operations section
 * components: presentational only, no Supabase, no queries, no
 * mutations, no CSV build logic migration, no aggregation changes,
 * no touching of forbidden modules/routes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const OPS_DIR = path.resolve(
  __dirname,
  '../components/admin/procurement/operations',
);

const NEW_FILES = [
  'QuoteOperationsFiltersBar.tsx',
  'QuoteOperationsCsvExportButton.tsx',
  'QuoteOperationsStatsSection.tsx',
  'QuoteOperationsChartsSection.tsx',
  'QuoteOperationsAttentionSection.tsx',
  'QuoteOperationsMatchingSection.tsx',
  'QuoteOperationsTableSection.tsx',
  'index.ts',
];

const FORBIDDEN_LIBS = [
  'src/lib/quoteRequests.ts',
  'src/lib/providerCommercialConfig.ts',
];

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}
function readOps(name: string): string {
  return fs.readFileSync(path.join(OPS_DIR, name), 'utf8');
}

describe('Phase 9E — Quote operations section extraction', () => {
  it('all new operations section files exist', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(OPS_DIR, f)), `${f} must exist`).toBe(true);
    }
  });

  it('AdminQuoteOperations.tsx adopts every new section component', () => {
    const src = readRepo('src/pages/admin/AdminQuoteOperations.tsx');
    const adopted = [
      'QuoteOperationsFiltersBar',
      'QuoteOperationsCsvExportButton',
      'QuoteOperationsStatsSection',
      'QuoteOperationsChartsSection',
      'QuoteOperationsAttentionSection',
      'QuoteOperationsMatchingSection',
      'QuoteOperationsTableSection',
    ];
    for (const name of adopted) {
      expect(src.includes(name), `parent must use ${name}`).toBe(true);
    }
    expect(
      /from\s+['"]@\/components\/admin\/procurement\/operations['"]/.test(src),
    ).toBe(true);
  });

  it('section components do not import Supabase or executive services', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/quotes',
      '@/modules/brands',
      '@/modules/leads/services',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = readOps(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('section components contain no query / mutation / network tokens', () => {
    const forbiddenTokens = [
      'useMutation(',
      'useQuery(',
      'useInfiniteQuery(',
      'supabase',
      '.from(',
      'fetch(',
    ];
    for (const f of NEW_FILES) {
      const src = readOps(f);
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('aggregation lib remains untouched and is not imported by sections', () => {
    const aggSrc = readRepo('src/lib/quoteOperationsAggregation.ts');
    expect(aggSrc.includes('@/components/admin/procurement/operations')).toBe(false);
    for (const f of NEW_FILES) {
      const src = readOps(f);
      expect(
        src.includes('@/lib/quoteOperationsAggregation'),
        `${f} must not import aggregation lib`,
      ).toBe(false);
      expect(
        src.includes('buildDailyQuoteOperationsSeries'),
        `${f} must not rebuild daily series`,
      ).toBe(false);
      expect(
        src.includes('DAILY_OPS_CSV_HEADERS'),
        `${f} must not own CSV headers`,
      ).toBe(false);
      expect(
        src.includes('rowsToCsv'),
        `${f} must not build CSV`,
      ).toBe(false);
      expect(
        src.includes('downloadCsv'),
        `${f} must not trigger CSV downloads`,
      ).toBe(false);
    }
  });

  it('parent retains queries, aggregation, and CSV build logic', () => {
    const src = readRepo('src/pages/admin/AdminQuoteOperations.tsx');
    expect(src.includes('useQuery(')).toBe(true);
    expect(src.includes('listAdminOpsQuoteRequests')).toBe(true);
    expect(src.includes('listAdminOpsQuoteRequestLeads')).toBe(true);
    expect(src.includes('buildDailyQuoteOperationsSeries')).toBe(true);
    expect(src.includes('DAILY_OPS_CSV_HEADERS')).toBe(true);
    expect(src.includes('rowsToCsv(')).toBe(true);
    expect(src.includes('downloadCsv(')).toBe(true);
    expect(src.includes('qitaat-quote-operations-')).toBe(true);
    expect(src.includes('qitaat-follow-up-requests-')).toBe(true);
  });

  it('Recharts data shape (chart dataKey strings) is unchanged', () => {
    const src = readOps('QuoteOperationsChartsSection.tsx');
    const keys = [
      'quotes_created',
      'quotes_matched',
      'quotes_completed',
      'leads_created',
      'leads_viewed',
      'leads_interested',
      'leads_not_interested',
      'avg_time_to_match_minutes',
      'avg_time_to_first_view_minutes',
      'avg_time_to_first_interest_minutes',
    ];
    for (const k of keys) {
      expect(src.includes(`dataKey="${k}"`), `chart dataKey ${k} must remain`).toBe(true);
    }
  });

  it('section components contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      const src = readOps(f);
      expect(hex.test(src), `${f} contains a hex color`).toBe(false);
    }
  });

  it('section components contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = readOps(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('App.tsx routes are not modified to import the new operations folder', () => {
    const src = readRepo('src/App.tsx');
    expect(src.includes('@/components/admin/procurement/operations')).toBe(false);
  });

  it('forbidden modules/libs remain untouched and do not depend on new ops folder', () => {
    for (const rel of FORBIDDEN_LIBS) {
      const src = readRepo(rel);
      expect(src.includes('@/components/admin/procurement/operations')).toBe(false);
      expect(src.includes('@/components/admin/procurement/shared')).toBe(false);
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
        expect(src.includes('@/components/admin/procurement/operations')).toBe(false);
      }
    }
  });
});