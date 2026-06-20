import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase/migrations');

function findMigration(needle: RegExp): string {
  const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = readFileSync(resolve(MIG_DIR, f), 'utf8');
    if (needle.test(sql)) return sql;
  }
  throw new Error('migration with notify_admins_opportunity_event not found');
}
const MIG = findMigration(/notify_admins_opportunity_event/);
const SUBMIT = readFileSync(resolve(ROOT, 'supabase/functions/submit-quote-request/index.ts'), 'utf8');

describe('Opportunities Phase 9 — admin notifications fan-out', () => {
  it('1. opportunity submitted notifies admins (existing edge path)', () => {
    expect(SUBMIT).toMatch(/quote_request_new_admin/);
    expect(SUBMIT).toMatch(/from\(['"]user_roles['"]\)[\s\S]{0,200}role['"][^'"]*['"]admin/);
  });
  it('2. assigned event fires from quote_request_leads insert', () => {
    expect(MIG).toMatch(/trg_opportunity_lead_assigned_notify/);
    expect(MIG).toMatch(/AFTER INSERT ON public\.quote_request_leads/);
    expect(MIG).toMatch(/'assigned'/);
  });
  it('3. bid_submitted event fires from opportunity_bids insert', () => {
    expect(MIG).toMatch(/AFTER INSERT ON public\.opportunity_bids/);
    expect(MIG).toMatch(/'bid_submitted'/);
  });
  it('4. awarded event fires from quote_requests award_status update', () => {
    expect(MIG).toMatch(/AFTER UPDATE OF award_status ON public\.quote_requests/);
    expect(MIG).toMatch(/'awarded'/);
  });
  it('5. contract_created event fires from contracts insert when opportunity_id present', () => {
    expect(MIG).toMatch(/AFTER INSERT ON public\.contracts/);
    expect(MIG).toMatch(/'contract_created'/);
    expect(MIG).toMatch(/opportunity_id IS NOT NULL/);
  });
  it('6. idempotency log table + PRIMARY KEY + ON CONFLICT DO NOTHING', () => {
    expect(MIG).toMatch(/CREATE TABLE IF NOT EXISTS public\.opportunity_admin_notification_log/);
    expect(MIG).toMatch(/idempotency_key text PRIMARY KEY/);
    expect(MIG).toMatch(/ON CONFLICT \(idempotency_key\) DO NOTHING/);
  });
  it('7. recipients come from user_roles role=admin — no hardcoded IDs', () => {
    expect(MIG).toMatch(/FROM public\.user_roles ur[\s\S]*ur\.role = 'admin'/);
    expect(MIG).not.toMatch(/USR-100000\d/);
    // No literal UUID admin id constants.
    expect(MIG).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/i);
  });
  it('8. bilingual admin notification copy', () => {
    for (const ar of [
      'تم إسناد فرصة لمزود',
      'تم تقديم عرض جديد',
      'تم تعميد عرض على فرصة',
      'تم إنشاء عقد مبدئي من فرصة',
    ]) {
      expect(MIG).toContain(ar);
    }
    for (const en of [
      'Opportunity assigned to a provider',
      'New opportunity bid submitted',
      'Opportunity awarded',
      'Draft contract created from opportunity',
    ]) {
      expect(MIG).toContain(en);
    }
  });
  it('9. fanout function is SECURITY DEFINER with locked search_path and EXCEPTION swallow', () => {
    expect(MIG).toMatch(/CREATE OR REPLACE FUNCTION public\.notify_admins_opportunity_event/);
    expect(MIG).toMatch(/SECURITY DEFINER/);
    expect(MIG).toMatch(/SET search_path = public/);
    expect(MIG).toMatch(/EXCEPTION WHEN OTHERS THEN/);
  });
  it('10. lifecycle is not changed (no award/bid/contract mutations in this migration)', () => {
    expect(MIG).not.toMatch(/UPDATE public\.opportunity_bids/);
    expect(MIG).not.toMatch(/UPDATE public\.quote_requests\s+SET\s+award_status/);
    expect(MIG).not.toMatch(/UPDATE public\.contracts/);
    expect(MIG).not.toMatch(/consume_provider_lead_credit|provider_lead_credit_transactions/);
    expect(MIG).not.toMatch(/match_quote_request|provider_leads/);
  });
});
