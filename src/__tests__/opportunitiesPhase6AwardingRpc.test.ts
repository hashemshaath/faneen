import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase', 'migrations');
const ALL_SQL = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n');

const SERVICES = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/bids/services.ts'),
  'utf8',
);

describe('Opportunities Phase 6 — award_opportunity_bid RPC guards', () => {
  it('defines the RPC as SECURITY DEFINER with pinned search_path', () => {
    expect(ALL_SQL).toMatch(/CREATE OR REPLACE FUNCTION public\.award_opportunity_bid\(/);
    expect(ALL_SQL).toMatch(/award_opportunity_bid[\s\S]{0,400}SECURITY DEFINER[\s\S]{0,200}SET search_path\s*=\s*public/);
  });

  it('requires authentication', () => {
    expect(ALL_SQL).toMatch(/auth_required/);
  });

  it('only opportunity owner or admin may execute', () => {
    expect(ALL_SQL).toMatch(/has_role\(v_uid,\s*'admin'/);
    expect(ALL_SQL).toMatch(/v_qr_user\s*<>\s*v_uid/);
    expect(ALL_SQL).toMatch(/not_opportunity_owner/);
  });

  it('rejects when opportunity is cancelled/completed', () => {
    expect(ALL_SQL).toMatch(/v_qr_status\s+IN\s*\(\s*'cancelled'\s*,\s*'completed'\s*\)/);
    expect(ALL_SQL).toMatch(/opportunity_not_awardable_status/);
  });

  it('rejects bids that do not belong to the opportunity', () => {
    expect(ALL_SQL).toMatch(/v_bid_opp\s*<>\s*p_opportunity_id/);
    expect(ALL_SQL).toMatch(/bid_opportunity_mismatch/);
  });

  it('rejects bids in non-awardable statuses', () => {
    expect(ALL_SQL).toMatch(/v_bid_status\s+NOT IN\s*\(\s*'submitted'\s*,\s*'under_review'\s*,\s*'shortlisted'\s*,\s*'revised'\s*\)/);
    expect(ALL_SQL).toMatch(/bid_not_in_awardable_status/);
  });

  it('is idempotent for the same already-awarded bid', () => {
    expect(ALL_SQL).toMatch(/v_award_status\s*=\s*'awarded'\s+AND\s+v_awarded_bid\s*=\s*p_bid_id[\s\S]{0,100}RETURN p_bid_id/);
  });

  it('refuses to overwrite an existing award with a different bid', () => {
    expect(ALL_SQL).toMatch(/opportunity_already_awarded/);
  });

  it('marks the winning bid awarded and rejects the rest', () => {
    expect(ALL_SQL).toMatch(/UPDATE public\.opportunity_bids[\s\S]{0,80}SET status\s*=\s*'awarded'[\s\S]{0,80}WHERE id\s*=\s*p_bid_id/);
    expect(ALL_SQL).toMatch(/UPDATE public\.opportunity_bids[\s\S]{0,200}SET status\s*=\s*'rejected'[\s\S]{0,300}id\s*<>\s*p_bid_id/);
  });

  it('logs an opportunity_awarded event', () => {
    expect(ALL_SQL).toMatch(/INSERT INTO public\.quote_request_events[\s\S]{0,200}'opportunity_awarded'/);
  });

  it('does NOT create a contract or work order', () => {
    const fnSlice = ALL_SQL.split('CREATE OR REPLACE FUNCTION public.award_opportunity_bid(')[1] ?? '';
    expect(fnSlice).not.toMatch(/INSERT INTO public\.contracts\b/i);
    expect(fnSlice).not.toMatch(/INSERT INTO public\.work_orders\b/i);
  });

  it('grants EXECUTE to authenticated, revokes from anon/PUBLIC', () => {
    expect(ALL_SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.award_opportunity_bid\(uuid, uuid\) TO authenticated/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.award_opportunity_bid\(uuid, uuid\) FROM anon/);
    expect(ALL_SQL).toMatch(/REVOKE ALL ON FUNCTION public\.award_opportunity_bid\(uuid, uuid\) FROM PUBLIC/);
  });

  it('frontend service wraps the RPC and uses no any/suppressions/service_role', () => {
    expect(SERVICES).toContain("supabase.rpc('award_opportunity_bid'");
    expect(SERVICES).toContain('awardOpportunityBid');
    expect(SERVICES).not.toMatch(/:\s*any\b/);
    expect(SERVICES).not.toMatch(/\bas\s+any\b/);
    expect(SERVICES).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(SERVICES).not.toMatch(/service_role/i);
  });
});