import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Terminal = { data: unknown; error: unknown };

type ListBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (r: (v: Terminal) => unknown) => Promise<unknown>;
};

function makeBuilder(result: Terminal): ListBuilder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as ListBuilder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.is = vi.fn(chain);
  b.not = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.range = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: Terminal) => unknown) => Promise.resolve(result).then(cb);
  return b as unknown as ListBuilder;
}

let builder: ListBuilder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getPublicBusinessByUsername } from '../getPublicBusinessByUsername';
import { listPublicBusinessesForSector } from '../listPublicBusinessesForSector';
import { getBusinessByRefId } from '../getBusinessByRefId';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: { id: 'b1' }, error: null });
});

describe('getPublicBusinessByUsername', () => {
  it("from('businesses').select(select).eq(username).eq(is_active,true).maybeSingle() by default", async () => {
    await getPublicBusinessByUsername({ username: 'acme', select: '*, categories(*)' });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('*, categories(*)');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'username', 'acme');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_active', true);
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
  });

  it('omits is_active filter when activeOnly=false', async () => {
    await getPublicBusinessByUsername({ username: 'acme', activeOnly: false });
    expect(builder.eq).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith('username', 'acme');
  });

  it("uses single() when terminal === 'single'", async () => {
    await getPublicBusinessByUsername({ username: 'x', terminal: 'single' });
    expect(builder.single).toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it('returns raw { data, error } unchanged', async () => {
    builder = makeBuilder({ data: { id: 'y' }, error: null });
    const res = await getPublicBusinessByUsername({ username: 'y' });
    expect(res).toEqual({ data: { id: 'y' }, error: null });
  });

  it('does not throw on returned { error }', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const res = await getPublicBusinessByUsername({ username: 'x' });
    expect(res.error).toEqual({ message: 'rls' });
  });

  it('bubbles thrown Supabase errors', async () => {
    fromMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(getPublicBusinessByUsername({ username: 'x' })).rejects.toThrow('boom');
  });
});

describe('listPublicBusinessesForSector', () => {
  it("from('businesses') with caller select; applies in/eq filters in order", async () => {
    builder = makeBuilder({ data: [{ id: 'b1' }], error: null });
    await listPublicBusinessesForSector({
      select: 'id, name_ar',
      filters: [
        { column: 'category_id', op: 'in', value: ['c1', 'c2'] },
        { column: 'is_active', op: 'eq', value: true },
      ],
      orderBy: { column: 'rating_avg', ascending: false },
      limit: 500,
    });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id, name_ar');
    expect(builder.in).toHaveBeenCalledWith('category_id', ['c1', 'c2']);
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('rating_avg', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(500);
  });

  it('supports multiple orderBy and range', async () => {
    builder = makeBuilder({ data: [], error: null });
    await listPublicBusinessesForSector({
      select: 'id',
      orderBy: [
        { column: 'a', ascending: false, nullsFirst: false },
        { column: 'b', ascending: true },
      ],
      range: { from: 0, to: 9 },
    });
    expect(builder.order).toHaveBeenNthCalledWith(1, 'a', { ascending: false, nullsFirst: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'b', { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(0, 9);
  });

  it('returns raw { data, error } pass-through', async () => {
    builder = makeBuilder({ data: [{ id: 'z' }], error: null });
    const res = await listPublicBusinessesForSector({ select: 'id' });
    expect(res.data).toEqual([{ id: 'z' }]);
    expect(res.error).toBeNull();
  });
});

describe('getBusinessByRefId', () => {
  it("from('businesses').select('id').eq('ref_id', refId).maybeSingle() by default", async () => {
    await getBusinessByRefId({ refId: 'BIZ-1' });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.eq).toHaveBeenCalledWith('ref_id', 'BIZ-1');
    expect(builder.maybeSingle).toHaveBeenCalled();
  });

  it('honors custom select and single terminal', async () => {
    await getBusinessByRefId({ refId: 'BIZ-2', select: 'id, name_ar', terminal: 'single' });
    expect(builder.select).toHaveBeenCalledWith('id, name_ar');
    expect(builder.single).toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it('returns raw { data, error } unchanged', async () => {
    builder = makeBuilder({ data: { id: 'x' }, error: null });
    const res = await getBusinessByRefId({ refId: 'BIZ-3' });
    expect(res).toEqual({ data: { id: 'x' }, error: null });
  });
});

/** P-21 migration regression locks. */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-21 public/SEO businesses read migration', () => {
  it('business-profile.data.ts routes through getPublicBusinessByUsername with exact joined select', () => {
    const src = read('src/components/business-profile/business-profile.data.ts');
    expect(src).toMatch(/getPublicBusinessByUsername<BusinessWithJoins>\(\{/);
    expect(src).toContain('username,');
    expect(src).toContain('select: "*, categories(*), cities(*), countries(*)"');
    expect(src).toContain('queryKey: ["business", username]');
    expect(src).toContain('enabled: !!username');
    // No direct businesses table read remains in this file.
    expect(src).not.toMatch(/\.from\(["']businesses["']\)/);
  });

  it('SectorLanding uses listPublicBusinessesForSector with category_id in + is_active eq + rating order + limit 500', () => {
    const src = read('src/pages/SectorLanding.tsx');
    expect(src).toMatch(/listPublicBusinessesForSector\(\{/);
    expect(src).toContain(
      "'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, category_id, cities(id, name_ar, name_en)'",
    );
    expect(src).toContain("{ column: 'category_id', op: 'in', value: categoryIds }");
    expect(src).toContain("{ column: 'is_active', op: 'eq', value: true }");
    expect(src).toContain("orderBy: { column: 'rating_avg', ascending: false }");
    expect(src).toContain('limit: 500');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });

  it('SectorCity preserves category_id in + city_id eq + is_active + limit 200', () => {
    const src = read('src/pages/SectorCity.tsx');
    expect(src).toMatch(/listPublicBusinessesForSector\(\{/);
    expect(src).toContain("{ column: 'category_id', op: 'in', value: categoryIds }");
    expect(src).toContain("{ column: 'city_id', op: 'eq', value: cityRow!.id }");
    expect(src).toContain("{ column: 'is_active', op: 'eq', value: true }");
    expect(src).toContain('limit: 200');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });

  it('SectorBrief preserves category_id in + city_id in + is_active + limit 300', () => {
    const src = read('src/pages/SectorBrief.tsx');
    expect(src).toMatch(/listPublicBusinessesForSector\(\{/);
    expect(src).toContain("{ column: 'category_id', op: 'in', value: categoryIds }");
    expect(src).toContain("{ column: 'city_id', op: 'in', value: cityIds }");
    expect(src).toContain("{ column: 'is_active', op: 'eq', value: true }");
    expect(src).toContain('limit: 300');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });

  it('SectorDistributorsPanel uses listBusinessesByIds + getBusinessByRefId; no direct businesses reads', () => {
    const src = read('src/features/private-sectors/SectorDistributorsPanel.tsx');
    expect(src).toMatch(/listBusinessesByIds</);
    expect(src).toContain("select: 'id, ref_id, name_ar, name_en, username, city_id'");
    expect(src).toMatch(/getBusinessByRefId<\{ id: string \}>\(/);
    expect(src).toContain('refId: ref');
    expect(src).toContain("select: 'id'");
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });
});

describe('P-21 intentionally-deferred businesses reads', () => {
  it('ensure-business safety-net reads remain direct', () => {
    const src = read('src/lib/ensure-business.ts');
    expect(src).toMatch(/\.from\(['"]businesses['"]\)/);
  });

  it('business_staff aggregation in getManagedBusinessesForUser remains canonical', () => {
    const src = read('src/modules/leads/services/getManagedBusinessesForUser.ts');
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)/);
  });
});