/**
 * Phase 9B — Admin Procurement/RFQ shared primitives guard.
 *
 * Locks the presentational contract for the new admin procurement
 * shared primitives (RFQ status, lead status, brand-request status,
 * KPI strip) and ensures none of them reach into Supabase, RFQ
 * mutations, lead reveal/match, brand approve/reject, or redefine
 * canonical status labels.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/procurement/shared');
const REPO_ROOT = path.resolve(__dirname, '../..');

const COMPONENT_FILES = [
  'QuoteStatusBadge.tsx',
  'LeadStatusBadge.tsx',
  'BrandRequestStatusBadge.tsx',
  'ProcurementStatsStrip.tsx',
  'index.ts',
];

const ADMIN_PAGES = [
  'src/pages/admin/AdminQuoteRequests.tsx',
  'src/pages/admin/AdminQuoteRequestDetails.tsx',
  'src/pages/admin/AdminQuoteOperations.tsx',
  'src/pages/admin/AdminBrandRequests.tsx',
  'src/pages/admin/AdminBrandDetail.tsx',
  'src/pages/admin/AdminBrands.tsx',
];

const FORBIDDEN_MODULE_FILES = [
  'src/lib/quoteRequests.ts',
  'src/lib/quoteOperationsAggregation.ts',
  'src/lib/providerCommercialConfig.ts',
];

function read(file: string): string {
  return fs.readFileSync(path.join(SHARED_DIR, file), 'utf8');
}

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('Phase 9B — admin procurement shared primitives', () => {
  it('all primitives and the barrel exist on disk', () => {
    for (const f of COMPONENT_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
  });

  it('barrel exports every primitive by name', () => {
    const src = read('index.ts');
    for (const sym of [
      'QuoteStatusBadge',
      'LeadStatusBadge',
      'BrandRequestStatusBadge',
      'ProcurementStatsStrip',
    ]) {
      expect(src).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('shared primitives never import Supabase or executive services', () => {
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
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('shared primitives contain no queries or mutations', () => {
    const forbiddenTokens = [
      'useQuery(',
      'useMutation(',
      'useInfiniteQuery(',
      '.from(',
      'supabase',
    ];
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('shared primitives contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of COMPONENT_FILES) {
      expect(hex.test(read(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('shared primitives contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('QuoteStatusBadge relies on QUOTE_STATUS_LABEL_AR and QUOTE_STATUS_TONE', () => {
    const src = read('QuoteStatusBadge.tsx');
    expect(src.includes('QUOTE_STATUS_LABEL_AR')).toBe(true);
    expect(src.includes('QUOTE_STATUS_TONE')).toBe(true);
    expect(/from\s+['"]@\/modules\/leads\/constants\/quoteStatuses['"]/.test(src)).toBe(true);
  });

  it('LeadStatusBadge relies on LEAD_STATUS_LABEL_AR and LEAD_STATUS_TONE', () => {
    const src = read('LeadStatusBadge.tsx');
    expect(src.includes('LEAD_STATUS_LABEL_AR')).toBe(true);
    expect(src.includes('LEAD_STATUS_TONE')).toBe(true);
    expect(/from\s+['"]@\/modules\/leads\/constants\/quoteStatuses['"]/.test(src)).toBe(true);
  });

  it('does not modify any admin procurement/RFQ page in Phase 9B', () => {
    // Phase 9B is creation-only; pages remain untouched. We assert each
    // listed page still exists and does NOT import from the new shared
    // barrel yet (adoption happens in later phases).
    for (const rel of ADMIN_PAGES) {
      const src = readRepo(rel);
      expect(
        src.includes('@/components/admin/procurement/shared'),
        `${rel} must not adopt the new procurement shared barrel in Phase 9B`,
      ).toBe(false);
    }
  });

  it('App.tsx routes are not modified in Phase 9B (no new procurement-shared import)', () => {
    const src = readRepo('src/App.tsx');
    expect(src.includes('@/components/admin/procurement/shared')).toBe(false);
  });

  it('forbidden module/lib files are not touched (no procurement-shared back-references)', () => {
    for (const rel of FORBIDDEN_MODULE_FILES) {
      const src = readRepo(rel);
      expect(
        src.includes('@/components/admin/procurement/shared'),
        `${rel} must not reference the new procurement shared primitives`,
      ).toBe(false);
    }
    // src/modules/quotes/**, src/modules/brands/**, src/modules/leads/services/**
    // must also remain free of any reference to the new barrel.
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
          `${file} must not import the new procurement shared primitives`,
        ).toBe(false);
      }
    }
  });
});