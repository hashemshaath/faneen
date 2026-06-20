import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MIG_DIR = resolve(ROOT, 'supabase', 'migrations');
const ALL_SQL = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n');

describe('Opportunities Phase 7 — contracts ↔ opportunity migration', () => {
  it('adds contracts.opportunity_id column', () => {
    expect(ALL_SQL).toMatch(/ALTER TABLE public\.contracts[\s\S]{0,400}opportunity_id\s+uuid\s+REFERENCES public\.quote_requests\(id\)/);
  });
  it('adds contracts.opportunity_bid_id column with FK', () => {
    expect(ALL_SQL).toMatch(/opportunity_bid_id\s+uuid\s+REFERENCES public\.opportunity_bids\(id\)/);
  });
  it('indexes opportunity_id', () => {
    expect(ALL_SQL).toMatch(/CREATE INDEX IF NOT EXISTS contracts_opportunity_id_idx ON public\.contracts\(opportunity_id\)/);
  });
  it('indexes opportunity_bid_id', () => {
    expect(ALL_SQL).toMatch(/CREATE INDEX IF NOT EXISTS contracts_opportunity_bid_id_idx ON public\.contracts\(opportunity_bid_id\)/);
  });
  it('enforces unique opportunity_bid_id (one contract per bid)', () => {
    expect(ALL_SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS contracts_opportunity_bid_id_unique[\s\S]{0,160}opportunity_bid_id IS NOT NULL/);
  });
  it('does NOT add a work_order FK to contracts', () => {
    expect(ALL_SQL).not.toMatch(/contracts[\s\S]{0,200}work_order_id\s+uuid\s+REFERENCES/);
  });
});
