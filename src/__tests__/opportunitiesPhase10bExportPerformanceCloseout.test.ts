import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildOpportunityReportCsv,
  buildOpportunityReportFilename,
  OPPORTUNITY_EXPORT_LIMIT,
} from '@/modules/opportunities/analytics';
import type { OpportunityOpsRow } from '@/modules/opportunities/analytics';

const ROOT = resolve(__dirname, '..', '..');
const EXPORT_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/export.ts'),
  'utf8',
);
const SVC_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/services.ts'),
  'utf8',
);
const SLA_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/sla.ts'),
  'utf8',
);
const ALL = `${EXPORT_SRC}\n${SVC_SRC}\n${SLA_SRC}`;

function row(i: number): OpportunityOpsRow {
  return {
    id: `o-${i}`,
    ref_id: `OPP-${i}`,
    customer_name: null,
    city: null,
    district: null,
    sector: null,
    status: 'under_review',
    award_status: null,
    awarded_bid_id: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    assigned_count: 0,
    bid_count: 0,
    contract_id: null,
    contract_status: null,
    flag: 'needs_matching',
    first_assigned_at: null,
    first_bid_at: null,
    awarded_at: null,
    contract_created_at: null,
  };
}

describe('Opportunities Phase 10B — export + SLA performance closeout', () => {
  it('1. export cap constant is exposed and enforced', () => {
    expect(OPPORTUNITY_EXPORT_LIMIT).toBeGreaterThan(0);
    const csv = buildOpportunityReportCsv(
      Array.from({ length: OPPORTUNITY_EXPORT_LIMIT + 10 }, (_, i) => row(i)),
    );
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    expect(lines.length).toBe(OPPORTUNITY_EXPORT_LIMIT + 1);
  });

  it('2. analytics services never select without an explicit .limit() bound', () => {
    // every supabase.from(...).select(...) chain in services.ts must reach a .limit() or be scoped by .in()/.eq()
    const fromBlocks = SVC_SRC.split(/supabase\s*\n?\s*\.from\(/).slice(1);
    expect(fromBlocks.length).toBeGreaterThan(0);
    for (const block of fromBlocks) {
      const window = block.slice(0, 400);
      const bounded =
        /\.limit\(/.test(window) ||
        /\.in\(/.test(window) ||
        /\.eq\(/.test(window) ||
        /count:\s*'exact',\s*head:\s*true/.test(window);
      expect(bounded).toBe(true);
    }
  });

  it('3. CSV filename follows qitaat-opportunities-report-YYYY-MM-DD.csv', () => {
    const name = buildOpportunityReportFilename(new Date('2026-06-20T10:00:00Z'));
    expect(name).toBe('qitaat-opportunities-report-2026-06-20.csv');
  });

  it('4. analytics + export + sla contain no service_role references', () => {
    expect(ALL).not.toMatch(/service_role/i);
    expect(ALL).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  });

  it('5. no write operations across analytics modules', () => {
    expect(ALL).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });

  it('6. no supabase.rpc calls anywhere in analytics', () => {
    expect(ALL).not.toMatch(/supabase\.rpc\(/);
  });

  it('7. provider_leads is never used as a source', () => {
    expect(ALL).not.toMatch(/from\(['"]provider_leads['"]\)/);
  });

  it('8. no matching/bids/award/contracts mutation helpers referenced', () => {
    expect(ALL).not.toMatch(
      /awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|match_opportunity|assign_opportunity|create_quote_request_lead/i,
    );
    expect(ALL).not.toMatch(/from\(['"]opportunity_bids['"]\)\s*\.\s*(insert|update|delete|upsert)/);
    expect(ALL).not.toMatch(/from\(['"]contracts['"]\)\s*\.\s*(insert|update|delete|upsert)/);
  });

  it('9. no ts suppressions', () => {
    expect(ALL).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });

  it('10. no any / as any', () => {
    expect(ALL).not.toMatch(/:\s*any\b/);
    expect(ALL).not.toMatch(/\bas\s+any\b/);
  });

  it('11. no notifications inserts from analytics modules', () => {
    expect(ALL).not.toMatch(/from\(['"]notifications['"]\)/);
    expect(ALL).not.toMatch(/notify[_A-Za-z]*\(/);
  });
});