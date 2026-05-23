// R4F-5: source-level guardrail tests for membership-lifecycle-dispatcher.
//
// These are Deno-runtime tests that assert the function source contains
// the required templates, idempotency-key patterns, auth gates, and
// fail-soft behavior. Full integration tests would require deploying
// the function and seeding the database; the source-level checks lock the
// behavior contract so accidental regressions are caught in CI.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SRC = await Deno.readTextFile(new URL('./index.ts', import.meta.url));

Deno.test('R4F-5: dispatcher requires auth (cron secret, service key, or admin)', () => {
  assert(SRC.includes("CRON_SECRET"));
  assert(SRC.includes("x-cron-secret"));
  assert(SRC.includes("has_admin_access"));
  assert(SRC.includes("'unauthorized'"));
});

Deno.test('R4F-5: dispatcher wires every required lifecycle template', () => {
  for (const tpl of [
    'membership-subscription-expired',
    'membership-renewal-reminder',
    'membership-renewal-failed',
    'membership-promo-redeemed',
  ]) {
    assert(SRC.includes(tpl), `missing template wiring: ${tpl}`);
  }
});

Deno.test('R4F-5: dispatcher uses deterministic idempotency keys', () => {
  assert(SRC.includes('membership-expired-'));
  assert(SRC.includes('membership-renewal-failed-'));
  assert(SRC.includes('membership-renewal-reminder-'));
  assert(SRC.includes('membership-promo-redeemed-'));
});

Deno.test('R4F-5: dispatcher reads notifications and dedups via email_send_log metadata', () => {
  assert(SRC.includes(".from('notifications')"));
  assert(SRC.includes("metadata->>dispatch_key"));
  assert(SRC.includes("email_send_log"));
});

Deno.test('R4F-5: dispatcher is fail-soft (try/catch per row, never throws out)', () => {
  // At minimum: a try/catch inside both processing loops and counters for failed.
  const tryCount = (SRC.match(/try \{/g) ?? []).length;
  assert(tryCount >= 3, `expected ≥3 try blocks, got ${tryCount}`);
  assert(SRC.includes('failed++'));
  assert(SRC.includes("status: 'failed'"));
});

Deno.test('R4F-5: dispatcher returns required JSON summary shape', () => {
  for (const key of ['success', 'processed', 'sent', 'skipped', 'failed', 'details']) {
    assert(SRC.includes(key), `missing summary key: ${key}`);
  }
});

Deno.test('R4F-5: dispatcher does not directly use guarded membership tables in index.ts', () => {
  // Direct queries must go through _shared/memberships/lifecycleEmailData.ts
  assert(!/\.from\(\s*['"]membership_subscriptions['"]/.test(SRC));
  assert(!/\.from\(\s*['"]membership_plans['"]/.test(SRC));
  assert(!/\.from\(\s*['"]membership_promo_codes['"]/.test(SRC));
  assert(SRC.includes("_shared/memberships/lifecycleEmailData"));
});

Deno.test('R4F-5: unauthorized request returns 401 (smoke)', async () => {
  // Boot the function in-process to verify the auth gate. We exercise the
  // request handler by importing the module: Deno.serve registers a
  // handler, but we cannot intercept that without running on a port.
  // Instead, assert the source path: 401 + 'unauthorized' both present
  // and reachable before any service-role db call.
  const idx401 = SRC.indexOf("status: 401");
  const idxServiceClient = SRC.indexOf("createClient(supabaseUrl, serviceKey)");
  assertEquals(idx401 > 0, true);
  assertEquals(idxServiceClient > idx401, true);
});
