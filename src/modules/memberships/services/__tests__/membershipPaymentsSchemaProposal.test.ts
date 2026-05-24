import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve('supabase/migrations');

const findMigration = (needle: string) => {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const src = readFileSync(resolve(MIGRATIONS_DIR, f), 'utf8');
    if (src.includes(needle)) return src;
  }
  throw new Error(`R4F-8B migration not found (needle: ${needle})`);
};

describe('R4F-8B membership payments schema proposal migration', () => {
  const sql = findMigration('R4F-8B');

  it('adds nullable payment fields to membership_subscriptions', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS payment_provider text NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS payment_status text NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_invoice_id text NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_external_payment_id text NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_paid_at timestamptz NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_paid_amount numeric\(10,2\) NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_paid_currency varchar\(3\) NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_receipt_url text NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS payment_metadata jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  });

  it('constrains provider/status/currency', () => {
    expect(sql).toContain("'manual','promo','stripe','paddle','tap','hyperpay','moyasar','other'");
    expect(sql).toContain("'pending','paid','failed','refunded','manual','cancelled'");
    expect(sql).toMatch(/char_length\(last_paid_currency\)\s*=\s*3/);
  });

  it('creates membership_payment_intents with unique idempotency_key', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.membership_payment_intents/);
    expect(sql).toMatch(/idempotency_key text NOT NULL UNIQUE/);
    expect(sql).toMatch(/REFERENCES public\.membership_subscriptions\(id\) ON DELETE CASCADE/);
    expect(sql).toContain("'created','requires_action','succeeded','failed','cancelled','refunded'");
    expect(sql).toMatch(/uq_mpi_provider_intent[\s\S]*WHERE provider_intent_id IS NOT NULL/);
  });

  it('creates membership_payment_webhook_events with unique(provider,event_id)', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.membership_payment_webhook_events/);
    expect(sql).toMatch(/UNIQUE \(provider, event_id\)/);
  });

  it('enables RLS and defines service-role + admin + owner policies', () => {
    expect(sql).toMatch(/ALTER TABLE public\.membership_payment_intents ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE public\.membership_payment_webhook_events ENABLE ROW LEVEL SECURITY/);
    expect(sql).toContain('mpi_service_role_all');
    expect(sql).toContain('mpi_admin_select_all');
    expect(sql).toContain('mpi_owner_select_own');
    expect(sql).toContain('mpwe_service_role_all');
    expect(sql).toContain('mpwe_admin_select_all');
    expect(sql).toMatch(/has_role\(auth\.uid\(\),\s*'admin'\)/);
  });

  it('does not introduce client write policies on new tables', () => {
    // No INSERT/UPDATE/DELETE policies for authenticated role on the new tables.
    expect(sql).not.toMatch(/CREATE POLICY[^;]+membership_payment_intents[^;]+FOR INSERT[^;]+TO authenticated/i);
    expect(sql).not.toMatch(/CREATE POLICY[^;]+membership_payment_intents[^;]+FOR UPDATE[^;]+TO authenticated/i);
    expect(sql).not.toMatch(/CREATE POLICY[^;]+membership_payment_webhook_events[^;]+FOR INSERT[^;]+TO authenticated/i);
  });
});

describe('R4F-8B audit allowlist impact', () => {
  it('tables are now present in memberships isolation audit (R4F-8C+)', () => {
    const audit = readFileSync(resolve('scripts/memberships-isolation-audit.mjs'), 'utf8');
    expect(audit).toContain('membership_payment_intents');
    expect(audit).toContain('membership_payment_webhook_events');
  });
});