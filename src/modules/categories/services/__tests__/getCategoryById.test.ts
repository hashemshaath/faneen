import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.single = vi.fn(() => Promise.resolve(result));
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_table: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getCategoryById } from '../getCategoryById';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: { name_ar: 'أ', name_en: 'A' }, error: null });
});

describe('getCategoryById', () => {
  it('queries the categories table by id with .single() (ProjectDetail shape)', async () => {
    await getCategoryById('cat-1');
    expect(fromMock).toHaveBeenCalledWith('categories');
    expect(builder.select).toHaveBeenCalledWith('name_ar, name_en');
    expect(builder.eq).toHaveBeenCalledWith('id', 'cat-1');
    expect(builder.single).toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await getCategoryById('cat-1', { select: 'id, slug' });
    expect(builder.select).toHaveBeenCalledWith('id, slug');
  });

  it('returns { data, error } without throwing', async () => {
    const r = await getCategoryById('cat-1');
    expect(r).toEqual({ data: { name_ar: 'أ', name_en: 'A' }, error: null });
  });
});