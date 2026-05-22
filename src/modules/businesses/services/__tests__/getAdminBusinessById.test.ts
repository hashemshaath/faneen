import { describe, it, expect, vi, beforeEach } from 'vitest';

type Terminal = { data: unknown; error: unknown };
type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeBuilder(result: Terminal): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getAdminBusinessById } from '../getAdminBusinessById';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: { id: 'b1' }, error: null });
});

describe('getAdminBusinessById', () => {
  it("queries from('businesses').select('*').eq('id', id).maybeSingle() by default", async () => {
    await getAdminBusinessById({ id: 'b1' });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('id', 'b1');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await getAdminBusinessById({ id: 'b1', select: 'id, name_ar' });
    expect(builder.select).toHaveBeenCalledWith('id, name_ar');
  });

  it("uses single() when terminal === 'single'", async () => {
    await getAdminBusinessById({ id: 'b1', terminal: 'single' });
    expect(builder.single).toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it('returns raw { data, error } unchanged', async () => {
    builder = makeBuilder({ data: { id: 'x' }, error: null });
    const res = await getAdminBusinessById({ id: 'x' });
    expect(res).toEqual({ data: { id: 'x' }, error: null });
  });

  it('does not throw on returned { error }', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const res = await getAdminBusinessById({ id: 'x' });
    expect(res.error).toEqual({ message: 'rls' });
    expect(res.data).toBeNull();
  });

  it('bubbles thrown Supabase errors', async () => {
    fromMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(getAdminBusinessById({ id: 'x' })).rejects.toThrow('boom');
  });
});