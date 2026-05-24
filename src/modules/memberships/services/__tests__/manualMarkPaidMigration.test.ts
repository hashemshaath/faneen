import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const MIGRATIONS_DIR = resolve('supabase/migrations');
const migration = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
  .find((s) => s.includes('admin_mark_membership_paid_manually'));

describe('R4F-8D admin_mark_membership_paid_manually migration source', () => {
  it('migration file exists', () => {
    expect(migration).toBeDefined();
  });
  it('declares SECURITY DEFINER', () => {
    expect(migration!).toMatch(/SECURITY DEFINER/);
  });
  it('pins search_path to public', () => {
    expect(migration!).toMatch(/SET search_path\s*=\s*public/i);
  });
  it('admin-gates via has_role(...admin)', () => {
    expect(migration!).toMatch(/has_role\(\s*v_caller\s*,\s*'admin'\s*\)/);
  });
  it('locks the payment intent FOR UPDATE', () => {
    expect(migration!).toMatch(/FROM\s+public\.membership_payment_intents[\s\S]*FOR UPDATE/i);
  });
  it('handles already-succeeded idempotent path', () => {
    expect(migration!).toMatch(/v_intent\.status\s*=\s*'succeeded'/);
    expect(migration!).toMatch(/'idempotent',\s*true/);
  });
  it('returns payment_intent_not_found code when missing', () => {
    expect(migration!).toMatch(/'payment_intent_not_found'/);
  });
  it('returns duplicate_payment_reference code on collisions', () => {
    expect(migration!).toMatch(/'duplicate_payment_reference'/);
  });
  it('writes audit row into membership_payment_webhook_events', () => {
    expect(migration!).toMatch(/INSERT INTO public\.membership_payment_webhook_events/);
    expect(migration!).toMatch(/'manual_mark_paid'/);
  });
  it('mirrors payment fields onto membership_subscriptions', () => {
    expect(migration!).toMatch(/UPDATE public\.membership_subscriptions/);
    expect(migration!).toMatch(/last_paid_at\s*=/);
  });
  it('revokes public + anon and grants authenticated only', () => {
    expect(migration!).toMatch(/REVOKE ALL ON FUNCTION public\.admin_mark_membership_paid_manually[\s\S]*FROM public/);
    expect(migration!).toMatch(/REVOKE ALL ON FUNCTION public\.admin_mark_membership_paid_manually[\s\S]*FROM anon/);
    expect(migration!).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_mark_membership_paid_manually[\s\S]*TO authenticated/);
  });
});

describe('R4F-8D memberships isolation audit guards new RPC', () => {
  const audit = readFileSync(resolve('scripts/memberships-isolation-audit.mjs'), 'utf8');
  it('lists admin_mark_membership_paid_manually as guarded RPC', () => {
    expect(audit).toContain('"admin_mark_membership_paid_manually"');
  });
});

describe('R4F-8D transactional template registered', () => {
  const registry = readFileSync(
    resolve('supabase/functions/_shared/transactional-email-templates/registry.ts'),
    'utf8',
  );
  it('registry maps membership-payment-marked-paid', () => {
    expect(registry).toMatch(/'membership-payment-marked-paid':\s*membershipPaymentMarkedPaid/);
  });
  it('imports the template file', () => {
    expect(registry).toMatch(/from '\.\/membership-payment-marked-paid\.tsx'/);
  });
});
