/**
 * SERVICE-ACTIVATION-GOVERNANCE-4 — Phase E.2
 *
 * `notifyMembershipChangeForBusiness` should send EXACTLY one summary
 * notification when the new tier gates any services, and no notification
 * when nothing is affected.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/notifications', async () => {
  const actual = await vi.importActual<typeof import('../services/notifications')>('../services/notifications');
  return { ...actual, notifyServiceActivationEvent: vi.fn() };
});

let services: Array<{ id: string; required_plan_tier: string | null }> = [];
let owner: string | null = 'owner-1';

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const chain = () => b as unknown;
    b.select = vi.fn(chain);
    b.eq = vi.fn(chain);
    b.not = vi.fn(chain);
    b.maybeSingle = vi.fn(async () =>
      table === 'businesses' ? { data: { user_id: owner }, error: null } : { data: null, error: null },
    );
    b.then = (cb: (v: unknown) => unknown) =>
      Promise.resolve(
        table === 'business_services'
          ? { data: services, error: null }
          : { data: [], error: null },
      ).then(cb);
    return b;
  };
  return {
    supabase: {
      from: vi.fn((t: string) => builder(t)),
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'admin' } } })) },
    },
  };
});

import { notifyMembershipChangeForBusiness } from '../services/admin';
import { notifyServiceActivationEvent } from '../services/notifications';
const notifySpy = notifyServiceActivationEvent as unknown as ReturnType<typeof vi.fn>;

describe('notifyMembershipChangeForBusiness', () => {
  beforeEach(() => {
    notifySpy.mockReset();
    owner = 'owner-1';
    services = [];
  });

  it('sends exactly one summary notification when services are gated by new tier', async () => {
    services = [
      { id: 's1', required_plan_tier: 'premium' },
      { id: 's2', required_plan_tier: 'enterprise' },
    ];
    await notifyMembershipChangeForBusiness('biz-1', 'basic');
    expect(notifySpy).toHaveBeenCalledTimes(1);
    const arg = notifySpy.mock.calls[0][0];
    expect(arg.event).toBe('membership_change_affected_services');
    expect(arg.user_id).toBe('owner-1');
    expect(arg.business_id).toBe('biz-1');
  });

  it('does not notify when no services are affected', async () => {
    services = [{ id: 's1', required_plan_tier: 'basic' }];
    await notifyMembershipChangeForBusiness('biz-1', 'premium');
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('does not notify when business has no owner', async () => {
    owner = null;
    services = [{ id: 's1', required_plan_tier: 'enterprise' }];
    await notifyMembershipChangeForBusiness('biz-1', 'free');
    expect(notifySpy).not.toHaveBeenCalled();
  });
});