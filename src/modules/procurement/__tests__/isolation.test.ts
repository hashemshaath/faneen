import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');
const SRC = path.join(ROOT, 'src');
const TABLES = [
  'procurement_requests',
  'procurement_rfqs',
  'procurement_suppliers',
  'procurement_supplier_quotes',
];
const ALLOWED = [
  'src/modules/procurement/services/',
  'src/integrations/supabase/',
];

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '__tests__', '.git', 'dist'].includes(e.name)) continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name)) {
      yield full;
    }
  }
}

describe('procurement isolation', () => {
  it('only services touch procurement tables directly', () => {
    const re = new RegExp(`\\.from\\(\\s*['"](?:${TABLES.join('|')})['"]\\s*\\)`);
    const violations: string[] = [];
    for (const f of walk(SRC)) {
      const rel = path.relative(ROOT, f).replace(/\\/g, '/');
      if (ALLOWED.some((p) => rel.startsWith(p))) continue;
      const src = fs.readFileSync(f, 'utf8');
      if (re.test(src)) violations.push(rel);
    }
    expect(violations).toEqual([]);
  });

  it('quoteComparison.ts has no Supabase import', () => {
    const f = path.join(SRC, 'modules/procurement/services/quoteComparison.ts');
    const src = fs.readFileSync(f, 'utf8');
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(src).not.toMatch(/@supabase\/supabase-js/);
  });

  it('procurement pages do not call supabase.storage directly', () => {
    const pages = [
      'src/pages/dashboard/DashboardProcurement.tsx',
      'src/pages/dashboard/DashboardProcurementDetail.tsx',
    ];
    for (const p of pages) {
      const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
      expect(src).not.toMatch(/supabase\.storage/);
      expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase\/client["']/);
    }
  });

  it('procurement routes are registered in App.tsx', () => {
    const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/dashboard\/procurement"/);
    expect(app).toMatch(/path="\/dashboard\/procurement\/:id"/);
  });

  it('barrel exports the canonical wrappers', () => {
    const barrel = fs.readFileSync(path.join(SRC, 'modules/procurement/index.ts'), 'utf8');
    for (const name of [
      'createProcurementRequest',
      'listProcurementRequests',
      'updateProcurementRequestStatus',
      'createRfqFromRequest',
      'listRfqs',
      'createSupplier',
      'listSuppliers',
      'submitSupplierQuote',
      'listSupplierQuotesByRfq',
      'awardSupplierQuote',
      'compareSupplierQuotes',
    ]) {
      expect(barrel).toContain(name);
    }
  });
});