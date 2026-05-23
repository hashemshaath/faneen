import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data?: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.delete = vi.fn(chain);
  b.upsert = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_table: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  insertBnplProvider,
  updateBnplProviderById,
  deleteBnplProviderById,
  upsertBusinessBnplProvider,
  updateBusinessBnplProviderForBusiness,
} from '../bnpl/mutations';

beforeEach(() => {
  builder = makeBuilder({ data: null, error: null });
  fromMock.mockClear();
});

describe('CAT-5 bnpl_providers admin mutations', () => {
  it('insertBnplProvider passes payload identity to bnpl_providers.insert', async () => {
    const payload = { name_en: 'X', name_ar: 'س' } as any;
    const res = await insertBnplProvider(payload);
    expect(fromMock).toHaveBeenCalledWith('bnpl_providers');
    expect(builder.insert).toHaveBeenCalledWith(payload);
    expect(res).toEqual({ data: null, error: null });
  });

  it('updateBnplProviderById updates with values and filters by id', async () => {
    const values = { is_active: false } as any;
    await updateBnplProviderById({ id: 'p1', values });
    expect(fromMock).toHaveBeenCalledWith('bnpl_providers');
    expect(builder.update).toHaveBeenCalledWith(values);
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('deleteBnplProviderById deletes filtered by id', async () => {
    await deleteBnplProviderById('p2');
    expect(fromMock).toHaveBeenCalledWith('bnpl_providers');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'p2');
  });

  it('errors bubble in the raw envelope', async () => {
    builder = makeBuilder({ data: null, error: { message: 'boom' } });
    const res = await deleteBnplProviderById('p3');
    expect(res.error).toEqual({ message: 'boom' });
  });
});

describe('CAT-5 business_bnpl_providers per-business mutations', () => {
  it('upsertBusinessBnplProvider preserves payload and onConflict option', async () => {
    const payload = { business_id: 'b1', bnpl_provider_id: 'p1', is_active: true } as any;
    await upsertBusinessBnplProvider(payload, { onConflict: 'business_id,bnpl_provider_id' });
    expect(fromMock).toHaveBeenCalledWith('business_bnpl_providers');
    expect(builder.upsert).toHaveBeenCalledWith(payload, {
      onConflict: 'business_id,bnpl_provider_id',
    });
  });

  it('updateBusinessBnplProviderForBusiness updates by composite filter', async () => {
    const values = { is_active: false } as any;
    await updateBusinessBnplProviderForBusiness({
      businessId: 'b1',
      providerId: 'p1',
      values,
    });
    expect(fromMock).toHaveBeenCalledWith('business_bnpl_providers');
    expect(builder.update).toHaveBeenCalledWith(values);
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'business_id', 'b1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'bnpl_provider_id', 'p1');
  });
});