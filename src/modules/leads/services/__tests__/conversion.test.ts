import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

const calls: { table: string; builder: Builder }[] = [];
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeBuilder(): Builder {
  const b = {} as Builder;
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve(nextResult));
  return b;
}

const fromMock = vi.fn((table: string) => {
  const builder = makeBuilder();
  calls.push({ table, builder });
  return builder;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getContractAfterConvert } from '../conversion';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: null, error: null };
});

describe('getContractAfterConvert', () => {
  it('queries contracts with the correct shape', async () => {
    nextResult = { data: { contract_number: 'CT-1', provider_id: 'p-1' }, error: null };
    const result = await getContractAfterConvert('contract-id');
    expect(calls[0].table).toBe('contracts');
    expect(calls[0].builder.select).toHaveBeenCalledWith('contract_number, provider_id');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('id', 'contract-id');
    expect(calls[0].builder.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual({ contract_number: 'CT-1', provider_id: 'p-1' });
  });

  it('returns null when no row is found', async () => {
    nextResult = { data: null, error: null };
    const result = await getContractAfterConvert('missing');
    expect(result).toBeNull();
  });

  it('throws when query returns an error', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(getContractAfterConvert('x')).rejects.toBeTruthy();
  });
});