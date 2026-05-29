import { describe, expect, it, vi, beforeEach } from 'vitest';

const upsert = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const order = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: (...args: unknown[]) => {
        upsert(...args);
        return { select: () => Promise.resolve({ data: [{ id: 'inv-1' }], error: null }) };
      },
      select: () => {
        select();
        return {
          eq: (...a: unknown[]) => {
            eq(...a);
            return {
              order: (...o: unknown[]) => {
                order(...o);
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      },
    })),
  },
}));

beforeEach(() => {
  upsert.mockClear();
  select.mockClear();
  eq.mockClear();
  order.mockClear();
});

describe('invitations service', () => {
  it('short-circuits on empty supplier list', async () => {
    const { inviteSuppliersToRfq } = await import('../services/invitations');
    const res = await inviteSuppliersToRfq({
      business_id: 'b1',
      rfq_id: 'r1',
      supplier_ids: [],
      invited_by: 'u1',
    });
    expect(res.error).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('deduplicates and upserts on (rfq_id, supplier_id)', async () => {
    const { inviteSuppliersToRfq } = await import('../services/invitations');
    await inviteSuppliersToRfq({
      business_id: 'b1',
      rfq_id: 'r1',
      supplier_ids: ['s1', 's1', 's2'],
      invited_by: 'u1',
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [rows, opts] = upsert.mock.calls[0];
    expect((rows as unknown[]).length).toBe(2);
    expect(opts).toMatchObject({ onConflict: 'rfq_id,supplier_id' });
  });

  it('lists invitations ordered by invited_at', async () => {
    const { listInvitationsByRfq } = await import('../services/invitations');
    await listInvitationsByRfq('r1');
    expect(eq).toHaveBeenCalledWith('rfq_id', 'r1');
    expect(order).toHaveBeenCalledWith('invited_at', { ascending: true });
  });
});