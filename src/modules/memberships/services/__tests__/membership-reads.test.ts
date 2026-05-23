import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data?: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_table: string) => builder);
const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => fromMock(t),
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  },
}));

import { listActiveMembershipPlans } from '../plans/reads';
import { getCurrentMembershipSubscription } from '../subscriptions/reads';
import { hasMembershipFeature, getMembershipUsage } from '../usage/reads';

beforeEach(() => {
  fromMock.mockClear();
  rpcMock.mockReset();
  builder = makeBuilder({ data: [], error: null });
});

describe('memberships services reads (MEMB-2)', () => {
  it('listActiveMembershipPlans preserves table/filter/order', async () => {
    await listActiveMembershipPlans({ select: 'tier, limits' });
    expect(fromMock).toHaveBeenCalledWith('membership_plans');
    expect(builder.select).toHaveBeenCalledWith('tier, limits');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('sort_order');
  });

  it('listActiveMembershipPlans supports limit and custom order', async () => {
    await listActiveMembershipPlans({ select: '*', orderBy: 'created_at', limit: 3 });
    expect(builder.order).toHaveBeenCalledWith('created_at');
    expect(builder.limit).toHaveBeenCalledWith(3);
  });

  it('listActiveMembershipPlans passes through error', async () => {
    builder = makeBuilder({ data: null, error: { message: 'x' } });
    const res = await listActiveMembershipPlans();
    expect(res.error).toEqual({ message: 'x' });
  });

  it('getCurrentMembershipSubscription single status uses eq', async () => {
    builder = makeBuilder({ data: { id: 's1' }, error: null });
    await getCurrentMembershipSubscription({ userId: 'u1', select: 'id, status' });
    expect(fromMock).toHaveBeenCalledWith('membership_subscriptions');
    expect(builder.select).toHaveBeenCalledWith('id, status');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'u1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'status', 'active');
    expect(builder.in).not.toHaveBeenCalled();
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(1);
    expect(builder.maybeSingle).toHaveBeenCalled();
  });

  it('getCurrentMembershipSubscription multiple statuses uses in', async () => {
    builder = makeBuilder({ data: null, error: null });
    await getCurrentMembershipSubscription({
      userId: 'u1',
      select: '*',
      statuses: ['active', 'past_due'],
    });
    expect(builder.in).toHaveBeenCalledWith('status', ['active', 'past_due']);
    expect(builder.eq).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('hasMembershipFeature calls exact RPC with args', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const res = await hasMembershipFeature({
      _user_id: 'u1',
      _feature_key: 'foo',
      _business_id: 'b1',
    });
    expect(rpcMock).toHaveBeenCalledWith('has_membership_feature', {
      _user_id: 'u1',
      _feature_key: 'foo',
      _business_id: 'b1',
    });
    expect(res.data).toBe(true);
  });

  it('hasMembershipFeature passes through error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    const res = await hasMembershipFeature({ _user_id: 'u', _feature_key: 'k' });
    expect(res.error).toEqual({ message: 'denied' });
  });

  it('getMembershipUsage calls exact RPC with args', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ metric: 'contracts' }], error: null });
    const res = await getMembershipUsage({ _user_id: 'u1', _business_id: 'b1' });
    expect(rpcMock).toHaveBeenCalledWith('get_membership_usage', {
      _user_id: 'u1',
      _business_id: 'b1',
    });
    expect(res.data).toEqual([{ metric: 'contracts' }]);
  });
});