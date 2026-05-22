import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown; count?: number | null }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.order = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_table: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listBusinessesByIds } from '../listBusinessesByIds';
import { countActiveBusinesses } from '../countActiveBusinesses';
import { listCompareBusinesses } from '../listCompareBusinesses';
import { getBusinessForContract } from '../getBusinessForContract';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [], error: null, count: 0 });
});

describe('listBusinessesByIds', () => {
  it('queries businesses with default select and in() filter', async () => {
    await listBusinessesByIds({ ids: ['a', 'b'] });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en, username');
    expect(builder.in).toHaveBeenCalledWith('id', ['a', 'b']);
  });
  it('honors custom select (Compare detail shape)', async () => {
    const sel = '*, categories(name_ar, name_en), cities(name_ar, name_en), business_services(*), provider_installment_settings(*)';
    await listBusinessesByIds({ ids: ['x'], select: sel });
    expect(builder.select).toHaveBeenCalledWith(sel);
    expect(builder.in).toHaveBeenCalledWith('id', ['x']);
  });
});

describe('countActiveBusinesses', () => {
  it("uses head count: select('id', { count: 'exact', head: true }).eq('is_active', true)", async () => {
    builder = makeBuilder({ data: null, error: null, count: 7 });
    const r = await countActiveBusinesses();
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(r.count).toBe(7);
  });
});

describe('listCompareBusinesses', () => {
  it('preserves exact select, is_active filter, and rating_avg desc order', async () => {
    await listCompareBusinesses();
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith(
      'id, name_ar, name_en, username, logo_url, rating_avg, rating_count, ' +
      'categories(name_ar, name_en), cities(name_ar, name_en)',
    );
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('rating_avg', { ascending: false });
  });
});

describe('getBusinessForContract', () => {
  it('uses maybeSingle with categories join select', async () => {
    builder = makeBuilder({ data: { id: 'b1' }, error: null });
    const r = await getBusinessForContract('b1');
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('*, categories(name_ar, name_en)');
    expect(builder.eq).toHaveBeenCalledWith('id', 'b1');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(r.data).toEqual({ id: 'b1' });
  });
});

// ─── Migration regression locks ────────────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-3 public business migration', () => {
  it('BrandDetail uses listBusinessesByIds (no direct businesses read)', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toContain('listBusinessesByIds');
    expect(src).toContain("['public-brand-dist-bizs'");
  });
  it('About uses countActiveBusinesses (no direct businesses read)', () => {
    const src = read('src/pages/About.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toContain('countActiveBusinesses');
    expect(src).toContain("['about-stats']");
  });
  it('Compare uses listCompareBusinesses + listBusinessesByIds (no direct businesses reads)', () => {
    const src = read('src/pages/Compare.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toContain('listCompareBusinesses');
    expect(src).toContain('listBusinessesByIds');
    expect(src).toContain("['businesses-for-compare']");
    expect(src).toContain("['compare-businesses'");
  });
  it('ContractDetail uses getBusinessForContract (no direct businesses read)', () => {
    const src = read('src/pages/ContractDetail.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toContain('getBusinessForContract');
    expect(src).toContain("['contract-business'");
  });
});

describe('P-3 out-of-scope guardrail (must remain direct in this phase)', () => {
  // NOTE: AuthContext owner-business + business_staff probes were migrated in
  // P-4 (owner-business + staff membership wrappers). Their regression locks
  // live in ownerBusinessReads.test.ts.
  it('AdminBusinesses CRUD remains direct', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/supabase\.from\(['"]businesses['"]\)\.update/);
  });
  // NOTE: ContractDetail profiles joins were migrated in P-5
  // (getProfileForContractParty). Lock lives in
  // src/modules/users/services/__tests__/profileReads.test.ts.
});