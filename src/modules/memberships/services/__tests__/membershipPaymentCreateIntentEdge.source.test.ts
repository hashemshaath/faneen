import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * R4F-9C: Source-level guarantees for the membership-payment-create-intent
 * edge function. These tests pin down the security + side-effect contract
 * without spinning up Deno or hitting Moyasar.
 */

const EDGE = readFileSync(
  resolve('supabase/functions/membership-payment-create-intent/index.ts'),
  'utf8',
);

describe('membership-payment-create-intent edge fn — auth & config', () => {
  it('requires a Bearer JWT and validates it via getClaims', () => {
    expect(EDGE).toContain("Bearer ");
    expect(EDGE).toContain('getClaims');
    expect(EDGE).toContain("code: 'unauthorized'");
  });

  it('returns missing_payment_config when Moyasar / callback env vars are absent', () => {
    expect(EDGE).toContain('MOYASAR_SECRET_KEY');
    expect(EDGE).toContain('MEMBERSHIP_PAYMENTS_SUCCESS_URL');
    expect(EDGE).toContain('MEMBERSHIP_PAYMENTS_CANCEL_URL');
    expect(EDGE).toContain("code: 'missing_payment_config'");
  });

  it('uses the service-role key only server-side and never echoes secret names', () => {
    expect(EDGE).toContain('SUPABASE_SERVICE_ROLE_KEY');
    // Diagnostic logs must not leak the actual secret values.
    expect(EDGE).not.toMatch(/console\.log\([^)]*MOYASAR_SECRET_KEY/);
    expect(EDGE).not.toMatch(/console\.log\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe('membership-payment-create-intent edge fn — server-side trust', () => {
  it('recomputes amount + currency from membership_plans (never trusts client)', () => {
    // Edge fn now reads plans via the shared wrapper (getMembershipPlanById)
    // instead of an in-file `from('membership_plans')` call.
    expect(EDGE).toContain('getMembershipPlanById');
    expect(EDGE).not.toMatch(/supabase\.from\(['"]membership_plans['"]\)/);
    expect(EDGE).toContain('price_monthly');
    expect(EDGE).toContain('price_yearly');
    expect(EDGE).toContain('currency_code');
    // The client cannot smuggle amount/currency into the insert payload.
    expect(EDGE).not.toMatch(/amount:\s*body\??\.amount/);
    expect(EDGE).not.toMatch(/currency:\s*body\??\.currency/);
  });

  it('scopes the subscription to the JWT user id', () => {
    // Subscription lookups go through getMembershipSubscriptionById; the
    // user-id guard remains in the edge fn body.
    expect(EDGE).toContain('getMembershipSubscriptionById');
    expect(EDGE).not.toMatch(/supabase\.from\(['"]membership_subscriptions['"]\)/);
    expect(EDGE).toMatch(/user_id\s*!==\s*userId/);
  });

  it('persists provider=moyasar with a deterministic idempotency key', () => {
    expect(EDGE).toContain("provider: PROVIDER");
    expect(EDGE).toMatch(/PROVIDER\s*=\s*'moyasar'/);
    expect(EDGE).toContain('mp:${subscriptionId}:${plan.tier}:${billingCycle}:${attempt}');
  });

  it('inserts intent with requires_action status and stores checkout_url in metadata', () => {
    expect(EDGE).toContain("status: 'requires_action'");
    expect(EDGE).toContain('checkout_url: checkoutUrl');
  });

  it('never marks the subscription as paid and never triggers emails/notifications', () => {
    expect(EDGE).not.toMatch(/update\(\s*\{\s*payment_status:\s*'paid'/);
    expect(EDGE).not.toContain("update({ status: 'paid'");
    expect(EDGE).not.toContain('sendTransactionalEmail');
    expect(EDGE).not.toContain('send-transactional-email');
    expect(EDGE).not.toContain('createNotification');
    expect(EDGE).not.toContain("from('notifications')");
  });

  it('does not implement webhook / confirm / reconcile in this phase', () => {
    expect(EDGE).not.toContain('membership-payment-webhook');
    expect(EDGE).not.toContain('membership-payment-confirm');
    expect(EDGE).not.toContain('membership-payment-reconcile');
  });

  it('calls Moyasar invoices endpoint server-side with Basic auth', () => {
    expect(EDGE).toContain('https://api.moyasar.com/v1/invoices');
    expect(EDGE).toContain('Basic ${auth}');
    // Amount converted to halalas (minor units).
    expect(EDGE).toMatch(/amountNumber\s*\*\s*100/);
  });
});