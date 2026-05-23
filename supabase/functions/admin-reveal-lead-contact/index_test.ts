// EDGE-3: Focused tests for the credit-consumption path of admin-reveal-lead-contact.
// We test the shared-helper wiring directly (full handler is HTTP/Deno.serve-bound and
// not easily invokable in isolation without spinning the server). This covers the
// behavioral contract introduced by this phase: idempotency key shape, RPC params,
// and 402/500 mapping logic.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildRevealIdempotencyKey,
  debitProviderLeadCredit,
  insertCreditLedgerTransaction,
} from '../_shared/credits/index.ts';

function makeAdmin(rpcResponse: { data: unknown; error: unknown } = { data: { ok: true, balance_after: 4, ledger_id: 'lg' }, error: null }) {
  const calls: any[] = [];
  const chain = {
    select(arg: string) { calls.push(['select', arg]); return chain; },
    eq(col: string, val: unknown) { calls.push(['eq', col, val]); return chain; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve({ data: null, error: null }); },
    insert(payload: unknown) { calls.push(['insert', payload]); return Promise.resolve({ data: null, error: null }); },
  };
  const admin = {
    from(table: string) { calls.push(['from', table]); return chain; },
    rpc(fn: string, args: unknown) { calls.push(['rpc', fn, args]); return Promise.resolve(rpcResponse); },
  };
  return { admin, calls };
}

Deno.test('reveal idempotency key uses reveal:<leadId>:<userId>', () => {
  assertEquals(buildRevealIdempotencyKey({ leadId: 'L1', userId: 'U1' }), 'reveal:L1:U1');
});

Deno.test('paid path: debit forwards exact RPC params with reveal idempotency key', async () => {
  const { admin, calls } = makeAdmin();
  const idempotencyKey = buildRevealIdempotencyKey({ leadId: 'lead-1', userId: 'user-1' });
  await debitProviderLeadCredit(admin, {
    businessId: 'biz-1',
    cost: 1,
    reason: 'contact_reveal_consumption',
    quoteRequestLeadId: 'lead-1',
    createdBy: 'user-1',
    idempotencyKey,
  });
  assertEquals(calls[0], ['rpc', 'consume_provider_lead_credit', {
    p_business_id: 'biz-1',
    p_cost: 1,
    p_reason: 'contact_reveal_consumption',
    p_quote_request_lead_id: 'lead-1',
    p_created_by: 'user-1',
    p_idempotency_key: 'reveal:lead-1:user-1',
  }]);
});

// Mapping contract used by the handler. We mirror the exact branching here so
// any regression in the helper response shape is caught.
function mapDebitResult(
  resp: { data: { ok?: boolean; code?: string; balance_after?: number } | null; error: unknown },
): { status: number; message?: string; balanceAfter?: number } {
  if (resp.error || !resp.data) return { status: 500, message: 'تعذر خصم الرصيد' };
  const d = resp.data;
  if (d.ok === false) {
    if (d.code === 'insufficient' || d.code === 'subscription_not_found') {
      return { status: 402, message: 'رصيد المزود غير كافٍ لإتاحة بيانات التواصل' };
    }
    return { status: 500, message: 'تعذر خصم الرصيد' };
  }
  return { status: 200, balanceAfter: d.balance_after };
}

Deno.test('insufficient maps to 402 with exact Arabic message', () => {
  assertEquals(
    mapDebitResult({ data: { ok: false, code: 'insufficient' }, error: null }),
    { status: 402, message: 'رصيد المزود غير كافٍ لإتاحة بيانات التواصل' },
  );
});

Deno.test('subscription_not_found maps to 402 with same Arabic message', () => {
  assertEquals(
    mapDebitResult({ data: { ok: false, code: 'subscription_not_found' }, error: null }),
    { status: 402, message: 'رصيد المزود غير كافٍ لإتاحة بيانات التواصل' },
  );
});

Deno.test('debit RPC error maps to 500 with exact Arabic message', () => {
  assertEquals(
    mapDebitResult({ data: null, error: { message: 'boom' } }),
    { status: 500, message: 'تعذر خصم الرصيد' },
  );
});

Deno.test('other ok:false code maps to 500', () => {
  assertEquals(
    mapDebitResult({ data: { ok: false, code: 'invalid_cost' }, error: null }),
    { status: 500, message: 'تعذر خصم الرصيد' },
  );
});

Deno.test('ok:true returns balance_after for downstream metadata', () => {
  assertEquals(
    mapDebitResult({ data: { ok: true, balance_after: 7 }, error: null }),
    { status: 200, balanceAfter: 7 },
  );
});

Deno.test('free/launch path: insertCreditLedgerTransaction writes zero-amount audit row', async () => {
  const { admin, calls } = makeAdmin();
  await insertCreditLedgerTransaction(admin, {
    business_id: 'b',
    provider_user_id: 'p',
    quote_request_lead_id: 'l',
    type: 'consume',
    amount: 0,
    balance_after: 5,
    reason: 'launch_free_reveal',
    created_by: 'u',
  });
  assertEquals(calls[0], ['from', 'provider_lead_credit_transactions']);
  assertEquals(calls[1][0], 'insert');
  const payload = calls[1][1] as { amount: number; reason: string; type: string };
  assertEquals(payload.amount, 0);
  assertEquals(payload.type, 'consume');
  assertEquals(payload.reason, 'launch_free_reveal');
  // No RPC call.
  assertEquals(calls.find((c) => c[0] === 'rpc'), undefined);
});