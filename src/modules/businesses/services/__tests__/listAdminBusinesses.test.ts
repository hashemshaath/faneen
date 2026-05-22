import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (r: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.is = vi.fn(chain);
  b.not = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.then = (cb: (v: typeof result) => unknown) => Promise.resolve(result).then(cb);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listAdminBusinesses } from '../listAdminBusinesses';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [{ id: 'b1' }], error: null });
});

describe('listAdminBusinesses', () => {
  it("queries from('businesses').select('*') by default", async () => {
    await listAdminBusinesses();
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.order).not.toHaveBeenCalled();
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await listAdminBusinesses({ select: 'id, name_ar' });
    expect(builder.select).toHaveBeenCalledWith('id, name_ar');
  });

  it('applies eq/in/is/not filters in order', async () => {
    await listAdminBusinesses({
      select: 'id',
      filters: [
        { column: 'approval_status', op: 'eq', value: 'submitted' },
        { column: 'id', op: 'in', value: ['a', 'b'] },
        { column: 'deleted_at', op: 'is', value: null },
        { column: 'latitude', op: 'not', operator: 'is', value: null },
      ],
    });
    expect(builder.eq).toHaveBeenCalledWith('approval_status', 'submitted');
    expect(builder.in).toHaveBeenCalledWith('id', ['a', 'b']);
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null);
    expect(builder.not).toHaveBeenCalledWith('latitude', 'is', null);
  });

  it('applies single orderBy', async () => {
    await listAdminBusinesses({ orderBy: { column: 'created_at', ascending: false } });
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('applies multiple orderBy in order, with nullsFirst when provided', async () => {
    await listAdminBusinesses({
      orderBy: [
        { column: 'submitted_at', ascending: false, nullsFirst: false },
        { column: 'created_at', ascending: false },
      ],
    });
    expect(builder.order).toHaveBeenNthCalledWith(1, 'submitted_at', { ascending: false, nullsFirst: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
  });

  it('applies limit when provided', async () => {
    await listAdminBusinesses({ limit: 200 });
    expect(builder.limit).toHaveBeenCalledWith(200);
  });

  it('returns raw { data, error } pass-through', async () => {
    builder = makeBuilder({ data: [{ id: 'x' }], error: null });
    const res = await listAdminBusinesses();
    expect(res.data).toEqual([{ id: 'x' }]);
    expect(res.error).toBeNull();
  });

  it('does not throw on returned { error }', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const res = await listAdminBusinesses();
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ message: 'rls' });
  });

  it('bubbles thrown Supabase errors', async () => {
    fromMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(listAdminBusinesses()).rejects.toThrow('boom');
  });
});