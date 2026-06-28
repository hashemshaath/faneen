/**
 * Phase 3I — Admin Quote dual sector filter.
 *
 * Verifies the additive behavior of `listAdminOpsQuoteRequests` when the
 * caller passes a sector value: canonical / legacy sectors expand to an
 * `.in('sector', [...aliases])` filter so sibling-aliased rows surface,
 * while `other`/unknown fall back to the legacy `.eq('sector', sector)`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

type Call = { op: 'eq' | 'in' | 'gte'; col: string; value: unknown };
const calls: Call[] = [];

function builder(): any {
  const b: any = {};
  b.select = () => b;
  b.order = () => b;
  b.limit = () => b;
  b.gte = (col: string, value: unknown) => { calls.push({ op: 'gte', col, value }); return b; };
  b.eq = (col: string, value: unknown) => { calls.push({ op: 'eq', col, value }); return b; };
  b.in = (col: string, value: unknown) => { calls.push({ op: 'in', col, value }); return b; };
  // terminal thenable so `await query` resolves with an empty result set
  b.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(onF, onR);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => builder() },
}));

import { listAdminOpsQuoteRequests } from '@/modules/quotes/services/listAdminOpsQuoteRequests';

beforeEach(() => { calls.length = 0; });

describe('Phase 3I — dual sector filter (runtime)', () => {
  it('sector=all does not constrain by sector', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: null, sector: 'all' });
    expect(calls.find((c) => c.col === 'sector')).toBeUndefined();
  });

  it('legacy "aluminum" expands to .in() including canonical + aliases', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: null, sector: 'aluminum' });
    const c = calls.find((x) => x.col === 'sector');
    expect(c?.op).toBe('in');
    const set = new Set(c?.value as string[]);
    expect(set.has('aluminum')).toBe(true);
    expect(set.has('aluminum-works')).toBe(true);
    expect(set.has('alumnium')).toBe(true); // sibling legacy alias
  });

  it('canonical "aluminum-works" still surfaces legacy "aluminum" rows', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: null, sector: 'aluminum-works' });
    const c = calls.find((x) => x.col === 'sector');
    expect(c?.op).toBe('in');
    const set = new Set(c?.value as string[]);
    expect(set.has('aluminum-works')).toBe(true);
    expect(set.has('aluminum')).toBe(true);
  });

  it('"other" falls back to legacy .eq filter (no canonical mapping)', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: null, sector: 'other' });
    const c = calls.find((x) => x.col === 'sector');
    expect(c?.op).toBe('eq');
    expect(c?.value).toBe('other');
  });

  it('unknown sector falls back to legacy .eq filter and does not throw', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: null, sector: 'totally-unknown' });
    const c = calls.find((x) => x.col === 'sector');
    expect(c?.op).toBe('eq');
    expect(c?.value).toBe('totally-unknown');
  });

  it('fromDateIso still applies as .gte regardless of sector branch', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: '2026-01-01T00:00:00Z', sector: 'iron' });
    expect(calls.find((c) => c.op === 'gte' && c.col === 'created_at')).toBeTruthy();
    expect(calls.find((c) => c.col === 'sector')?.op).toBe('in');
  });
});

describe('Phase 3I — guards: no scope creep', () => {
  it('service still keeps .eq fallback for unresolved sectors', () => {
    const src = read('src/modules/quotes/services/listAdminOpsQuoteRequests.ts');
    expect(src).toMatch(/\.eq\('sector',\s*sector\)/);
    expect(src).toMatch(/\.in\('sector',\s*Array\.from\(aliases\)\)/);
  });

  it('aggregation/KPI module untouched (no taxonomy import)', () => {
    const src = read('src/lib/quoteOperationsAggregation.ts');
    expect(src).not.toMatch(/resolveQuoteSectorTaxonomy/);
    expect(src).not.toMatch(/legacyAliasesForTaxonomy/);
  });

  it('CSV builder still emits SECTOR_LABEL_AR from legacy sector', () => {
    const src = read('src/modules/quotes/services/buildFollowUpCsv.ts');
    expect(src).toMatch(/SECTOR_LABEL_AR\[quote\.sector\]/);
  });

  it('submit-quote-request edge function unchanged in scope', () => {
    const src = read('supabase/functions/submit-quote-request/index.ts');
    expect(src).toMatch(/taxonomy_category_id/);
    expect(src).toMatch(/sector/);
  });

  it('match-quote-request edge function unchanged in scope', () => {
    const src = read('supabase/functions/match-quote-request/index.ts');
    expect(src).toMatch(/taxonomy_category_id/);
    expect(src).toMatch(/sector/);
  });
});