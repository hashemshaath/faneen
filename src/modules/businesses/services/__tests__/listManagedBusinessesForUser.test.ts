import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

function makeBuilder(result: { data: unknown[] | null; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

const builders: Record<string, Builder> = {};
const fromMock = vi.fn((table: string) => builders[table]);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listManagedBusinessesForUser } from '../listManagedBusinessesForUser';

beforeEach(() => {
  fromMock.mockClear();
  builders.businesses = makeBuilder({ data: [], error: null });
  builders.business_staff = makeBuilder({ data: [], error: null });
});

describe('listManagedBusinessesForUser (P-24)', () => {
  it('queries both businesses and business_staff tables', async () => {
    await listManagedBusinessesForUser('u-1');
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(fromMock).toHaveBeenCalledWith('business_staff');
  });

  it('uses exact select strings', async () => {
    await listManagedBusinessesForUser('u-1');
    expect(builders.businesses.select).toHaveBeenCalledWith('id, name_ar, name_en');
    expect(builders.business_staff.select).toHaveBeenCalledWith(
      'business_id, role, businesses:business_id(id, name_ar, name_en)',
    );
  });

  it('applies user_id filter on owned businesses', async () => {
    await listManagedBusinessesForUser('u-42');
    expect(builders.businesses.eq).toHaveBeenCalledWith('user_id', 'u-42');
  });

  it('applies exact user_id/is_active/role filters on business_staff', async () => {
    await listManagedBusinessesForUser('u-42');
    expect(builders.business_staff.eq).toHaveBeenCalledWith('user_id', 'u-42');
    expect(builders.business_staff.eq).toHaveBeenCalledWith('is_active', true);
    expect(builders.business_staff.in).toHaveBeenCalledWith('role', ['owner', 'manager']);
  });

  it('dedupes by business id across owned and staff', async () => {
    builders.businesses = makeBuilder({
      data: [{ id: 'b1', name_ar: 'أ', name_en: 'A' }],
      error: null,
    });
    builders.business_staff = makeBuilder({
      data: [
        { business_id: 'b1', role: 'manager', businesses: { id: 'b1', name_ar: 'أ', name_en: 'A' } },
        { business_id: 'b2', role: 'owner', businesses: { id: 'b2', name_ar: 'ب', name_en: 'B' } },
      ],
      error: null,
    });
    const r = await listManagedBusinessesForUser('u-1');
    expect(r.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('skips staff rows with no joined business', async () => {
    builders.business_staff = makeBuilder({
      data: [{ business_id: 'b3', role: 'owner', businesses: null }],
      error: null,
    });
    expect(await listManagedBusinessesForUser('u-1')).toEqual([]);
  });

  it('returns [] when both queries return null data', async () => {
    builders.businesses = makeBuilder({ data: null, error: null });
    builders.business_staff = makeBuilder({ data: null, error: null });
    expect(await listManagedBusinessesForUser('u-1')).toEqual([]);
  });
});