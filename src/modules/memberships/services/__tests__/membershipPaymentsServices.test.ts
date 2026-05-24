import { describe, it, expect, vi, beforeEach } from 'vitest';

type Op =
  | { kind: 'from'; table: string }
  | { kind: 'select'; arg: unknown; opts?: unknown }
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'is'; col: string; val: unknown }
  | { kind: 'not'; col: string; op: string; val: unknown }
  | { kind: 'order'; col: string; opts: unknown }
  | { kind: 'limit'; n: number }
  | { kind: 'maybeSingle' }
  | { kind: 'insert'; payload: unknown }
  | { kind: 'update'; values: unknown }
  | { kind: 'invoke'; name: string; init: unknown };

let ops: Op[] = [];
let terminalResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeBuilder() {
  const b: Record<string, unknown> = {};
  const chain = (fn: (...a: unknown[]) => Op) => (...args: unknown[]) => {
    ops.push(fn(...args));
    return b;
  };
  b.select = chain((arg, opts) => ({ kind: 'select', arg, opts }));
  b.eq = chain((col, val) => ({ kind: 'eq', col: String(col), val }));
  b.is = chain((col, val) => ({ kind: 'is', col: String(col), val }));
  b.not = chain((col, op, val) => ({ kind: 'not', col: String(col), op: String(op), val }));
  b.order = chain((col, opts) => ({ kind: 'order', col: String(col), opts }));
  b.limit = chain((n) => ({ kind: 'limit', n: Number(n) }));
  b.insert = chain((payload) => ({ kind: 'insert', payload }));
  b.update = chain((values) => ({ kind: 'update', values }));
  b.maybeSingle = () => {
    ops.push({ kind: 'maybeSingle' });
    return Promise.resolve(terminalResult);
  };
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(terminalResult).then(resolve);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      ops.push({ kind: 'from', table });
      return makeBuilder();
    },
    functions: {
      invoke: (name: string, init: unknown) => {
        ops.push({ kind: 'invoke', name, init });
        return Promise.resolve({ data: null, error: null });
      },
    },
  },
}));

import {
  listMembershipPaymentIntents,
  getMembershipPaymentIntentById,
  createMembershipPaymentIntentRecord,
  updateMembershipPaymentIntentById,
} from '../payments/intents';
import {
  listMembershipPaymentWebhookEvents,
  createMembershipPaymentWebhookEventRecord,
} from '../payments/webhookEvents';
import {
  createMembershipPaymentIntent,
  confirmMembershipPayment,
  reconcileMembershipPaymentStatus,
} from '../payments/edge';
import { markMembershipPaidManually } from '../payments/manualMarkPaid';

beforeEach(() => {
  ops = [];
  terminalResult = { data: null, error: null };
});

describe('payments/intents', () => {
  it('listMembershipPaymentIntents applies filters/order/limit', async () => {
    terminalResult = { data: [{ id: 'i1' }], error: null };
    const res = await listMembershipPaymentIntents({
      subscriptionId: 's1',
      userId: 'u1',
      businessId: 'b1',
      status: 'created',
      limit: 50,
      order: { column: 'created_at', ascending: false },
    });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_payment_intents' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'subscription_id', val: 's1' });
    expect(ops[3]).toEqual({ kind: 'eq', col: 'user_id', val: 'u1' });
    expect(ops[4]).toEqual({ kind: 'eq', col: 'business_id', val: 'b1' });
    expect(ops[5]).toEqual({ kind: 'eq', col: 'status', val: 'created' });
    expect(ops[6]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[7]).toEqual({ kind: 'limit', n: 50 });
    expect(res).toEqual({ data: [{ id: 'i1' }], error: null });
  });

  it('listMembershipPaymentIntents defaults order to created_at desc', async () => {
    await listMembershipPaymentIntents({});
    expect(ops[2]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
  });

  it('getMembershipPaymentIntentById uses maybeSingle by id', async () => {
    terminalResult = { data: { id: 'i1' }, error: null };
    const res = await getMembershipPaymentIntentById('i1');
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_payment_intents' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'id', val: 'i1' });
    expect(ops[3]).toEqual({ kind: 'maybeSingle' });
    expect(res.data).toEqual({ id: 'i1' });
  });

  it('createMembershipPaymentIntentRecord inserts payload + select * maybeSingle', async () => {
    terminalResult = { data: { id: 'n1' }, error: null };
    const payload = {
      subscription_id: 's1',
      user_id: 'u1',
      provider: 'manual',
      status: 'created',
      amount: 100,
      currency: 'SAR',
      idempotency_key: 'mp-intent-x',
    } as never;
    await createMembershipPaymentIntentRecord(payload);
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_payment_intents' });
    expect(ops[1]).toEqual({ kind: 'insert', payload });
    expect(ops[2]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[3]).toEqual({ kind: 'maybeSingle' });
  });

  it('updateMembershipPaymentIntentById applies update/eq', async () => {
    const values = { status: 'succeeded' } as never;
    await updateMembershipPaymentIntentById({ id: 'i1', values });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_payment_intents' });
    expect(ops[1]).toEqual({ kind: 'update', values });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'id', val: 'i1' });
  });
});

describe('payments/webhookEvents', () => {
  it('listMembershipPaymentWebhookEvents applies provider/eventType/processed filters', async () => {
    terminalResult = { data: [], error: null };
    await listMembershipPaymentWebhookEvents({
      provider: 'stripe',
      eventType: 'invoice.paid',
      unprocessedOnly: true,
      limit: 25,
    });
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_payment_webhook_events' });
    expect(ops[1]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[2]).toEqual({ kind: 'eq', col: 'provider', val: 'stripe' });
    expect(ops[3]).toEqual({ kind: 'eq', col: 'event_type', val: 'invoice.paid' });
    expect(ops[4]).toEqual({ kind: 'is', col: 'processed_at', val: null });
    expect(ops[5]).toEqual({ kind: 'order', col: 'created_at', opts: { ascending: false } });
    expect(ops[6]).toEqual({ kind: 'limit', n: 25 });
  });

  it('listMembershipPaymentWebhookEvents processedOnly uses .not is null', async () => {
    await listMembershipPaymentWebhookEvents({ processedOnly: true });
    expect(ops.find((o) => o.kind === 'not')).toEqual({
      kind: 'not', col: 'processed_at', op: 'is', val: null,
    });
  });

  it('createMembershipPaymentWebhookEventRecord inserts payload', async () => {
    const payload = {
      provider: 'stripe',
      event_id: 'evt_1',
      event_type: 'invoice.paid',
      payload: {},
    } as never;
    await createMembershipPaymentWebhookEventRecord(payload);
    expect(ops[0]).toEqual({ kind: 'from', table: 'membership_payment_webhook_events' });
    expect(ops[1]).toEqual({ kind: 'insert', payload });
    expect(ops[2]).toEqual({ kind: 'select', arg: '*', opts: undefined });
    expect(ops[3]).toEqual({ kind: 'maybeSingle' });
  });
});

describe('payments/edge', () => {
  it('createMembershipPaymentIntent invokes correct edge fn + body', async () => {
    const body = {
      subscriptionId: 's1', planId: 'p1', userId: 'u1',
      provider: 'stripe' as const, billingCycle: 'monthly' as const,
      amount: 100, currency: 'SAR', idempotencyKey: 'mp-intent-x',
    };
    await createMembershipPaymentIntent(body);
    expect(ops[0]).toEqual({
      kind: 'invoke', name: 'membership-payment-create-intent', init: { body },
    });
  });

  it('confirmMembershipPayment invokes confirm edge fn', async () => {
    const body = { intentId: 'i1', provider: 'stripe' as const };
    await confirmMembershipPayment(body);
    expect(ops[0]).toEqual({
      kind: 'invoke', name: 'membership-payment-confirm', init: { body },
    });
  });

  it('reconcileMembershipPaymentStatus invokes reconcile edge fn', async () => {
    const body = { provider: 'stripe' as const, intentId: 'i1' };
    await reconcileMembershipPaymentStatus(body);
    expect(ops[0]).toEqual({
      kind: 'invoke', name: 'membership-payment-reconcile', init: { body },
    });
  });
});

describe('payments/manualMarkPaid', () => {
  it('throws not-implemented (RPC does not exist yet)', async () => {
    await expect(
      markMembershipPaidManually({ subscriptionId: 's1' }),
    ).rejects.toThrow(/admin_mark_membership_paid_manually is not implemented yet/);
  });
});