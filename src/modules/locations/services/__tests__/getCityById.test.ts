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

import { getCityById } from '../getCityById';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: { name_ar: 'م', name_en: 'M' }, error: null });
});

describe('getCityById', () => {
  it('queries cities by id with .single() (ProjectDetail shape)', async () => {
    await getCityById('city-1');
    expect(fromMock).toHaveBeenCalledWith('cities');
    expect(builder.select).toHaveBeenCalledWith('name_ar, name_en');
    expect(builder.eq).toHaveBeenCalledWith('id', 'city-1');
    expect(builder.single).toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await getCityById('city-1', { select: 'id, country_id' });
    expect(builder.select).toHaveBeenCalledWith('id, country_id');
  });
});