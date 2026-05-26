import { describe, it, expect, vi, beforeEach } from 'vitest';

const order = vi.fn();
const eq2 = vi.fn(() => ({ order }));
const eq1 = vi.fn(() => ({ eq: eq2, order }));
const select = vi.fn(() => ({ eq: eq1 }));
const from = vi.fn(() => ({ select }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => from(...a) },
}));

import { listLocationsForEntity } from '@/modules/locations/services/workspace/listLocationsForEntity';

beforeEach(() => {
  from.mockClear(); select.mockClear(); eq1.mockClear(); eq2.mockClear(); order.mockClear();
  // chain ends on the second order() call returning the awaited result.
  const orderInner = vi.fn().mockResolvedValue({ data: [{ id: 'l1', name_ar: null, name_en: 'X', is_main: true, is_active: true }], error: null });
  order.mockReturnValue({ order: orderInner });
});

describe('listLocationsForEntity', () => {
  it('targets business_branches with entity + active filter', async () => {
    const res = await listLocationsForEntity({ entityId: 'b1' });
    expect(from).toHaveBeenCalledWith('business_branches');
    expect(select).toHaveBeenCalledWith('id, name_ar, name_en, is_main, is_active');
    expect(eq1).toHaveBeenCalledWith('business_id', 'b1');
    expect(eq2).toHaveBeenCalledWith('is_active', true);
    expect(res.error).toBeNull();
    expect(res.data?.[0].id).toBe('l1');
  });

  it('skips activeOnly filter when activeOnly=false', async () => {
    await listLocationsForEntity({ entityId: 'b1', activeOnly: false });
    expect(eq1).toHaveBeenCalledWith('business_id', 'b1');
    expect(eq2).not.toHaveBeenCalled();
  });
});