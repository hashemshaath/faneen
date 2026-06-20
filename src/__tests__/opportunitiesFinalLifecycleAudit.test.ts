import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase', 'migrations');
const ALL_SQL = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const ANALYTICS = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/services.ts'),
  'utf8',
);
const ADMIN_OPS = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);

function slice(fnName: string): string {
  const after = ALL_SQL.split(`CREATE OR REPLACE FUNCTION public.${fnName}(`)[1] ?? '';
  return after.split(/CREATE OR REPLACE FUNCTION\b/)[0] ?? after;
}

describe('Opportunities — final lifecycle audit', () => {
  it('1. core tables exist (created via migrations)', () => {
    expect(ALL_SQL).toMatch(/CREATE TABLE\s+(IF NOT EXISTS\s+)?public\.opportunity_bids\b/);
    expect(ALL_SQL).toMatch(/CREATE TABLE\s+(IF NOT EXISTS\s+)?public\.opportunity_admin_notification_log\b/);
  });
  it('2. opportunity_bids has opportunity_id FK column', () => {
    expect(ALL_SQL).toMatch(/opportunity_id\s+uuid[\s\S]{0,200}REFERENCES\s+public\.quote_requests/i);
  });
  it('3. contracts have opportunity_id and opportunity_bid_id linked to FKs', () => {
    expect(ALL_SQL).toMatch(/ALTER TABLE public\.contracts[\s\S]{0,200}ADD COLUMN[\s\S]{0,200}opportunity_id\s+uuid/);
    expect(ALL_SQL).toMatch(/ADD CONSTRAINT contracts_opportunity_id_fkey[\s\S]{0,200}REFERENCES public\.quote_requests/);
    expect(ALL_SQL).toMatch(/ADD CONSTRAINT contracts_opportunity_bid_id_fkey[\s\S]{0,200}REFERENCES public\.opportunity_bids/);
  });
  it('4. no duplicate contract per bid (DB-level unique index)', () => {
    expect(ALL_SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS contracts_opportunity_bid_id_unique/);
  });
  it('5. sensitive RPCs revoked from PUBLIC/anon', () => {
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.award_opportunity_bid\([^)]*\) FROM PUBLIC/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.award_opportunity_bid\([^)]*\) FROM anon/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.convert_awarded_bid_to_contract\([^)]*\) FROM PUBLIC/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.convert_awarded_bid_to_contract\([^)]*\) FROM anon/);
  });
  it('6. notify_admins_opportunity_event is service_role-only execute', () => {
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.notify_admins_opportunity_event\([^)]*\) FROM PUBLIC/);
    expect(ALL_SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.notify_admins_opportunity_event\([^)]*\) TO service_role/);
    expect(ALL_SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.notify_admins_opportunity_event\([^)]*\) TO authenticated/);
    expect(ALL_SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.notify_admins_opportunity_event\([^)]*\) TO anon/);
  });
  it('7. award RPC enforces "no award without a valid bid"', () => {
    const FN = slice('award_opportunity_bid');
    expect(FN).toMatch(/bid_not_for_this_opportunity|bid_not_found|opportunity_not_open/i);
    expect(FN).toMatch(/SECURITY DEFINER/);
    expect(FN).toMatch(/SET search_path = public/);
  });
  it('8. contract conversion requires award_status=awarded', () => {
    const FN = slice('convert_awarded_bid_to_contract');
    expect(FN).toMatch(/opportunity_not_awarded/);
    expect(FN).toMatch(/bid_not_the_awarded_bid/);
    expect(FN).toMatch(/bid_not_in_awarded_status/);
  });
  it('9. no work_orders / invoices / installments / payments side-effects in lifecycle RPCs', () => {
    for (const fn of ['award_opportunity_bid', 'convert_awarded_bid_to_contract', 'notify_admins_opportunity_event']) {
      const F = slice(fn);
      expect(F).not.toMatch(/INSERT INTO public\.work_orders\b/i);
      expect(F).not.toMatch(/INSERT INTO public\.invoices\b/i);
      expect(F).not.toMatch(/installment/i);
      expect(F).not.toMatch(/payment_intents?/i);
    }
  });
  it('10. lifecycle RPCs do not change matching / credits / reveal', () => {
    for (const fn of ['award_opportunity_bid', 'convert_awarded_bid_to_contract']) {
      const F = slice(fn);
      expect(F).not.toMatch(/provider_lead_credit_transactions/);
      expect(F).not.toMatch(/consume_provider_lead_credit/);
      expect(F).not.toMatch(/reveal/i);
      expect(F).not.toMatch(/match_quote_request|provider_leads\b/);
    }
  });
  it('11. admin notification idempotency: PK + ON CONFLICT DO NOTHING', () => {
    expect(ALL_SQL).toMatch(/idempotency_key text PRIMARY KEY/);
    expect(ALL_SQL).toMatch(/ON CONFLICT \(idempotency_key\) DO NOTHING/);
  });
  it('12. admin recipients come from user_roles role=admin (no hardcoded admin UUIDs)', () => {
    const FN = slice('notify_admins_opportunity_event');
    expect(FN).toMatch(/FROM public\.user_roles[\s\S]*role = 'admin'/);
    expect(FN).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/i);
  });
  it('13. analytics service is read-only and does not source from provider_leads', () => {
    expect(ANALYTICS).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(ANALYTICS).not.toMatch(/supabase\.rpc\(/);
    expect(ANALYTICS).not.toMatch(/from\(['"]provider_leads['"]\)/);
    expect(ANALYTICS).not.toMatch(/service_role/i);
  });
  it('14. admin ops page is read-only (no writes, no rpc, no service_role)', () => {
    expect(ADMIN_OPS).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(ADMIN_OPS).not.toMatch(/supabase\.rpc\(/);
    expect(ADMIN_OPS).not.toMatch(/service_role/i);
  });
  it('15. canonical routes (client / provider / admin) exist', () => {
    expect(APP).toMatch(/path="\/dashboard\/opportunities"/);
    expect(APP).toMatch(/path="\/dashboard\/opportunities\/:id"/);
    expect(APP).toMatch(/path="\/dashboard\/opportunities\/assigned"/);
    expect(APP).toMatch(/path="\/admin\/opportunities"/);
    expect(APP).toMatch(/path="\/admin\/opportunities\/list"/);
    expect(APP).toMatch(/path="\/admin\/opportunities\/:id"/);
    expect(APP).toMatch(/path="\/admin\/quote-requests"/);
    expect(APP).toMatch(/path="\/admin\/quote-requests\/:id"/);
  });
  it('16. legacy provider/rfq routes preserved as redirects (no deletions)', () => {
    expect(APP).toMatch(/path="\/dashboard\/provider\/leads"[\s\S]{0,200}<Navigate to="\/dashboard\/opportunities\/assigned"/);
    expect(APP).toMatch(/path="\/dashboard\/rfq"[\s\S]{0,200}<Navigate to="\/dashboard\/opportunities\/assigned"/);
    expect(APP).toMatch(/path="\/dashboard\/rfq\/inbox"[\s\S]{0,200}<Navigate to="\/dashboard\/opportunities\/assigned"/);
  });
});
