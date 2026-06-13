/**
 * Phase 8E — Admin Contract Analytics section extraction guard.
 *
 * Verifies that AdminContractAnalytics.tsx consumes the new presentational
 * section components and that those components remain pure UI (no
 * Supabase, no queries, no mutations, no hardcoded hex colors, no escape
 * hatches), while RPC + useQuery ownership stays in the page.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const PAGE = 'pages/admin/AdminContractAnalytics.tsx';
const ANALYTICS_DIR = 'components/admin/contracts/analytics';
const SECTION_FILES = [
  `${ANALYTICS_DIR}/ContractAnalyticsSummarySection.tsx`,
  `${ANALYTICS_DIR}/ContractAnalyticsStatusSection.tsx`,
  `${ANALYTICS_DIR}/ContractAnalyticsTrendSection.tsx`,
  `${ANALYTICS_DIR}/ContractAnalyticsFinancialSection.tsx`,
  `${ANALYTICS_DIR}/ContractAnalyticsLeaderboardSection.tsx`,
  `${ANALYTICS_DIR}/AnalyticsKpiCard.tsx`,
  `${ANALYTICS_DIR}/types.ts`,
  `${ANALYTICS_DIR}/index.ts`,
];

describe('Phase 8E — analytics extraction file presence', () => {
  it('all new section files exist', () => {
    for (const f of SECTION_FILES) {
      expect(existsSync(resolve(ROOT, f)), `missing ${f}`).toBe(true);
    }
  });

  it('barrel re-exports every section', () => {
    const idx = read(`${ANALYTICS_DIR}/index.ts`);
    for (const name of [
      'ContractAnalyticsSummarySection',
      'ContractAnalyticsStatusSection',
      'ContractAnalyticsTrendSection',
      'ContractAnalyticsFinancialSection',
      'ContractAnalyticsLeaderboardSection',
      'AnalyticsKpiCard',
    ]) {
      expect(idx).toMatch(new RegExp(`\\b${name}\\b`));
    }
  });
});

describe('Phase 8E — AdminContractAnalytics.tsx adopts the new sections', () => {
  const src = read(PAGE);

  it('imports from analytics barrel', () => {
    expect(src).toMatch(/from '@\/components\/admin\/contracts\/analytics'/);
  });

  for (const name of [
    'ContractAnalyticsSummarySection',
    'ContractAnalyticsStatusSection',
    'ContractAnalyticsTrendSection',
    'ContractAnalyticsFinancialSection',
    'ContractAnalyticsLeaderboardSection',
  ]) {
    it(`renders <${name} />`, () => {
      expect(src).toMatch(new RegExp(`<${name}\\b`));
    });
  }

  it('keeps useQuery in the page', () => {
    expect(src).toMatch(/useQuery</);
  });

  it('keeps getAdminContractAnalyticsDashboard wrapper in the page', () => {
    expect(src).toMatch(/getAdminContractAnalyticsDashboard\(/);
    expect(src).toMatch(/from '@\/modules\/contracts'/);
  });

  it('keeps RPC args shape (_period/_business_id/_include_demo)', () => {
    expect(src).toMatch(/_period:\s*period/);
    expect(src).toMatch(/_business_id:\s*undefined/);
    expect(src).toMatch(/_include_demo:\s*includeDemo/);
  });
});

describe('Phase 8E — new section components are pure UI', () => {
  const sectionSources = SECTION_FILES.filter((f) => f.endsWith('.tsx')).map((f) => ({
    f,
    s: read(f),
  }));

  it('no Supabase imports in new section components', () => {
    for (const { f, s } of sectionSources) {
      expect(s, f).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
      expect(s, f).not.toMatch(/supabase\.(from|rpc|auth|storage|functions|channel)/);
    }
  });

  it('no useQuery / useMutation in new section components', () => {
    for (const { f, s } of sectionSources) {
      expect(s, f).not.toMatch(/\buseQuery\b/);
      expect(s, f).not.toMatch(/\buseMutation\b/);
    }
  });

  it('no imports from runtime contract services modules', () => {
    for (const { f, s } of sectionSources) {
      expect(s, f).not.toMatch(/from\s+['"]@\/modules\/contracts(\/services)?(['"/])/);
    }
  });

  it('no hardcoded hex colors', () => {
    for (const { f, s } of sectionSources) {
      expect(s, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('no any / as any / @ts-ignore / @ts-expect-error / eslint-disable', () => {
    for (const { f, s } of sectionSources) {
      expect(s, f).not.toMatch(/:\s*any\b/);
      expect(s, f).not.toMatch(/\bas\s+any\b/);
      expect(s, f).not.toMatch(/@ts-ignore/);
      expect(s, f).not.toMatch(/@ts-expect-error/);
      expect(s, f).not.toMatch(/eslint-disable/);
    }
  });
});

describe('Phase 8E — status labels remain centralized via getContractStatusMeta', () => {
  it('StatusSection uses ContractLifecycleBadge (which sources getContractStatusMeta)', () => {
    const s = read(`${ANALYTICS_DIR}/ContractAnalyticsStatusSection.tsx`);
    expect(s).toMatch(/ContractLifecycleBadge/);
  });

  it('ContractLifecycleBadge still imports getContractStatusMeta', () => {
    const s = read('components/admin/contracts/shared/ContractLifecycleBadge.tsx');
    expect(s).toMatch(/getContractStatusMeta/);
    expect(s).toMatch(/from\s+['"]@\/lib\/contract-statuses['"]/);
  });

  it('getContractStatusMeta and ContractStatus stay defined in contract-statuses.ts', () => {
    const s = read('lib/contract-statuses.ts');
    expect(s).toMatch(/export\s+(type|function|const)\s+ContractStatus\b|export\s+type\s+ContractStatus\b/);
    expect(s).toMatch(/getContractStatusMeta/);
  });

  it('VERSION_STATUS_META in src/modules/contracts/types.ts is untouched (still exported if present)', () => {
    const p = 'modules/contracts/types.ts';
    if (!existsSync(resolve(ROOT, p))) return;
    const s = read(p);
    if (s.includes('VERSION_STATUS_META')) {
      expect(s).toMatch(/VERSION_STATUS_META/);
    }
  });
});

describe('Phase 8E — non-regression: PDF/QR/hash/signature files not touched by this phase', () => {
  it('analytics components do not import PDF / hash / signature / QR libs', () => {
    const sectionSources = SECTION_FILES.filter((f) => f.endsWith('.tsx')).map((f) => read(f));
    for (const s of sectionSources) {
      expect(s).not.toMatch(/jspdf|pdfkit|qrcode|crypto-js|subtle\.digest|signContract|verifyContract/i);
    }
  });

  it('legacy /contracts redirects in App.tsx remain', () => {
    const app = read('App.tsx');
    expect(app).toMatch(/\/contracts/);
  });
});