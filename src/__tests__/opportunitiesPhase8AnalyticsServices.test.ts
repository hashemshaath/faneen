import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { __test_only } from '@/modules/opportunities/analytics/services';

const ROOT = resolve(__dirname, '..', '..');
const SVC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/services.ts'),
  'utf8',
);
const TYPES = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/types.ts'),
  'utf8',
);

describe('Opportunities Phase 8 — analytics services', () => {
  it('1. reads from the canonical tables only', () => {
    expect(SVC).toContain("from('quote_requests')");
    expect(SVC).toContain("from('quote_request_leads')");
    expect(SVC).toContain("from('opportunity_bids')");
    expect(SVC).toContain("from('contracts')");
  });
  it('2. does NOT use provider_leads as the opportunities source', () => {
    expect(SVC).not.toMatch(/from\(['"]provider_leads['"]\)/);
  });
  it('3. no service_role / any / suppressions in frontend', () => {
    expect(SVC).not.toMatch(/service_role/i);
    expect(SVC).not.toMatch(/:\s*any\b/);
    expect(SVC).not.toMatch(/\bas\s+any\b/);
    expect(SVC).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(TYPES).not.toMatch(/:\s*any\b/);
  });
  it('4. exposes KPI computation for totals', () => {
    expect(SVC).toMatch(/export async function getOpportunityKpis/);
    expect(SVC).toMatch(/total,/);
  });
  it('5. counts bids via opportunity_bids', () => {
    expect(SVC).toMatch(/distinctBidOpportunityIds/);
  });
  it('6. counts awarded opportunities via award_status', () => {
    expect(SVC).toMatch(/countOpportunitiesByAward\('awarded'\)/);
  });
  it('7. counts opportunities with a contract via contracts.opportunity_id', () => {
    expect(SVC).toMatch(/countContractsWithOpportunity/);
    expect(SVC).toMatch(/from\('contracts'\)[\s\S]{0,200}opportunity_id/);
  });
  it('8. exposes a funnel reader and operations rows reader', () => {
    expect(SVC).toMatch(/export async function getOpportunityFunnel/);
    expect(SVC).toMatch(/export async function listOpportunityOpsRows/);
    expect(SVC).toMatch(/Math\.min\(limit, 200\)/);
  });
  it('9. computeFlag returns the right operational flag for each lifecycle state', () => {
    const { computeFlag } = __test_only;
    expect(
      computeFlag({ status: 'new', assigned_count: 0, bid_count: 0, award_status: null, contract_id: null }),
    ).toBe('needs_matching');
    expect(
      computeFlag({ status: 'matched', assigned_count: 2, bid_count: 0, award_status: null, contract_id: null }),
    ).toBe('awaiting_bids');
    expect(
      computeFlag({ status: 'matched', assigned_count: 2, bid_count: 3, award_status: null, contract_id: null }),
    ).toBe('awaiting_award');
    expect(
      computeFlag({ status: 'matched', assigned_count: 2, bid_count: 3, award_status: 'awarded', contract_id: null }),
    ).toBe('awaiting_contract');
    expect(
      computeFlag({ status: 'matched', assigned_count: 2, bid_count: 3, award_status: 'awarded', contract_id: 'c1' }),
    ).toBe('operationally_complete');
    expect(
      computeFlag({ status: 'cancelled', assigned_count: 0, bid_count: 0, award_status: null, contract_id: null }),
    ).toBe('cancelled');
  });
  it('10. does NOT mutate the DB (no insert/update/delete/upsert/rpc)', () => {
    expect(SVC).not.toMatch(/\.insert\(/);
    expect(SVC).not.toMatch(/\.update\(/);
    expect(SVC).not.toMatch(/\.delete\(/);
    expect(SVC).not.toMatch(/\.upsert\(/);
    expect(SVC).not.toMatch(/supabase\.rpc\(/);
  });
});
