import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildOpportunityReportCsv,
  OPPORTUNITY_EXPORT_COLUMNS,
  OPPORTUNITY_EXPORT_LIMIT,
  buildOpportunityReportFilename,
} from '@/modules/opportunities/analytics';
import type { OpportunityOpsRow } from '@/modules/opportunities/analytics';

const ROOT = resolve(__dirname, '..', '..');
const EXPORT_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/export.ts'),
  'utf8',
);

function row(overrides: Partial<OpportunityOpsRow> = {}): OpportunityOpsRow {
  return {
    id: 'opp-1',
    ref_id: 'OPP-1000001',
    customer_name: 'Acme',
    city: 'الرياض',
    district: 'العليا',
    sector: 'aluminum',
    taxonomy_category_id: null,
    taxonomy_category_slug: null,
    taxonomy_category_name_ar: null,
    taxonomy_category_name_en: null,
    status: 'under_review',
    award_status: 'awarded',
    awarded_bid_id: 'bid-1',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-05T00:00:00.000Z',
    assigned_count: 3,
    bid_count: 2,
    contract_id: 'c-1',
    contract_status: 'draft',
    flag: 'operationally_complete',
    first_assigned_at: '2026-06-01T05:00:00.000Z',
    first_bid_at: '2026-06-02T05:00:00.000Z',
    awarded_at: '2026-06-03T05:00:00.000Z',
    contract_created_at: '2026-06-04T05:00:00.000Z',
    ...overrides,
  };
}

describe('Opportunities Phase 10 — export reports', () => {
  it('1. produces a CSV string with header + rows', () => {
    const csv = buildOpportunityReportCsv([row()]);
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0].split(',')).toEqual([...OPPORTUNITY_EXPORT_COLUMNS]);
  });

  it('2. CSV contains all required columns', () => {
    const required = [
      'ref_id', 'created_at', 'customer_name', 'city', 'district', 'sector',
      'status', 'assigned_count', 'bid_count', 'awarded', 'has_contract',
      'first_assigned_at', 'first_bid_at', 'awarded_at', 'contract_created_at',
      'flag', 'time_to_first_bid_h', 'time_to_award_h', 'time_to_contract_h',
      'sla_status',
    ];
    for (const col of required) {
      expect(OPPORTUNITY_EXPORT_COLUMNS).toContain(col);
    }
  });

  it('3. escapes commas/quotes/newlines in values', () => {
    const csv = buildOpportunityReportCsv([
      row({ customer_name: 'Doe, John "the boss"' }),
    ]);
    expect(csv).toContain('"Doe, John ""the boss"""');
  });

  it('4. caps rows at OPPORTUNITY_EXPORT_LIMIT', () => {
    const many = Array.from({ length: OPPORTUNITY_EXPORT_LIMIT + 50 }, (_, i) =>
      row({ id: `o-${i}`, ref_id: `OPP-${i}` }),
    );
    const csv = buildOpportunityReportCsv(many);
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    // header + capped rows
    expect(lines.length).toBe(OPPORTUNITY_EXPORT_LIMIT + 1);
  });

  it('5. filename is timestamped CSV', () => {
    const name = buildOpportunityReportFilename(new Date('2026-06-20T10:00:00Z'));
    expect(name).toMatch(/^qitaat-opportunities-report-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('6. starts with UTF-8 BOM for Arabic compatibility', () => {
    const csv = buildOpportunityReportCsv([row()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('7. export module does NOT use service_role', () => {
    expect(EXPORT_SRC).not.toMatch(/service_role/i);
    expect(EXPORT_SRC).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  });

  it('8. export module performs no write operations or RPC calls', () => {
    expect(EXPORT_SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(EXPORT_SRC).not.toMatch(/supabase\.rpc\(/);
  });

  it('9. export does NOT pull from provider_leads', () => {
    expect(EXPORT_SRC).not.toMatch(/provider_leads/);
  });

  it('10. no matching/bid/award/contract mutation helpers referenced', () => {
    expect(EXPORT_SRC).not.toMatch(
      /awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|match_opportunity|assign_opportunity/i,
    );
  });

  it('11. no hardcoded user IDs / UUIDs', () => {
    expect(EXPORT_SRC).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('12. no any / as any / suppressions', () => {
    expect(EXPORT_SRC).not.toMatch(/:\s*any\b/);
    expect(EXPORT_SRC).not.toMatch(/\bas\s+any\b/);
    expect(EXPORT_SRC).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });
});