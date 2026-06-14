/**
 * Phase 9D — RFQ list details drawer + timeline (read-only) guard.
 *
 * Locks the read-only contract for the new RFQ drawer + timeline:
 * presentational only, no Supabase, no mutations, no reveal/match/
 * status updates/edit, no touching of forbidden modules/routes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const QR_DIR = path.resolve(
  __dirname,
  '../components/admin/procurement/quote-requests',
);
const SHARED_DIR = path.resolve(
  __dirname,
  '../components/admin/procurement/shared',
);

const NEW_FILES: { dir: string; name: string }[] = [
  { dir: QR_DIR, name: 'QuoteRequestDetailsDrawer.tsx' },
  { dir: QR_DIR, name: 'buildQuoteRequestDrawerProps.ts' },
  { dir: QR_DIR, name: 'index.ts' },
  { dir: SHARED_DIR, name: 'ProcurementTimelineCard.tsx' },
];

const FORBIDDEN_MODULE_FILES = [
  'src/lib/quoteRequests.ts',
  'src/lib/quoteOperationsAggregation.ts',
  'src/lib/providerCommercialConfig.ts',
];

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}
function readAbs(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

describe('Phase 9D — RFQ details drawer + timeline (read-only)', () => {
  it('new files exist on disk', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(f.dir, f.name))).toBe(true);
    }
  });

  it('shared barrel exposes ProcurementTimelineCard', () => {
    const src = readAbs(path.join(SHARED_DIR, 'index.ts'));
    expect(src).toMatch(/\bProcurementTimelineCard\b/);
  });

  it('quote-requests barrel exposes drawer + adapter', () => {
    const src = readAbs(path.join(QR_DIR, 'index.ts'));
    expect(src).toMatch(/\bQuoteRequestDetailsDrawer\b/);
    expect(src).toMatch(/\bbuildQuoteRequestDrawerProps\b/);
  });

  it('AdminQuoteRequests.tsx adopts the drawer', () => {
    const src = readRepo('src/pages/admin/AdminQuoteRequests.tsx');
    expect(src.includes('QuoteRequestDetailsDrawer')).toBe(true);
    expect(
      /from\s+['"]@\/components\/admin\/procurement\/quote-requests['"]/.test(src),
    ).toBe(true);
  });

  it('drawer + timeline + adapter contain no editing / reveal / match / mutation tokens', () => {
    const forbiddenTokens = [
      'useMutation(',
      'useQuery(',
      'useInfiniteQuery(',
      'supabase',
      '.from(',
      'revealLead',
      'matchLead',
      'reveal_contact',
      'adminApprove',
      'adminReject',
      'updateStatus',
      'editQuote',
      'onSubmit',
    ];
    for (const f of NEW_FILES) {
      const src = readAbs(path.join(f.dir, f.name));
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f.name} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('new files do not import Supabase or executive services', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/quotes',
      '@/modules/brands',
      '@/modules/leads/services/reveal',
      '@/modules/leads/services/match',
      '@/services',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = readAbs(path.join(f.dir, f.name));
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f.name} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('adapter only type-imports the row type from leads/services/list', () => {
    const src = readAbs(path.join(QR_DIR, 'buildQuoteRequestDrawerProps.ts'));
    // Only type-only import is allowed from this path.
    const rawImports = Array.from(
      src.matchAll(/^\s*import\s+([^;]+?)from\s+['"]([^'"]+)['"];?/gm),
    );
    for (const m of rawImports) {
      const clause = m[1];
      const from = m[2];
      if (from.startsWith('@/modules/leads/services')) {
        expect(
          /\btype\b/.test(clause),
          `adapter must import types-only from ${from}`,
        ).toBe(true);
      }
    }
  });

  it('new files contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      const src = readAbs(path.join(f.dir, f.name));
      expect(hex.test(src), `${f.name} contains a hex color`).toBe(false);
    }
  });

  it('new files contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = readAbs(path.join(f.dir, f.name));
      expect(/\bas\s+any\b/.test(src), `${f.name} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f.name} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f.name} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f.name} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f.name} has eslint-disable`).toBe(false);
    }
  });

  it('App.tsx is not modified to import the new procurement folders', () => {
    const src = readRepo('src/App.tsx');
    expect(src.includes('@/components/admin/procurement/quote-requests')).toBe(false);
  });

  it('forbidden quote/brand/lead modules and libs remain untouched', () => {
    for (const rel of FORBIDDEN_MODULE_FILES) {
      const src = readRepo(rel);
      expect(src.includes('@/components/admin/procurement/quote-requests')).toBe(false);
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
        expect(src.includes('@/components/admin/procurement/quote-requests')).toBe(false);
        expect(src.includes('@/components/admin/procurement/shared')).toBe(false);
      }
    }
  });
});