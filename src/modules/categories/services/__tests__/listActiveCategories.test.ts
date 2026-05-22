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

import { listActiveCategories } from '../listActiveCategories';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [], error: null });
});

describe('listActiveCategories', () => {
  it('queries the categories table with default select/order', async () => {
    await listActiveCategories();
    expect(fromMock).toHaveBeenCalledWith('categories');
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('sort_order');
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await listActiveCategories({ select: '*' });
    expect(builder.select).toHaveBeenCalledWith('*');
  });

  it('honors custom select and limit (HeroSection shape)', async () => {
    await listActiveCategories({ select: 'id, name_ar, name_en, slug', limit: 6 });
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en, slug');
    expect(builder.limit).toHaveBeenCalledWith(6);
  });

  it('skips order when order is null', async () => {
    await listActiveCategories({ order: null });
    expect(builder.order).not.toHaveBeenCalled();
  });

  it('returns { data, error } from supabase', async () => {
    builder = makeBuilder({ data: [{ id: 'c1' }], error: null });
    const r = await listActiveCategories();
    expect(r).toEqual({ data: [{ id: 'c1' }], error: null });
  });

  it('returns error without throwing', async () => {
    builder = makeBuilder({ data: null, error: { message: 'boom' } });
    const r = await listActiveCategories();
    expect(r.error).toEqual({ message: 'boom' });
    expect(r.data).toBeNull();
  });
});