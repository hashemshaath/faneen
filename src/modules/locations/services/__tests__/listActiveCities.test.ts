import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_table: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listActiveCities } from '../listActiveCities';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [], error: null });
});

describe('listActiveCities', () => {
  it('queries cities with default select/order (name_ar)', async () => {
    await listActiveCities();
    expect(fromMock).toHaveBeenCalledWith('cities');
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('name_ar');
  });

  it('honors custom select (useSearch shape)', async () => {
    await listActiveCities({ select: '*' });
    expect(builder.select).toHaveBeenCalledWith('*');
  });

  it('skips order when null (HeroSection/Projects shape)', async () => {
    await listActiveCities({ order: null, limit: 10 });
    expect(builder.order).not.toHaveBeenCalled();
    expect(builder.limit).toHaveBeenCalledWith(10);
  });

  it('returns { data, error } from supabase', async () => {
    builder = makeBuilder({ data: [{ id: 'c1' }], error: null });
    const r = await listActiveCities();
    expect(r).toEqual({ data: [{ id: 'c1' }], error: null });
  });
});