import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

type Op =
  | { kind: 'from'; table: string }
  | { kind: 'select'; arg: unknown }
  | { kind: 'in'; col: string; vals: unknown }
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'order'; col: string; opts?: unknown }
  | { kind: 'limit'; n: number };

let ops: Op[] = [];
let terminal: { data: unknown; error: unknown } = { data: [], error: null };

function makeBuilder() {
  const b: Record<string, unknown> = {};
  const chain = (fn: (...a: unknown[]) => Op) => (...args: unknown[]) => {
    ops.push(fn(...args));
    return b;
  };
  b.select = chain((arg) => ({ kind: 'select', arg }));
  b.in = chain((col, vals) => ({ kind: 'in', col: String(col), vals }));
  b.eq = chain((col, val) => ({ kind: 'eq', col: String(col), val }));
  b.order = chain((col, opts) => ({ kind: 'order', col: String(col), opts }));
  b.limit = (n: number) => {
    ops.push({ kind: 'limit', n: Number(n) });
    return Promise.resolve(terminal);
  };
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
  listProviderCreditTransactionsForBusinesses,
  listProviderCreditTransactionsForBusiness,
} from '../ledger/reads';

beforeEach(() => {
  ops = [];
  terminal = { data: [], error: null };
});

describe('listProviderCreditTransactionsForBusinesses', () => {
  it('uses default provider select, .in filter, desc order, limit 100', async () => {
    const ids = ['b1', 'b2'];
    const { data, error } = await listProviderCreditTransactionsForBusinesses({ businessIds: ids });
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(ops).toEqual([
      { kind: 'from', table: 'provider_lead_credit_transactions' },
      {
        kind: 'select',
        arg: 'id, type, amount, balance_after, reason, quote_request_lead_id, created_at',
      },
      { kind: 'in', col: 'business_id', vals: ids },
      { kind: 'order', col: 'created_at', opts: { ascending: false } },
      { kind: 'limit', n: 100 },
    ]);
  });

  it('honors custom select and limit', async () => {
    await listProviderCreditTransactionsForBusinesses({
      businessIds: ['x'],
      select: 'id',
      limit: 5,
    });
    expect(ops[1]).toEqual({ kind: 'select', arg: 'id' });
    expect(ops[4]).toEqual({ kind: 'limit', n: 5 });
  });
});

describe('listProviderCreditTransactionsForBusiness', () => {
  it('uses default admin select, .eq filter, desc order, limit 10', async () => {
    const { data, error } = await listProviderCreditTransactionsForBusiness({ businessId: 'b1' });
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(ops).toEqual([
      { kind: 'from', table: 'provider_lead_credit_transactions' },
      {
        kind: 'select',
        arg: 'id, type, amount, balance_after, reason, created_at, created_by, quote_request_lead_id',
      },
      { kind: 'eq', col: 'business_id', val: 'b1' },
      { kind: 'order', col: 'created_at', opts: { ascending: false } },
      { kind: 'limit', n: 10 },
    ]);
  });
});