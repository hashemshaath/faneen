import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data?: unknown; error: unknown; count?: number | null }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.order = vi.fn(chain);
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
  listServicesByBusiness,
  countServicesByBusiness,
} from '../services/reads';
import { listBranchesByBusiness } from '../branches/reads';
import {
  listAvailabilityByBusiness,
  listPublicAvailabilityByBusiness,
} from '../availability/reads';
import { listServiceAreasByBusiness } from '../serviceAreas/reads';
import {
  listGlobalBnplProviders,
  listBusinessBnplProviders,
} from '../bnpl/reads';
import {
  listWarrantiesByContractIds,
  listWarrantiesForContract,
} from '../warranties/reads';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [], error: null });
});

describe('catalog services reads', () => {
  it('listServicesByBusiness preserves table/select/filters/order', async () => {
    await listServicesByBusiness({ businessId: 'b1' });
    expect(fromMock).toHaveBeenCalledWith('business_services');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'business_id', 'b1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_active', true);
    // SERVICE-ACTIVATION-GOVERNANCE-3 — eligibility gate
    expect(builder.eq).toHaveBeenNthCalledWith(3, 'provider_status', 'active');
    expect(builder.eq).toHaveBeenNthCalledWith(4, 'admin_status', 'allowed');
    expect(builder.order).toHaveBeenCalledWith('sort_order');
  });

  it('listServicesByBusiness honors activeOnly:false + order:null + custom select', async () => {
    await listServicesByBusiness({ businessId: 'b1', select: 'id', activeOnly: true, order: null });
    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.order).not.toHaveBeenCalled();
  });

  it('countServicesByBusiness uses head:true count:exact and skips is_active by default', async () => {
    builder = makeBuilder({ count: 7, error: null });
    const r = await countServicesByBusiness({ businessId: 'b1' });
    expect(fromMock).toHaveBeenCalledWith('business_services');
    expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(r).toEqual({ count: 7, error: null });
  });

  it('countServicesByBusiness applies is_active when activeOnly', async () => {
    await countServicesByBusiness({ businessId: 'b1', activeOnly: true });
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_active', true);
    expect(builder.eq).toHaveBeenNthCalledWith(3, 'provider_status', 'active');
    expect(builder.eq).toHaveBeenNthCalledWith(4, 'admin_status', 'allowed');
  });

  it('listBranchesByBusiness preserves multi-order + active filter', async () => {
    await listBranchesByBusiness({
      businessId: 'b1',
      select: '*, cities(name_ar, name_en), countries(name_ar, name_en)',
      activeOnly: true,
      order: [{ column: 'is_main', ascending: false }, { column: 'sort_order' }],
    });
    expect(fromMock).toHaveBeenCalledWith('business_branches');
    expect(builder.select).toHaveBeenCalledWith(
      '*, cities(name_ar, name_en), countries(name_ar, name_en)',
    );
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'business_id', 'b1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_active', true);
    expect(builder.order).toHaveBeenNthCalledWith(1, 'is_main', { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'sort_order', { ascending: true });
  });

  it('listBranchesByBusiness with source=public routes through business_branches_public and skips is_active filter (DB-GOVERNANCE-2)', async () => {
    await listBranchesByBusiness({
      businessId: 'b1',
      select: 'id, name_ar, name_en',
      activeOnly: true,
      source: 'public',
    });
    expect(fromMock).toHaveBeenCalledWith('business_branches_public');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    // is_active is enforced by the view; wrapper must NOT add a redundant filter.
    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.find((c: unknown[]) => c[0] === 'is_active')).toBeUndefined();
  });

  it('listAvailabilityByBusiness preserves filters and order', async () => {
    await listAvailabilityByBusiness({ businessId: 'b1', order: 'day_of_week' });
    expect(fromMock).toHaveBeenCalledWith('business_availability');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(builder.order).toHaveBeenCalledWith('day_of_week');
  });

  it('listPublicAvailabilityByBusiness adds is_active=true and skips order by default', async () => {
    await listPublicAvailabilityByBusiness({ businessId: 'b1' });
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_active', true);
    expect(builder.order).not.toHaveBeenCalled();
  });

  it('listServiceAreasByBusiness preserves select and ordered chain', async () => {
    await listServiceAreasByBusiness({
      businessId: 'b1',
      select: 'id, business_id, city, district, is_primary',
      order: [
        { column: 'is_primary', ascending: false },
        { column: 'created_at', ascending: true },
      ],
    });
    expect(fromMock).toHaveBeenCalledWith('business_service_areas');
    expect(builder.select).toHaveBeenCalledWith('id, business_id, city, district, is_primary');
    expect(builder.order).toHaveBeenNthCalledWith(1, 'is_primary', { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: true });
  });

  it('listGlobalBnplProviders applies ids + activeOnly + order', async () => {
    await listGlobalBnplProviders({ ids: ['p1', 'p2'], activeOnly: true, order: 'sort_order' });
    expect(fromMock).toHaveBeenCalledWith('bnpl_providers');
    expect(builder.in).toHaveBeenCalledWith('id', ['p1', 'p2']);
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('sort_order');
  });

  it('listGlobalBnplProviders skips ids/order/active by default', async () => {
    await listGlobalBnplProviders();
    expect(builder.in).not.toHaveBeenCalled();
    expect(builder.eq).not.toHaveBeenCalled();
    expect(builder.order).not.toHaveBeenCalled();
  });

  it('listBusinessBnplProviders queries by business_id', async () => {
    await listBusinessBnplProviders({ businessId: 'b1' });
    expect(fromMock).toHaveBeenCalledWith('business_bnpl_providers');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
  });

  it('listWarrantiesByContractIds uses .in + order', async () => {
    await listWarrantiesByContractIds({
      contractIds: ['c1', 'c2'],
      order: { column: 'created_at', ascending: false },
    });
    expect(fromMock).toHaveBeenCalledWith('warranties');
    expect(builder.in).toHaveBeenCalledWith('contract_id', ['c1', 'c2']);
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('listWarrantiesForContract queries by contract_id', async () => {
    await listWarrantiesForContract({ contractId: 'c1' });
    expect(fromMock).toHaveBeenCalledWith('warranties');
    expect(builder.eq).toHaveBeenCalledWith('contract_id', 'c1');
  });

  it('returns raw error pass-through without throwing', async () => {
    builder = makeBuilder({ data: null, error: { message: 'boom' } });
    const r = await listServicesByBusiness({ businessId: 'b1' });
    expect(r.error).toEqual({ message: 'boom' });
    expect(r.data).toBeNull();
  });
});