import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (r: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.delete = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (cb) => Promise.resolve(result).then(cb);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => fromMock(t),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import { listAddresses } from '../listAddresses';
import { getPrimaryAddress } from '../getPrimaryAddress';
import { upsertAddress } from '../upsertAddress';
import { setPrimaryAddress } from '../setPrimaryAddress';
import { deleteAddress } from '../deleteAddress';
import { resolveFromSpl } from '../resolveFromSpl';

beforeEach(() => {
  fromMock.mockClear();
  invokeMock.mockReset();
  builder = makeBuilder({ data: [], error: null });
});

describe('addresses microservice', () => {
  it('listAddresses queries by owner_type + owner_id, primary first', async () => {
    await listAddresses({ ownerType: 'business', ownerId: 'biz-1' });
    expect(fromMock).toHaveBeenCalledWith('addresses');
    expect(builder.eq).toHaveBeenCalledWith('owner_type', 'business');
    expect(builder.eq).toHaveBeenCalledWith('owner_id', 'biz-1');
    expect(builder.order).toHaveBeenCalledWith('is_primary', { ascending: false });
  });

  it('getPrimaryAddress filters is_primary=true', async () => {
    builder = makeBuilder({ data: { id: 'a' }, error: null });
    const { data } = await getPrimaryAddress({ ownerType: 'profile', ownerId: 'u-1' });
    expect(builder.eq).toHaveBeenCalledWith('is_primary', true);
    expect(data).toEqual({ id: 'a' });
  });

  it('upsertAddress inserts when no id', async () => {
    builder = makeBuilder({ data: { id: 'new' }, error: null });
    await upsertAddress({
      ownerType: 'business', ownerId: 'biz-1',
      fields: { region: 'الرياض', source: 'manual' },
    });
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({
      owner_type: 'business', owner_id: 'biz-1', region: 'الرياض', source: 'manual',
    }));
  });

  it('upsertAddress updates when id provided', async () => {
    builder = makeBuilder({ data: { id: 'a' }, error: null });
    await upsertAddress({
      id: 'a', ownerType: 'profile', ownerId: 'u-1',
      fields: { region: 'جدة' },
    });
    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'a');
  });

  it('setPrimaryAddress sets is_primary=true on id', async () => {
    await setPrimaryAddress('a');
    expect(builder.update).toHaveBeenCalledWith({ is_primary: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'a');
  });

  it('deleteAddress deletes by id', async () => {
    await deleteAddress('a');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'a');
  });

  it('resolveFromSpl maps a successful response into AddressFields', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        address: {
          region_ar: 'الرياض', region_en: 'Riyadh',
          city_ar: 'الرياض', city_en: 'Riyadh',
          district_ar: 'العليا', district_en: 'Olaya',
          street_ar: 'الملك فهد', street_en: 'King Fahd',
          address_ar: 'العليا 1', address_en: 'Olaya 1',
          building_number: '1234', additional_number: '5678', post_code: '12345',
        },
      },
      error: null,
    });
    const res = await resolveFromSpl('rrrd2402');
    expect(invokeMock).toHaveBeenCalledWith('national-address-lookup', { body: { shortAddress: 'RRRD2402' } });
    expect(res.ok).toBe(true);
    expect(res.fields?.region_en).toBe('Riyadh');
    expect(res.fields?.short_address).toBe('RRRD2402');
    expect(res.fields?.source).toBe('spl');
  });

  it('resolveFromSpl surfaces failure with localized message', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: false, message_ar: 'غير موجود', message_en: 'Not found' },
      error: null,
    });
    const res = await resolveFromSpl('XXXX9999');
    expect(res.ok).toBe(false);
    expect(res.message_ar).toBe('غير موجود');
    expect(res.fields).toBeUndefined();
  });

  it('resolveFromSpl rejects empty input', async () => {
    const res = await resolveFromSpl('   ');
    expect(res.ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});