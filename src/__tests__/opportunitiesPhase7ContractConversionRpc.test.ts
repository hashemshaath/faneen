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

describe('Opportunities Phase 7 — convert_awarded_bid_to_contract RPC', () => {
  it('is SECURITY DEFINER with pinned search_path', () => {
    expect(FN).toMatch(/SECURITY DEFINER[\s\S]{0,200}SET search_path\s*=\s*public/);
  });
  it('requires authentication', () => {
    expect(FN).toMatch(/auth_required/);
  });
  it('only opportunity owner or admin may call it (rejects providers)', () => {
    expect(FN).toMatch(/has_role\(v_uid,\s*'admin'/);
    expect(FN).toMatch(/v_qr_user\s+IS NULL OR v_qr_user\s*<>\s*v_uid/);
    expect(FN).toMatch(/not_opportunity_owner/);
  });
  it('refuses opportunities that are not awarded', () => {
    expect(FN).toMatch(/opportunity_not_awarded/);
    expect(FN).toMatch(/v_award_status IS DISTINCT FROM 'awarded' OR v_awarded_bid IS NULL/);
  });
  it('refuses bids that are not THE awarded bid', () => {
    expect(FN).toMatch(/bid_not_the_awarded_bid/);
    expect(FN).toMatch(/v_awarded_bid\s*<>\s*p_bid_id/);
  });
  it('refuses bids whose status is not awarded', () => {
    expect(FN).toMatch(/bid_not_in_awarded_status/);
    expect(FN).toMatch(/v_bid_status\s*<>\s*'awarded'/);
  });
  it('refuses when bid provider does not match awarded provider', () => {
    expect(FN).toMatch(/bid_provider_mismatch/);
  });
  it('is idempotent — returns existing contract for the same bid', () => {
    expect(FN).toMatch(/SELECT id INTO v_existing_contract[\s\S]{0,200}opportunity_bid_id\s*=\s*p_bid_id/);
    expect(FN).toMatch(/v_existing_contract IS NOT NULL[\s\S]{0,80}RETURN v_existing_contract/);
  });
  it('creates the contract in draft status only (no auto-send/auto-sign)', () => {
    expect(FN).toMatch(/'draft'::public\.contract_status/);
    expect(FN).not.toMatch(/client_accepted_at\s*=/);
    expect(FN).not.toMatch(/provider_accepted_at\s*=/);
    expect(FN).not.toMatch(/'sent'::public\.contract_status/);
  });
  it('links the contract back to opportunity_id and opportunity_bid_id', () => {
    expect(FN).toMatch(/opportunity_id[\s\S]{0,400}opportunity_bid_id/);
    expect(FN).toMatch(/p_opportunity_id,\s*\n\s*p_bid_id/);
  });
  it('logs contract_created_from_opportunity to quote_request_events', () => {
    expect(FN).toMatch(/INSERT INTO public\.quote_request_events[\s\S]{0,400}'contract_created_from_opportunity'/);
    expect(FN).toMatch(/'contract_id',\s*v_new_contract/);
  });
  it('does NOT create a work order', () => {
    expect(FN).not.toMatch(/INSERT INTO public\.work_orders\b/i);
  });
  it('does NOT touch matching / credits / reveal', () => {
    expect(FN).not.toMatch(/quote_request_leads\b/);
    expect(FN).not.toMatch(/provider_leads\b/);
    expect(FN).not.toMatch(/provider_lead_credit_transactions/);
    expect(FN).not.toMatch(/reveal/i);
  });
  it('does NOT create payments/invoices/installments', () => {
    expect(FN).not.toMatch(/INSERT INTO public\.invoices\b/i);
    expect(FN).not.toMatch(/installment/i);
  });
  it('grants EXECUTE to authenticated, revokes from anon/PUBLIC', () => {
    expect(ALL_SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.convert_awarded_bid_to_contract\(uuid, uuid\) TO authenticated/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.convert_awarded_bid_to_contract\(uuid, uuid\) FROM anon/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.convert_awarded_bid_to_contract\(uuid, uuid\) FROM PUBLIC/);
  });
  it('frontend service uses no any/suppressions/service_role', () => {
    expect(SERVICE).toContain("supabase.rpc('convert_awarded_bid_to_contract'");
    expect(SERVICE).not.toMatch(/:\s*any\b/);
    expect(SERVICE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(SERVICE).not.toMatch(/service_role/i);
  });
});
