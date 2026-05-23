// EDGE-2: Deno unit tests for shared server-side credits helpers.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  adminAdjustProviderCreditsServer,
  buildMonthlyGrantIdempotencyKey,
  buildRevealIdempotencyKey,
  debitProviderLeadCredit,
  getProviderCreditBalance,
  grantMonthlyProviderCredit,
  insertCreditLedgerTransaction,
} from './index.ts';

function makeAdmin() {
  const calls: any[] = [];
  const chain = {
    select(arg: string) { calls.push(['select', arg]); return chain; },
    eq(col: string, val: unknown) { calls.push(['eq', col, val]); return chain; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve({ data: null, error: null }); },
    insert(payload: unknown) { calls.push(['insert', payload]); return Promise.resolve({ data: null, error: null }); },
  };
  const admin = {
    from(table: string) { calls.push(['from', table]); return chain; },
    rpc(fn: string, args: unknown) { calls.push(['rpc', fn, args]); return Promise.resolve({ data: { ok: true }, error: null }); },
  };
  return { admin, calls };
}

Deno.test('debitProviderLeadCredit forwards exact RPC params', async () => {
  const { admin, calls } = makeAdmin();
  await debitProviderLeadCredit(admin, {
    businessId: 'b1', cost: 2, reason: 'reveal',
    quoteRequestLeadId: 'l1', createdBy: 'u1', idempotencyKey: 'reveal:l1:u1',
  });
  assertEquals(calls[0], ['rpc', 'consume_provider_lead_credit', {
    p_business_id: 'b1', p_cost: 2, p_reason: 'reveal',
    p_quote_request_lead_id: 'l1', p_created_by: 'u1', p_idempotency_key: 'reveal:l1:u1',
  }]);
});

Deno.test('debitProviderLeadCredit defaults optional fields to null', async () => {
  const { admin, calls } = makeAdmin();
  await debitProviderLeadCredit(admin, { businessId: 'b', cost: 1, reason: 'r' });
  assertEquals(calls[0][2], {
    p_business_id: 'b', p_cost: 1, p_reason: 'r',
    p_quote_request_lead_id: null, p_created_by: null, p_idempotency_key: null,
  });
});

Deno.test('grantMonthlyProviderCredit forwards exact RPC params', async () => {
  const { admin, calls } = makeAdmin();
  await grantMonthlyProviderCredit(admin, {
    subscriptionId: 's1', amount: 10,
    periodStart: '2026-05-01T00:00:00Z', periodEnd: '2026-06-01T00:00:00Z', planCode: 'pro',
  });
  assertEquals(calls[0], ['rpc', 'grant_monthly_provider_credit', {
    p_subscription_id: 's1', p_amount: 10,
    p_period_start: '2026-05-01T00:00:00Z', p_period_end: '2026-06-01T00:00:00Z', p_plan_code: 'pro',
  }]);
});

Deno.test('adminAdjustProviderCreditsServer forwards args verbatim', async () => {
  const { admin, calls } = makeAdmin();
  const args = {
    p_subscription_id: 's', p_action: 'grant' as const, p_amount: 3,
    p_reason: 'manual', p_note: null, p_quote_request_lead_id: null,
  };
  await adminAdjustProviderCreditsServer(admin, args);
  assertEquals(calls[0], ['rpc', 'admin_adjust_provider_credits', args]);
});

Deno.test('insertCreditLedgerTransaction inserts exact payload', async () => {
  const { admin, calls } = makeAdmin();
  const payload = {
    business_id: 'b', type: 'consume' as const, amount: 0, balance_after: 5,
    reason: 'launch_free_reveal',
  };
  await insertCreditLedgerTransaction(admin, payload);
  assertEquals(calls[0], ['from', 'provider_lead_credit_transactions']);
  assertEquals(calls[1], ['insert', payload]);
});

Deno.test('getProviderCreditBalance queries provider_subscriptions by business_id', async () => {
  const { admin, calls } = makeAdmin();
  await getProviderCreditBalance(admin, 'biz-1');
  assertEquals(calls[0], ['from', 'provider_subscriptions']);
  assertEquals(calls[1], ['select', 'id, business_id, provider_user_id, lead_credits_balance']);
  assertEquals(calls[2], ['eq', 'business_id', 'biz-1']);
  assertEquals(calls[3], ['maybeSingle']);
});

Deno.test('buildRevealIdempotencyKey is deterministic', () => {
  assertEquals(buildRevealIdempotencyKey({ leadId: 'L', userId: 'U' }), 'reveal:L:U');
});

Deno.test('buildMonthlyGrantIdempotencyKey uses UTC month', () => {
  assertEquals(
    buildMonthlyGrantIdempotencyKey({ subscriptionId: 'S', periodStart: '2026-01-01T00:30:00Z' }),
    'monthly:S:2026-01',
  );
  assertEquals(
    buildMonthlyGrantIdempotencyKey({ subscriptionId: 'S', periodStart: new Date('2026-12-31T23:59:59Z') }),
    'monthly:S:2026-12',
  );
});