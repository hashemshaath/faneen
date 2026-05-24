import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const MIGRATIONS_DIR = resolve('supabase/migrations');
const migration = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
  .find((s) => s.includes('admin_mark_membership_payment_refunded_manually'));

describe('R4F-8H admin_mark_membership_payment_refunded_manually migration source', () => {
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
  it('idempotent on already-refunded', () => {
    expect(migration!).toMatch(/v_intent\.status\s*=\s*'refunded'/);
    expect(migration!).toMatch(/'idempotent',\s*true/);
  });
  it('rejects non-paid intents with payment_not_paid', () => {
    expect(migration!).toMatch(/v_intent\.status\s*<>\s*'succeeded'/);
    expect(migration!).toMatch(/'payment_not_paid'/);
  });
  it('returns payment_intent_not_found when missing', () => {
    expect(migration!).toMatch(/'payment_intent_not_found'/);
  });
  it('writes manual_refund_marked audit row into webhook events', () => {
    expect(migration!).toMatch(/INSERT INTO public\.membership_payment_webhook_events/);
    expect(migration!).toMatch(/'manual_refund_marked'/);
  });
  it('mirrors refunded payment_status onto subscription', () => {
    expect(migration!).toMatch(/UPDATE public\.membership_subscriptions/);
    expect(migration!).toMatch(/payment_status\s*=\s*'refunded'/);
  });
  it('revokes public + anon and grants authenticated only', () => {
    expect(migration!).toMatch(/REVOKE ALL ON FUNCTION public\.admin_mark_membership_payment_refunded_manually[\s\S]*FROM public/);
    expect(migration!).toMatch(/REVOKE ALL ON FUNCTION public\.admin_mark_membership_payment_refunded_manually[\s\S]*FROM anon/);
    expect(migration!).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_mark_membership_payment_refunded_manually[\s\S]*TO authenticated/);
  });
});

describe('R4F-8H memberships isolation audit guards new RPC', () => {
  const audit = readFileSync(resolve('scripts/memberships-isolation-audit.mjs'), 'utf8');
  it('lists admin_mark_membership_payment_refunded_manually as guarded RPC', () => {
    expect(audit).toContain('"admin_mark_membership_payment_refunded_manually"');
  });
});

describe('R4F-8H transactional refund template registered', () => {
  const registry = readFileSync(
    resolve('supabase/functions/_shared/transactional-email-templates/registry.ts'),
    'utf8',
  );
  it('imports membership-payment-marked-refunded template', () => {
    expect(registry).toMatch(/membership-payment-marked-refunded/);
    expect(registry).toMatch(/'membership-payment-marked-refunded':/);
  });
});