import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase', 'migrations');
const ALL_SQL = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n');

const FN = ALL_SQL.split(
  'CREATE OR REPLACE FUNCTION public.convert_awarded_bid_to_contract(',
)[1] ?? '';

const SERVICE = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/contracts/services.ts'),
  'utf8',
);
const SECTION = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/contracts/OpportunityContractSection.tsx'),
  'utf8',
);
const PROVIDER_PAGE = readFileSync(
  resolve(ROOT, 'src/pages/dashboard/ProviderLeadDetails.tsx'),
  'utf8',
);

describe('Opportunities Phase 7B — contract conversion security closeout', () => {
  it('1. RPC revoked from PUBLIC', () => {
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.convert_awarded_bid_to_contract\(uuid, uuid\) FROM PUBLIC/);
  });
  it('2. RPC revoked from anon', () => {
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.convert_awarded_bid_to_contract\(uuid, uuid\) FROM anon/);
  });
  it('3. RPC granted to authenticated only (plus service_role for backend)', () => {
    expect(ALL_SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.convert_awarded_bid_to_contract\(uuid, uuid\) TO authenticated/);
    expect(ALL_SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.convert_awarded_bid_to_contract\([^)]*\) TO anon/);
  });
  it('4. RPC requires authentication', () => {
    expect(FN).toMatch(/auth_required/);
  });
  it('5. client must own the opportunity (or be admin)', () => {
    expect(FN).toMatch(/has_role\(v_uid,\s*'admin'/);
    expect(FN).toMatch(/not_opportunity_owner/);
  });
  it('6. provider cannot convert: ownership check rejects non-owner non-admin', () => {
    expect(FN).toMatch(/NOT v_is_admin AND \(v_qr_user IS NULL OR v_qr_user\s*<>\s*v_uid\)/);
  });
  it('7. no contract without award_status=awarded', () => {
    expect(FN).toMatch(/opportunity_not_awarded/);
    expect(FN).toMatch(/v_award_status IS DISTINCT FROM 'awarded' OR v_awarded_bid IS NULL/);
  });
  it('8. bid must be THE awarded bid and have awarded status', () => {
    expect(FN).toMatch(/bid_not_the_awarded_bid/);
    expect(FN).toMatch(/bid_not_in_awarded_status/);
    expect(FN).toMatch(/bid_provider_mismatch/);
  });
  it('9. duplicate contract is prevented at app and DB level', () => {
    // App-level idempotency
    expect(FN).toMatch(/SELECT id INTO v_existing_contract[\s\S]{0,200}opportunity_bid_id\s*=\s*p_bid_id/);
    expect(FN).toMatch(/v_existing_contract IS NOT NULL[\s\S]{0,80}RETURN v_existing_contract/);
    // DB-level uniqueness
    expect(ALL_SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS contracts_opportunity_bid_id_unique/);
  });
  it('10. contract stays draft (no auto-acceptance / no auto-send)', () => {
    expect(FN).toMatch(/'draft'::public\.contract_status/);
    expect(FN).not.toMatch(/client_accepted_at\s*=/);
    expect(FN).not.toMatch(/provider_accepted_at\s*=/);
    expect(FN).not.toMatch(/'sent'::public\.contract_status/);
    expect(FN).not.toMatch(/'active'::public\.contract_status/);
    expect(FN).not.toMatch(/locked_at\s*=/);
  });
  it('11. no work order created', () => {
    expect(FN).not.toMatch(/INSERT INTO public\.work_orders\b/i);
  });
  it('12. no payment / invoice / installment side-effects', () => {
    expect(FN).not.toMatch(/INSERT INTO public\.invoices\b/i);
    expect(FN).not.toMatch(/installment/i);
    expect(FN).not.toMatch(/payment_intents?/i);
  });
  it('13. no matching / credits / reveal changes', () => {
    expect(FN).not.toMatch(/quote_request_leads\b/);
    expect(FN).not.toMatch(/provider_leads\b/);
    expect(FN).not.toMatch(/provider_lead_credit_transactions/);
    expect(FN).not.toMatch(/consume_provider_lead_credit/);
    expect(FN).not.toMatch(/reveal/i);
  });
  it('14. no service_role in frontend (service + section + provider page)', () => {
    expect(SERVICE).not.toMatch(/service_role/i);
    expect(SECTION).not.toMatch(/service_role/i);
    expect(PROVIDER_PAGE).not.toMatch(/service_role/i);
  });
  it('15. no any / as any in frontend', () => {
    for (const src of [SERVICE, SECTION]) {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
    }
  });
  it('16. no ts suppressions in frontend', () => {
    for (const src of [SERVICE, SECTION]) {
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    }
  });
  it('17. event metadata carries only ids (no PII)', () => {
    expect(FN).toMatch(/jsonb_build_object\([\s\S]{0,400}'contract_created_from_opportunity'|'contract_created_from_opportunity'[\s\S]{0,400}jsonb_build_object/);
    // No customer name/email/phone/budget leak
    expect(FN).not.toMatch(/customer_email/);
    expect(FN).not.toMatch(/customer_phone/);
    expect(FN).not.toMatch(/budget_amount/);
  });
  it('18. notification failures are swallowed so they cannot break conversion', () => {
    expect(FN).toMatch(/EXCEPTION WHEN OTHERS THEN[\s\S]{0,80}NULL/);
  });
  it('19. admin nudge notification is intentionally deferred (documented decision)', () => {
    expect(FN).not.toMatch(/broadcast_admins/i);
  });
  it('20. provider UI cannot reach the conversion service', () => {
    expect(PROVIDER_PAGE).not.toContain('convertAwardedBidToContract');
    expect(PROVIDER_PAGE).toMatch(/<OpportunityContractSection[\s\S]{0,200}canConvert=\{false\}/);
  });
});
