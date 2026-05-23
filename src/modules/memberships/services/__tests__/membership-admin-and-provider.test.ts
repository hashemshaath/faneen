import { describe, it, expect, vi, beforeEach } from 'vitest';

type Op =
  | { kind: 'from'; table: string }
  | { kind: 'select'; arg: unknown; opts?: unknown }
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'order'; col: string; opts?: unknown }
  | { kind: 'limit'; n: number }
  | { kind: 'maybeSingle' }
  | { kind: 'update'; values: unknown }
  | { kind: 'insert'; values: unknown };

let ops: Op[] = [];
let terminalResult: { data: unknown; error: unknown; count?: number | null } = {
  data: null,
  error: null,
};

function makeBuilder() {
  const b: Record<string, unknown> = {};
  const chain = (fn: (...a: unknown[]) => Op) => (...args: unknown[]) => {
    ops.push(fn(...args));
    return b;
  };
  b.select = chain((arg, opts) => ({ kind: 'select', arg, opts }));
  b.eq = chain((col, val) => ({ kind: 'eq', col: String(col), val }));
  b.order = chain((col, opts) => ({ kind: 'order', col: String(col), opts }));
  b.limit = chain((n) => ({ kind: 'limit', n: Number(n) }));
  b.update = chain((values) => ({ kind: 'update', values }));
  b.insert = chain((values) => ({ kind: 'insert', values }));
  b.maybeSingle = () => {
    ops.push({ kind: 'maybeSingle' });
    return Promise.resolve(terminalResult);
  };
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminalResult).then(resolve);
  return b;
}

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      ops.push({ kind: 'from', table });
      return makeBuilder();
    },
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  },
}));

import {
  listAdminMembershipPlans,
} from '../plans/reads';
import {
  insertMembershipPlan,
  updateMembershipPlanById,
} from '../plans/mutations';
import {
  listAdminMembershipSubscriptions,
  countActiveMembershipSubscriptions,
  adminListMembershipUsage,
} from '../subscriptions/reads';
import {
  listProviderPlans,
  listProviderSubscriptions,
  listProviderSubscriptionsForCurrentUser,
  getProviderSubscriptionForBusiness,
} from '../providerSubscriptions/reads';
import {
  updateProviderSubscriptionById,
  adminAdjustProviderCredits,
} from '../providerSubscriptions/mutations';

beforeEach(() => {
  ops = [];
  terminalResult = { data: null, error: null };
  rpcMock.mockReset();
});

describe('MEMB-7 plans/reads', () => {
  it('listAdminMembershipPlans preserves table/select/order', async () => {
    terminalResult = { data: [{ id: 'p' }], error: null };
    await listAdminMembershipPlans();
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_plans' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'order', col: 'sort_order', opts: undefined });
  });
});

describe('MEMB-7 plans/mutations', () => {
  it('insertMembershipPlan uses table + insert with payload verbatim', async () => {
    const payload = { tier: 'free', name_ar: 'A', name_en: 'B' } as never;
    await insertMembershipPlan(payload);
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_plans' });
    expect(ops[1]).toEqual({ kind: 'insert', values: payload });
  });

  it('updateMembershipPlanById filters by id with values verbatim', async () => {
    await updateMembershipPlanById({ id: 'pid', values: { name_ar: 'X' } as never });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_plans' });
    expect(ops[1]).toEqual({ kind: 'update', values: { name_ar: 'X' } });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'id', val: 'pid' });
  });
});

describe('MEMB-7 subscriptions/reads (admin)', () => {
  it('listAdminMembershipSubscriptions preserves join select / order / limit', async () => {
    await listAdminMembershipSubscriptions();
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_subscriptions' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: '*, plan:membership_plans!plan_id(name_ar, name_en, tier)',
      opts: undefined,
    });
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[3]).toEqual({ kind: 'limit', n: 500 });
  });

  it('countActiveMembershipSubscriptions uses head count + eq status active', async () => {
    await countActiveMembershipSubscriptions();
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_subscriptions' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id',
      opts: { count: 'exact', head: true },
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'status', val: 'active' });
  });

  it('adminListMembershipUsage calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await adminListMembershipUsage({ _only_over_or_near: true, _limit: 500 });
    expect(rpcMock).toHaveBeenCalledWith('admin_list_membership_usage', {
      _only_over_or_near: true,
      _limit: 500,
    });
  });
});

describe('MEMB-7 providerSubscriptions/reads', () => {
  it('listProviderPlans preserves default select + is_active filter', async () => {
    await listProviderPlans();
    expect(ops[0]).toEqual({ kind: 'from', table: 'provider_plans' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, code, name_ar, lead_credits_per_month',
      opts: undefined,
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'is_active', val: true });
  });

  it('listProviderSubscriptions preserves join select / order / limit', async () => {
    await listProviderSubscriptions();
    expect(ops[0]).toEqual({ kind: 'from', table: 'provider_subscriptions' });
    expect((ops[1] as { kind: 'select'; arg: string }).arg).toContain(
      'plan:provider_plans(id, code, name_ar, lead_credits_per_month)',
    );
    expect((ops[1] as { kind: 'select'; arg: string }).arg).toContain(
      'business:businesses!provider_subscriptions_business_id_fkey(id, name_ar, user_id)',
    );
    expect(ops[2]).toEqual({ kind: 'order', col: 'updated_at', opts: { ascending: false } });
    expect(ops[3]).toEqual({ kind: 'limit', n: 500 });
  });

  it('listProviderSubscriptionsForCurrentUser preserves provider-side select + order', async () => {
    await listProviderSubscriptionsForCurrentUser();
    expect(ops[0]).toEqual({ kind: 'from', table: 'provider_subscriptions' });
    expect((ops[1] as { kind: 'select'; arg: string }).arg).toContain(
      'plan:provider_plans(code, name_ar, description_ar, lead_credits_per_month, monthly_price)',
    );
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
  });

  it('getProviderSubscriptionForBusiness filters by business_id with maybeSingle', async () => {
    await getProviderSubscriptionForBusiness({ businessId: 'b1' });
    expect(ops[0]).toEqual({ kind: 'from', table: 'provider_subscriptions' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'lead_credits_balance, status, plan:provider_plans(name_ar, lead_credits_per_month)',
      opts: undefined,
    });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'business_id', val: 'b1' });
    expect(ops[3]).toEqual({ kind: 'maybeSingle' });
  });
});

describe('MEMB-7 providerSubscriptions/mutations', () => {
  it('updateProviderSubscriptionById filters by id with values verbatim', async () => {
    await updateProviderSubscriptionById({
      id: 'sub1',
      values: { plan_id: 'p2', status: 'paused' } as never,
    });
    expect(ops[0]).toEqual({ kind: 'from', table: 'provider_subscriptions' });
    expect(ops[1]).toEqual({ kind: 'update', values: { plan_id: 'p2', status: 'paused' } });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'id', val: 'sub1' });
  });

  it('adminAdjustProviderCredits calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const args = {
      p_subscription_id: 's1',
      p_action: 'grant' as const,
      p_amount: 5,
      p_reason: 'admin_manual_grant',
      p_note: 'note',
      p_quote_request_lead_id: null,
    };
    const res = await adminAdjustProviderCredits(args);
    expect(rpcMock).toHaveBeenCalledWith('admin_adjust_provider_credits', args);
    expect(res).toEqual({ data: { ok: true }, error: null });
  });

  it('mutations bubble thrown supabase errors', async () => {
    rpcMock.mockRejectedValueOnce(new Error('network'));
    await expect(
      adminAdjustProviderCredits({
        p_subscription_id: 's',
        p_action: 'refund',
        p_amount: 1,
        p_reason: 'r',
        p_note: null,
        p_quote_request_lead_id: null,
      }),
    ).rejects.toThrow('network');
  });
});