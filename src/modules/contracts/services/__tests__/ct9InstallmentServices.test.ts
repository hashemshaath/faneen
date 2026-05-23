import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-9 — Service-level unit tests for the runtime installment wrappers.
 * Verifies exact table names, select strings, filters, ordering, and
 * update payloads.
 */

function makeChain() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const target = { __calls: calls } as Record<string, unknown> & { __calls: typeof calls };
  const handler: ProxyHandler<typeof target> = {
    get(_t, prop: string) {
      if (prop === '__calls') return calls;
      if (prop === 'then') return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return new Proxy(target, handler);
      };
    },
  };
  return new Proxy(target, handler);
}

const chain = makeChain();
const fromMock = vi.fn((..._args: unknown[]) => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [unknown])) },
}));

import {
  listInstallmentPlansWithPaymentsForContracts,
  listOverdueInstallmentPayments,
  markInstallmentPaymentPaid,
} from '../installments';

beforeEach(() => {
  fromMock.mockClear();
  (chain as { __calls: unknown[] }).__calls.length = 0;
});

const callsOf = () => (chain as { __calls: { method: string; args: unknown[] }[] }).__calls;

describe('CT-9 installment service wrappers', () => {
  it('listInstallmentPlansWithPaymentsForContracts: joined select + in + order created_at desc', async () => {
    await listInstallmentPlansWithPaymentsForContracts(['c1', 'c2']);
    expect(fromMock).toHaveBeenCalledWith('installment_plans');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*, installment_payments(*)'] },
      { method: 'in', args: ['contract_id', ['c1', 'c2']] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
  });

  it('listOverdueInstallmentPayments: select id,plan_id + eq status + lt due_date + limit', async () => {
    await listOverdueInstallmentPayments('2026-05-23', 10);
    expect(fromMock).toHaveBeenCalledWith('installment_payments');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['id, plan_id'] },
      { method: 'eq', args: ['status', 'pending'] },
      { method: 'lt', args: ['due_date', '2026-05-23'] },
      { method: 'limit', args: [10] },
    ]);
  });

  it('listOverdueInstallmentPayments defaults limit to 10', async () => {
    await listOverdueInstallmentPayments('2026-05-23');
    expect(callsOf().at(-1)).toEqual({ method: 'limit', args: [10] });
  });

  it('markInstallmentPaymentPaid: update status=paid + paid_at + eq id', async () => {
    await markInstallmentPaymentPaid('pay-1');
    expect(fromMock).toHaveBeenCalledWith('installment_payments');
    const calls = callsOf();
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('update');
    const payload = calls[0].args[0] as { status: string; paid_at: string };
    expect(payload.status).toBe('paid');
    expect(typeof payload.paid_at).toBe('string');
    expect(calls[1]).toEqual({ method: 'eq', args: ['id', 'pay-1'] });
  });
});