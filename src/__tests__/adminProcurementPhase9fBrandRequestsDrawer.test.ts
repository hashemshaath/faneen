/**
 * Phase 9F — Brand Requests row actions + review drawer guard.
 *
 * Locks the read-only/presentational contract for the new brand-request
 * components and the page adoption in `AdminBrandRequests.tsx`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const BR_DIR = path.resolve(
  __dirname,
  '../components/admin/procurement/brand-requests',
);

const NEW_FILES = [
  'BrandRequestRowActions.tsx',
  'BrandRequestReviewDrawer.tsx',
  'buildBrandRequestReviewDrawerProps.ts',
  'index.ts',
];

const FORBIDDEN_MODULE_FILES = [
  'src/lib/quoteRequests.ts',
  'src/lib/quoteOperationsAggregation.ts',
  'src/lib/providerCommercialConfig.ts',
];

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}
function readNew(name: string): string {
  return fs.readFileSync(path.join(BR_DIR, name), 'utf8');
}

describe('Phase 9F — Brand Requests row actions + review drawer', () => {
  it('new files exist on disk', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(BR_DIR, f))).toBe(true);
    }
  });

  it('brand-requests barrel exposes the three primitives', () => {
    const src = readNew('index.ts');
    expect(src).toMatch(/\bBrandRequestRowActions\b/);
    expect(src).toMatch(/\bBrandRequestReviewDrawer\b/);
    expect(src).toMatch(/\bbuildBrandRequestReviewDrawerProps\b/);
  });

  it('AdminBrandRequests.tsx adopts the new primitives + shared status badge', () => {
    const src = readRepo('src/pages/admin/AdminBrandRequests.tsx');
    expect(src.includes('BrandRequestStatusBadge')).toBe(true);
    expect(src.includes('BrandRequestRowActions')).toBe(true);
    expect(src.includes('BrandRequestReviewDrawer')).toBe(true);
    expect(src.includes('buildBrandRequestReviewDrawerProps')).toBe(true);
    expect(
      /from\s+['"]@\/components\/admin\/procurement\/brand-requests['"]/.test(src),
    ).toBe(true);
    expect(
      /from\s+['"]@\/components\/admin\/procurement\/shared['"]/.test(src),
    ).toBe(true);
  });

  it('new components / adapter contain no Supabase / query / mutation tokens', () => {
    const forbiddenTokens = [
      'useMutation(',
      'useQuery(',
      'useInfiniteQuery(',
      'supabase',
      '.from(',
      'adminApproveBrandRequestRpc',
      'adminRejectBrandRequestRpc',
      'adminSetBrandRequestStatus',
    ];
    for (const f of NEW_FILES) {
      const src = readNew(f);
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('new files do not import Supabase or executive services', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/quotes',
      '@/modules/leads/services/reveal',
      '@/modules/leads/services/match',
      '@/services/',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = readNew(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('adapter only type-imports the row type from @/modules/brands', () => {
    const src = readNew('buildBrandRequestReviewDrawerProps.ts');
    const rawImports = Array.from(
      src.matchAll(/^\s*import\s+([^;]+?)from\s+['"]([^'"]+)['"];?/gm),
    );
    for (const m of rawImports) {
      const clause = m[1];
      const from = m[2];
      if (from.startsWith('@/modules/brands')) {
        expect(
          /\btype\b/.test(clause),
          `adapter must import types-only from ${from}`,
        ).toBe(true);
      }
    }
    expect(/\basync\b/.test(src)).toBe(false);
    expect(/\bawait\b/.test(src)).toBe(false);
  });

  it('new files contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      const src = readNew(f);
      expect(hex.test(src), `${f} contains a hex color`).toBe(false);
    }
  });

  it('new files contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = readNew(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('App.tsx is not modified to import the new brand-requests folder', () => {
    const src = readRepo('src/App.tsx');
    expect(src.includes('@/components/admin/procurement/brand-requests')).toBe(false);
  });

  it('forbidden quote/brand/lead modules and libs remain untouched', () => {
    for (const rel of FORBIDDEN_MODULE_FILES) {
      const src = readRepo(rel);
      expect(src.includes('@/components/admin/procurement/brand-requests')).toBe(false);
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
        expect(src.includes('@/components/admin/procurement/brand-requests')).toBe(false);
        expect(src.includes('@/components/admin/procurement/shared')).toBe(false);
      }
    }
  });
});