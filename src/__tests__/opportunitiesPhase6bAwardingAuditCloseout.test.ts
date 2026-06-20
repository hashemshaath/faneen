import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase', 'migrations');
const ALL_SQL = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n');

const AWARD_FN = (
  ALL_SQL.split('CREATE OR REPLACE FUNCTION public.award_opportunity_bid(')[1] ?? ''
).split('CREATE OR REPLACE FUNCTION')[0];

describe('Opportunities Phase 6B — awarding audit + notifications closeout', () => {
  it('1. RPC logs an event on award', () => {
    expect(AWARD_FN).toMatch(/INSERT INTO public\.quote_request_events/);
    expect(AWARD_FN).toMatch(/'opportunity_awarded'/);
  });

  it('2. event carries opportunity_id', () => {
    expect(AWARD_FN).toMatch(/quote_request_id[\s\S]{0,400}p_opportunity_id/);
  });

  it('3. event metadata carries bid_id', () => {
    expect(AWARD_FN).toMatch(/'bid_id'\s*,\s*p_bid_id/);
  });

  it('4. event metadata carries provider_business_id', () => {
    expect(AWARD_FN).toMatch(/'provider_business_id'\s*,\s*v_bid_provider/);
  });

  it('5. awarding is idempotent for the same bid (no duplicate event)', () => {
    expect(AWARD_FN).toMatch(
      /v_award_status\s*=\s*'awarded'\s+AND\s+v_awarded_bid\s*=\s*p_bid_id[\s\S]{0,80}RETURN p_bid_id/,
    );
  });

  it('6. no contract is created inside the RPC', () => {
    expect(AWARD_FN).not.toMatch(/INSERT INTO public\.contracts\b/i);
  });

  it('7. no work order is created inside the RPC', () => {
    expect(AWARD_FN).not.toMatch(/INSERT INTO public\.work_orders\b/i);
  });

  it('8. no matching tables are touched', () => {
    expect(AWARD_FN).not.toMatch(/quote_request_leads\b/);
    expect(AWARD_FN).not.toMatch(/provider_leads\b/);
  });

  it('9. no credits/reveal changes', () => {
    expect(AWARD_FN).not.toMatch(/provider_lead_credit_transactions/);
    expect(AWARD_FN).not.toMatch(/consume_provider_lead_credit/);
    expect(AWARD_FN).not.toMatch(/reveal/i);
  });

  it('10. notifications: winner + client are emitted best-effort', () => {
    expect(AWARD_FN).toMatch(/'opportunity_bid_awarded'/);
    expect(AWARD_FN).toMatch(/تم تعميد عرضك/);
    expect(AWARD_FN).toMatch(/تم التعميد بنجاح/);
    expect(AWARD_FN).toMatch(/EXCEPTION WHEN OTHERS THEN[\s\S]{0,80}NULL/);
  });

  it('admin nudge notification is intentionally deferred to Phase 6C/7B', () => {
    expect(AWARD_FN).not.toMatch(/broadcast_admins/i);
  });
});
