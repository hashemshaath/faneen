import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIG_DIR = resolve(__dirname, '..', '..', 'supabase', 'migrations');
const ALL_SQL = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n');

describe('Opportunities Phase 6 — awarding schema', () => {
  it('adds award columns to quote_requests', () => {
    expect(ALL_SQL).toMatch(/ADD COLUMN IF NOT EXISTS awarded_bid_id\s+uuid\s+REFERENCES\s+public\.opportunity_bids\(id\)/i);
    expect(ALL_SQL).toMatch(/ADD COLUMN IF NOT EXISTS awarded_provider_business_id\s+uuid\s+REFERENCES\s+public\.businesses\(id\)/i);
    expect(ALL_SQL).toMatch(/ADD COLUMN IF NOT EXISTS awarded_at\s+timestamptz/i);
    expect(ALL_SQL).toMatch(/ADD COLUMN IF NOT EXISTS awarded_by\s+uuid\s+REFERENCES\s+auth\.users\(id\)/i);
    expect(ALL_SQL).toMatch(/ADD COLUMN IF NOT EXISTS award_status\s+text/i);
  });

  it('constrains award_status to none|awarded|cancelled', () => {
    expect(ALL_SQL).toContain('quote_requests_award_status_chk');
    for (const v of ['none', 'awarded', 'cancelled']) {
      expect(ALL_SQL).toContain(`'${v}'`);
    }
  });

  it('indexes award lookup columns', () => {
    expect(ALL_SQL).toContain('idx_quote_requests_awarded_bid');
    expect(ALL_SQL).toContain('idx_quote_requests_award_status');
  });

  it('does not introduce a contracts FK in this phase', () => {
    expect(ALL_SQL).not.toMatch(/quote_requests[\s\S]{0,200}contract_id\s+uuid[\s\S]{0,200}REFERENCES\s+public\.contracts/);
    expect(ALL_SQL).not.toMatch(/opportunity_bids[\s\S]{0,200}contract_id\s+uuid[\s\S]{0,200}REFERENCES\s+public\.contracts/);
  });

  it('does not break opportunity_bids structural pieces', () => {
    expect(ALL_SQL).toContain('CREATE TABLE public.opportunity_bids');
    expect(ALL_SQL).not.toMatch(/DROP TABLE[^;]*opportunity_bids/i);
  });

  it('column awarded_bid_id is single (one award per opportunity)', () => {
    // The award is stored as a single column on quote_requests → at most one
    // winning bid per opportunity by construction.
    expect(ALL_SQL).toMatch(/awarded_bid_id\s+uuid/);
  });
});