// EDGE-4: Focused tests for the grant path of monthly-provider-credit-grant.
// Full Deno.serve handler isn't trivially invokable in isolation; we mirror the
// exact result-mapping branching the handler uses and verify shared-helper wiring.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildMonthlyGrantIdempotencyKey,
  grantMonthlyProviderCredit,
} from '../_shared/credits/index.ts';

function makeAdmin(rpcResponse: { data: unknown; error: unknown }) {
  const calls: any[] = [];
  const admin = {
    from() { throw new Error('handler must not touch tables directly in grant path'); },
    rpc(fn: string, args: unknown) { calls.push(['rpc', fn, args]); return Promise.resolve(rpcResponse); },
  };
  return { admin, calls };
}

Deno.test('grantMonthlyProviderCredit forwards exact handler-shaped input', async () => {
  const { admin, calls } = makeAdmin({ data: { ok: true, granted: true, balance_after: 50 }, error: null });
  const periodStart = '2026-05-23T10:00:00.000Z';
  const periodEnd = '2026-06-23T10:00:00.000Z';
  await grantMonthlyProviderCredit(admin, {
    subscriptionId: 'sub-1',
    amount: 50,
    periodStart,
    periodEnd,
    planCode: 'pro',
  });
  assertEquals(calls[0], ['rpc', 'grant_monthly_provider_credit', {
    p_subscription_id: 'sub-1',
    p_amount: 50,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_plan_code: 'pro',
  }]);
});

// Mirrors the handler's exact mapping logic.
function mapGrantResult(
  resp: { data: { ok?: boolean; granted?: boolean; idempotent?: boolean; code?: string } | null; error: unknown },
): { granted: number; skipped: number; error?: string } {
  let granted = 0, skipped = 0;
  try {
    if (resp.error) throw new Error((resp.error as { message?: string }).message ?? 'err');
    const g = resp.data ?? {};
    if (g.ok === false) throw new Error(g.code ?? 'grant_failed');
    if (g.granted === true) granted++; else skipped++;
  } catch (e) {
    return { granted, skipped, error: e instanceof Error ? e.message : String(e) };
  }
  return { granted, skipped };
}

Deno.test('ok:true granted:true increments granted', () => {
  assertEquals(
    mapGrantResult({ data: { ok: true, granted: true }, error: null }),
    { granted: 1, skipped: 0 },
  );
});

Deno.test('ok:true granted:false idempotent:true increments skipped', () => {
  assertEquals(
    mapGrantResult({ data: { ok: true, granted: false, idempotent: true }, error: null }),
    { granted: 0, skipped: 1 },
  );
});

Deno.test('ok:false bubbles code into errors array', () => {
  assertEquals(
    mapGrantResult({ data: { ok: false, code: 'subscription_not_found' }, error: null }),
    { granted: 0, skipped: 0, error: 'subscription_not_found' },
  );
});

Deno.test('rpc error bubbles message into errors array', () => {
  assertEquals(
    mapGrantResult({ data: null, error: { message: 'boom' } }),
    { granted: 0, skipped: 0, error: 'boom' },
  );
});

Deno.test('idempotency key format matches RPC: monthly:<sub>:YYYY-MM UTC', () => {
  assertEquals(
    buildMonthlyGrantIdempotencyKey({ subscriptionId: 'sub-1', periodStart: '2026-05-23T10:00:00Z' }),
    'monthly:sub-1:2026-05',
  );
});

Deno.test('handler no longer probes provider_lead_credit_transactions directly', async () => {
  // Read the source and assert the table reference is gone.
  const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url));
  assertEquals(src.includes('provider_lead_credit_transactions'), false);
  // provider_subscriptions update must also be gone (only the initial select remains).
  assertEquals(/\.from\(['"]provider_subscriptions['"]\)[\s\S]*?\.update\(/.test(src), false);
});