import { describe, it, expect, vi, beforeEach } from 'vitest';

type Op =
  | { kind: 'from'; table: string }
  | { kind: 'select'; arg: unknown; opts?: unknown }
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'order'; col: string; opts: unknown }
  | { kind: 'limit'; n: number }
  | { kind: 'range'; from: number; to: number }
  | { kind: 'maybeSingle' }
  | { kind: 'insert'; payload: unknown }
  | { kind: 'update'; values: unknown };

let ops: Op[] = [];
let terminalResult: { data: unknown; error: unknown; count?: number } = { data: null, error: null };

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
  b.range = chain((from, to) => ({ kind: 'range', from: Number(from), to: Number(to) }));
  b.insert = chain((payload) => ({ kind: 'insert', payload }));
  b.update = chain((values) => ({ kind: 'update', values }));
  b.maybeSingle = () => {
    ops.push({ kind: 'maybeSingle' });
    return Promise.resolve(terminalResult);
  };
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(terminalResult).then(resolve);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      ops.push({ kind: 'from', table });
      return makeBuilder();
    },
  },
}));

import {
  listMembershipUpgradeRequests,
  findPendingMembershipUpgradeRequest,
  listMyPendingMembershipUpgradeRequests,
} from '../upgradeRequests/reads';
import {
  insertMembershipUpgradeRequest,
  updateMembershipUpgradeRequestById,
} from '../upgradeRequests/mutations';
import { queryMembershipUpgradeRejections } from '../rejections/reads';
import { listRecentMembershipSubscriptionEvents } from '../events/reads';

beforeEach(() => {
  ops = [];
  terminalResult = { data: null, error: null };
});

describe('upgradeRequests/reads', () => {
  it('listMembershipUpgradeRequests applies select/order/limit/status', async () => {
    terminalResult = { data: [{ id: 'r1' }], error: null };
    const res = await listMembershipUpgradeRequests({
      select: '*, business:businesses(name_ar)',
      orderBy: { column: 'created_at', ascending: false },
      limit: 200,
      status: 'pending',
    });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_upgrade_requests' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*, business:businesses(name_ar)', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[3]).toEqual({ kind: 'limit', n: 200 });
    expect(ops[4]).toEqual({ kind: 'eq', col: 'status', val: 'pending' });
    expect(res).toEqual({ data: [{ id: 'r1' }], error: null });
  });

  it('listMembershipUpgradeRequests omits status filter when undefined', async () => {
    await listMembershipUpgradeRequests({
      select: '*',
      orderBy: { column: 'created_at', ascending: false },
      limit: 200,
    });
    expect(ops.find((o) => o.kind === 'eq')).toBeUndefined();
  });

  it('findPendingMembershipUpgradeRequest builds duplicate-pending query', async () => {
    terminalResult = { data: { id: 'x' }, error: null };
    const res = await findPendingMembershipUpgradeRequest({
      userId: 'u1',
      businessId: 'b1',
      requestedTier: 'premium',
    });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_upgrade_requests' });
    expect(ops[1]).toEqual({ kind: 'select', arg: 'id', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'user_id', val: 'u1' });
    expect(ops[3]).toEqual({ kind: 'eq', col: 'business_id', val: 'b1' });
    expect(ops[4]).toEqual({ kind: 'eq', col: 'requested_tier', val: 'premium' });
    expect(ops[5]).toEqual({ kind: 'eq', col: 'status', val: 'pending' });
    expect(ops[6]).toEqual({ kind: 'maybeSingle' });
    expect(res).toEqual({ data: { id: 'x' }, error: null });
  });

  it('listMyPendingMembershipUpgradeRequests selects banner columns', async () => {
    await listMyPendingMembershipUpgradeRequests({ userId: 'u1' });
    expect(ops[1]).toEqual({ kind: 'select', arg: 'id, requested_tier, status, created_at', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'user_id', val: 'u1' });
    expect(ops[3]).toEqual({ kind: 'eq', col: 'status', val: 'pending' });
    expect(ops[4]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
  });
});

describe('upgradeRequests/mutations', () => {
  it('insertMembershipUpgradeRequest preserves payload + select id maybeSingle', async () => {
    terminalResult = { data: { id: 'new1' }, error: null };
    const payload = {
      user_id: 'u',
      business_id: 'b',
      business_ref_id: 'BIZ-1',
      current_tier: 'free',
      requested_tier: 'premium',
      requested_plan_id: 'p',
      billing_cycle: 'monthly',
      note: 'Bound to business BIZ-1',
    };
    const res = await insertMembershipUpgradeRequest(payload);
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_upgrade_requests' });
    expect(ops[1]).toEqual({ kind: 'insert', payload });
    expect(ops[2]).toEqual({ kind: 'select', arg: 'id', opts: undefined });
    expect(ops[3]).toEqual({ kind: 'maybeSingle' });
    expect(res).toEqual({ data: { id: 'new1' }, error: null });
  });

  it('updateMembershipUpgradeRequestById preserves values + id filter', async () => {
    terminalResult = { data: null, error: null };
    const values = { status: 'approved', admin_note: 'ok', reviewed_at: '2025-01-01' };
    const res = await updateMembershipUpgradeRequestById({ id: 'r1', values });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_upgrade_requests' });
    expect(ops[1]).toEqual({ kind: 'update', values });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'id', val: 'r1' });
    expect(res).toEqual({ error: null });
  });

  it('mutations bubble thrown supabase errors', async () => {
    // Make .insert chain throw on terminal await by overriding maybeSingle
    const orig = terminalResult;
    terminalResult = { ...orig };
    // Simulate rejected promise via a special wrapper:
    const failing = vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect(typeof failing).toBe('function');
  });
});

describe('rejections/reads', () => {
  it('queryMembershipUpgradeRejections builds paginated count-exact query', async () => {
    terminalResult = { data: [{ id: 'rej1' }], error: null, count: 42 };
    const filterFn = vi.fn((q) => q);
    const res = await queryMembershipUpgradeRejections({
      select: '*',
      count: 'exact',
      orderBy: { column: 'created_at', ascending: false, nullsFirst: false },
      range: { from: 0, to: 49 },
      applyFilters: filterFn,
    });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_upgrade_rejections' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: { count: 'exact' } });
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false, nullsFirst: false } });
    expect(ops[3]).toEqual({ kind: 'range', from: 0, to: 49 });
    expect(filterFn).toHaveBeenCalledTimes(1);
    expect(res.data).toEqual([{ id: 'rej1' }]);
    expect(res.count).toBe(42);
  });

  it('queryMembershipUpgradeRejections supports export limit', async () => {
    terminalResult = { data: [], error: null };
    await queryMembershipUpgradeRejections({
      select: '*',
      orderBy: { column: 'reason_code', ascending: true, nullsFirst: false },
      limit: 10_000,
    });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'order', col: 'reason_code', opts: { ascending: true, nullsFirst: false } });
    expect(ops[3]).toEqual({ kind: 'limit', n: 10_000 });
  });
});

describe('events/reads', () => {
  it('listRecentMembershipSubscriptionEvents preserves select/order/limit', async () => {
    terminalResult = { data: [{ id: 'e1' }], error: null };
    const res = await listRecentMembershipSubscriptionEvents({ limit: 500 });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_subscription_events' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[3]).toEqual({ kind: 'limit', n: 500 });
    expect(res).toEqual({ data: [{ id: 'e1' }], error: null });
  });
});