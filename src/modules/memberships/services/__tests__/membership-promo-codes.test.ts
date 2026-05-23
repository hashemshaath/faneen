import { describe, it, expect, vi, beforeEach } from 'vitest';

type Op =
  | { kind: 'from'; table: string }
  | { kind: 'select'; arg: unknown }
  | { kind: 'order'; col: string; opts: unknown }
  | { kind: 'limit'; n: number };

let ops: Op[] = [];
let terminalResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeBuilder() {
  const b: Record<string, unknown> = {};
  const chain = (fn: (...a: unknown[]) => Op) => (...args: unknown[]) => {
    ops.push(fn(...args));
    return b;
  };
  b.select = chain((arg) => ({ kind: 'select', arg }));
  b.order = chain((col, opts) => ({ kind: 'order', col: String(col), opts }));
  b.limit = chain((n) => ({ kind: 'limit', n: Number(n) }));
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
  listMembershipPromoCodes,
  listMembershipPromoCodeAttempts,
} from '../promoCodes/reads';
import { redeemPromoCode } from '../promoCodes/mutations';

beforeEach(() => {
  ops = [];
  terminalResult = { data: null, error: null };
  rpcMock.mockReset();
});

describe('promoCodes/reads', () => {
  it('listMembershipPromoCodes preserves table/select/order', async () => {
    terminalResult = { data: [{ id: 'p1' }], error: null };
    const res = await listMembershipPromoCodes();
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_promo_codes' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, code, type, target_tier, duration_days, discount_percent, max_redemptions, used_count, valid_from, valid_until, is_active',
    });
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(res).toEqual({ data: [{ id: 'p1' }], error: null });
  });

  it('listMembershipPromoCodeAttempts preserves table/select/order/limit', async () => {
    terminalResult = { data: [], error: null };
    await listMembershipPromoCodeAttempts();
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_promo_code_attempts' });
    expect(ops[1]).toEqual({
      kind: 'select',
      arg: 'id, code, promo_code_id, user_id, success, rejection_reason, created_at',
    });
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[3]).toEqual({ kind: 'limit', n: 500 });
  });

  it('reads pass through { error } without throwing', async () => {
    terminalResult = { data: null, error: { message: 'boom' } };
    const res = await listMembershipPromoCodes();
    expect(res.error).toEqual({ message: 'boom' });
  });
});

describe('promoCodes/mutations', () => {
  it('redeemPromoCode calls exact RPC with exact args', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ success: true, message: 'ok', subscription_id: 's1' }],
      error: null,
    });
    const res = await redeemPromoCode({ _code: 'PROMO2026', _business_id: 'b1' });
    expect(rpcMock).toHaveBeenCalledWith('redeem_promo_code', {
      _code: 'PROMO2026',
      _business_id: 'b1',
    });
    expect(res).toEqual({
      data: [{ success: true, message: 'ok', subscription_id: 's1' }],
      error: null,
    });
  });

  it('redeemPromoCode passes through null _business_id', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await redeemPromoCode({ _code: 'X', _business_id: null });
    expect(rpcMock).toHaveBeenCalledWith('redeem_promo_code', { _code: 'X', _business_id: null });
  });

  it('redeemPromoCode passes through { error } without throwing', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'invalid_code' } });
    const res = await redeemPromoCode({ _code: 'BAD', _business_id: null });
    expect(res.error).toEqual({ message: 'invalid_code' });
  });

  it('redeemPromoCode bubbles thrown supabase errors', async () => {
    rpcMock.mockRejectedValueOnce(new Error('network'));
    await expect(redeemPromoCode({ _code: 'X', _business_id: null })).rejects.toThrow('network');
  });
});