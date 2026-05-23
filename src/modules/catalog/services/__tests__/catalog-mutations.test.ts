import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data?: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.delete = vi.fn(chain);
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
  insertBusinessService,
  insertBusinessServices,
  updateBusinessServiceById,
  deleteBusinessServiceById,
  deleteDemoBusinessServicesForBusiness,
} from '../services/mutations';
import {
  insertServiceArea,
  deleteServiceAreaById,
  clearPrimaryServiceAreasForBusiness,
  setServiceAreaPrimaryById,
} from '../serviceAreas/mutations';
import {
  deleteAvailabilityForBusiness,
  insertAvailabilityRows,
} from '../availability/mutations';
import {
  insertWarranty,
  updateWarrantyById,
  deleteWarrantyById,
} from '../warranties/mutations';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null });
});

describe('business_services mutations', () => {
  it('insertBusinessService passes payload identity', async () => {
    const payload = { business_id: 'b1', name_ar: 'X', sort_order: 0 } as Parameters<typeof insertBusinessService>[0];
    await insertBusinessService(payload);
    expect(fromMock).toHaveBeenCalledWith('business_services');
    expect(builder.insert).toHaveBeenCalledTimes(1);
    expect(builder.insert.mock.calls[0][0]).toBe(payload);
  });

  it('insertBusinessServices bulk inserts the same array reference', async () => {
    const rows = [{ business_id: 'b1', name_ar: 'A' }, { business_id: 'b1', name_ar: 'B' }] as Parameters<typeof insertBusinessServices>[0];
    await insertBusinessServices(rows);
    expect(builder.insert.mock.calls[0][0]).toBe(rows);
  });

  it('updateBusinessServiceById applies values + eq id', async () => {
    const values = { is_active: false } as Parameters<typeof updateBusinessServiceById>[1];
    await updateBusinessServiceById('s1', values);
    expect(builder.update.mock.calls[0][0]).toBe(values);
    expect(builder.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('deleteBusinessServiceById deletes by id', async () => {
    await deleteBusinessServiceById('s1');
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('deleteDemoBusinessServicesForBusiness scopes by business + is_demo', async () => {
    await deleteDemoBusinessServicesForBusiness('b1');
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'business_id', 'b1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_demo', true);
  });

  it('returns raw error pass-through', async () => {
    builder = makeBuilder({ error: { message: 'boom' } });
    const r = await deleteBusinessServiceById('s1');
    expect(r.error).toEqual({ message: 'boom' });
  });
});

describe('business_service_areas mutations', () => {
  it('insertServiceArea passes payload identity', async () => {
    const payload = { business_id: 'b1', city: 'Riyadh', is_primary: true } as Parameters<typeof insertServiceArea>[0];
    await insertServiceArea(payload);
    expect(fromMock).toHaveBeenCalledWith('business_service_areas');
    expect(builder.insert.mock.calls[0][0]).toBe(payload);
  });

  it('deleteServiceAreaById deletes by id', async () => {
    await deleteServiceAreaById('a1');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'a1');
  });

  it('clearPrimaryServiceAreasForBusiness updates is_primary=false scoped to business', async () => {
    await clearPrimaryServiceAreasForBusiness('b1');
    expect(builder.update).toHaveBeenCalledWith({ is_primary: false });
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
  });

  it('setServiceAreaPrimaryById updates is_primary=true by id', async () => {
    await setServiceAreaPrimaryById('a1');
    expect(builder.update).toHaveBeenCalledWith({ is_primary: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'a1');
  });
});

describe('business_availability mutations', () => {
  it('deleteAvailabilityForBusiness scopes by business_id', async () => {
    await deleteAvailabilityForBusiness('b1');
    expect(fromMock).toHaveBeenCalledWith('business_availability');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
  });

  it('insertAvailabilityRows bulk inserts same array reference', async () => {
    const rows = [{ business_id: 'b1', day_of_week: 0 }] as Parameters<typeof insertAvailabilityRows>[0];
    await insertAvailabilityRows(rows);
    expect(builder.insert.mock.calls[0][0]).toBe(rows);
  });
});

describe('warranties mutations', () => {
  it('insertWarranty passes payload identity', async () => {
    const payload = { contract_id: 'c1', title_ar: 'X', start_date: '2025-01-01', end_date: '2026-01-01' } as Parameters<typeof insertWarranty>[0];
    await insertWarranty(payload);
    expect(fromMock).toHaveBeenCalledWith('warranties');
    expect(builder.insert.mock.calls[0][0]).toBe(payload);
  });

  it('updateWarrantyById applies values + eq id', async () => {
    const values = { title_ar: 'Y' } as Parameters<typeof updateWarrantyById>[1];
    await updateWarrantyById('w1', values);
    expect(builder.update.mock.calls[0][0]).toBe(values);
    expect(builder.eq).toHaveBeenCalledWith('id', 'w1');
  });

  it('deleteWarrantyById deletes by id', async () => {
    await deleteWarrantyById('w1');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'w1');
  });
});