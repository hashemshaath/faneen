import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SVC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/services.ts'),
  'utf8',
);
const TYPES = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/types.ts'),
  'utf8',
);
const INDEX = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/index.ts'),
  'utf8',
);

const ALL = `${SVC}\n${TYPES}\n${INDEX}`;

describe('Opportunities Phase 8B — analytics services are read-only', () => {
  it('1. no write operations (.insert/.update/.delete/.upsert)', () => {
    expect(SVC).not.toMatch(/\.insert\(/);
    expect(SVC).not.toMatch(/\.update\(/);
    expect(SVC).not.toMatch(/\.delete\(/);
    expect(SVC).not.toMatch(/\.upsert\(/);
  });
  it('2. no service_role usage', () => {
    expect(ALL).not.toMatch(/service_role/i);
    expect(ALL).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  });
  it('3. provider_leads is NOT used as a source', () => {
    expect(SVC).not.toMatch(/from\(['"]provider_leads['"]\)/);
  });
  it('4. no notification inserts', () => {
    expect(SVC).not.toMatch(/from\(['"]notifications['"]\)/);
    expect(SVC).not.toMatch(/notify[_A-Za-z]*\(/);
  });
  it('5. no matching mutations', () => {
    expect(SVC).not.toMatch(/match_opportunity|assign_opportunity|create_quote_request_lead/i);
  });
  it('6. no bids mutations', () => {
    expect(SVC).not.toMatch(/submitOpportunityBid|submit_opportunity_bid/i);
    expect(SVC).not.toMatch(/from\(['"]opportunity_bids['"]\)\s*\.\s*(insert|update|delete|upsert)/);
  });
  it('7. no award mutations', () => {
    expect(SVC).not.toMatch(/award_opportunity_bid|awardOpportunityBid/i);
  });
  it('8. no contract conversion calls', () => {
    expect(SVC).not.toMatch(/convert_awarded_bid_to_contract|convertAwardedBidToContract/i);
    expect(SVC).not.toMatch(/from\(['"]contracts['"]\)\s*\.\s*(insert|update|delete|upsert)/);
  });
  it('9. no any / as any', () => {
    expect(SVC).not.toMatch(/:\s*any\b/);
    expect(SVC).not.toMatch(/\bas\s+any\b/);
  });
  it('10. no ts suppressions', () => {
    expect(SVC).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });
  it('11. uses supabase.rpc only for reads — actually, no rpc at all in analytics', () => {
    expect(SVC).not.toMatch(/supabase\.rpc\(/);
  });
});
