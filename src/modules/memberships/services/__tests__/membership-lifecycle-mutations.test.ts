import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (name: string, args: unknown) => rpcMock(name, args) },
}));

import {
  subscribeToPlan,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscriptionRenewal,
  cancelSubscription,
  adminUpgradeSubscription,
} from '../subscriptions/mutations';

beforeEach(() => rpcMock.mockReset());

describe('membership lifecycle wrappers (MEMB-3)', () => {
  it('subscribeToPlan calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const args = { _user_id: 'u', _plan_id: 'p', _business_id: 'b', _billing_cycle: 'monthly' };
    const res = await subscribeToPlan(args);
    expect(rpcMock).toHaveBeenCalledWith('subscribe_to_plan', args);
    expect(res).toEqual({ data: null, error: null });
  });

  it('subscribeToPlan supports null business id', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await subscribeToPlan({ _user_id: 'u', _plan_id: 'p', _business_id: null, _billing_cycle: 'yearly' });
    expect(rpcMock).toHaveBeenCalledWith('subscribe_to_plan', {
      _user_id: 'u', _plan_id: 'p', _business_id: null, _billing_cycle: 'yearly',
    });
  });

  it('cancelSubscriptionAtPeriodEnd calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const args = { _subscription_id: 's1', _downgrade_to_plan_id: 'p2' };
    await cancelSubscriptionAtPeriodEnd(args);
    expect(rpcMock).toHaveBeenCalledWith('cancel_subscription_at_period_end', args);
  });

  it('cancelSubscriptionAtPeriodEnd accepts null downgrade', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await cancelSubscriptionAtPeriodEnd({ _subscription_id: 's1', _downgrade_to_plan_id: null });
    expect(rpcMock).toHaveBeenCalledWith('cancel_subscription_at_period_end', {
      _subscription_id: 's1', _downgrade_to_plan_id: null,
    });
  });

  it('resumeSubscriptionRenewal calls exact RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await resumeSubscriptionRenewal({ _subscription_id: 's1' });
    expect(rpcMock).toHaveBeenCalledWith('resume_subscription_renewal', { _subscription_id: 's1' });
  });

  it('cancelSubscription calls exact RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await cancelSubscription({ _subscription_id: 's1' });
    expect(rpcMock).toHaveBeenCalledWith('cancel_subscription', { _subscription_id: 's1' });
  });

  it('adminUpgradeSubscription calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const args = { _subscription_id: 's1', _new_plan_id: 'p9', _billing_cycle: 'monthly' };
    await adminUpgradeSubscription(args);
    expect(rpcMock).toHaveBeenCalledWith('admin_upgrade_subscription', args);
  });

  it('wrappers pass through { error } without throwing', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await resumeSubscriptionRenewal({ _subscription_id: 'x' });
    expect(res.error).toEqual({ message: 'boom' });
  });

  it('wrappers bubble thrown supabase errors', async () => {
    rpcMock.mockRejectedValueOnce(new Error('network'));
    await expect(cancelSubscription({ _subscription_id: 'x' })).rejects.toThrow('network');
  });
});