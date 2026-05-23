import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  setBusinessMembershipTier,
  type AdminSetBusinessMembershipTierResult,
} from '../setBusinessMembershipTier';

const sampleResult: AdminSetBusinessMembershipTierResult = {
  business_id: 'biz-1',
  tier: 'premium',
  subscription_id: 'sub-new',
  previous_subscription_id: 'sub-old',
  changed: true,
};

beforeEach(() => {
  rpcMock.mockReset();
});

describe('setBusinessMembershipTier', () => {
  it('calls admin_set_business_membership_tier with exact payload', async () => {
    rpcMock.mockResolvedValueOnce({ data: sampleResult, error: null });
    const out = await setBusinessMembershipTier('biz-1', 'premium', 'r1');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('admin_set_business_membership_tier', {
      _business_id: 'biz-1',
      _tier: 'premium',
      _reason: 'r1',
    });
    expect(out).toEqual(sampleResult);
  });

  it('passes _reason: null when reason omitted', async () => {
    rpcMock.mockResolvedValueOnce({ data: sampleResult, error: null });
    await setBusinessMembershipTier('biz-2', 'basic');
    expect(rpcMock).toHaveBeenCalledWith('admin_set_business_membership_tier', {
      _business_id: 'biz-2',
      _tier: 'basic',
      _reason: null,
    });
  });

  it('throws on RPC error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    await expect(setBusinessMembershipTier('biz-3', 'free')).rejects.toMatchObject({
      message: 'denied',
    });
  });

  it('returns typed result', async () => {
    rpcMock.mockResolvedValueOnce({ data: sampleResult, error: null });
    const out = await setBusinessMembershipTier('biz-1', 'premium');
    expect(out.changed).toBe(true);
    expect(out.subscription_id).toBe('sub-new');
  });
});