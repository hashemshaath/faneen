import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bidsModule from '@/modules/opportunities/bids';

/**
 * OPPORTUNITIES PHASE 5 — services/types static guards.
 * No DB hits here; runtime RLS is enforced by the migration.
 */
const ROOT = resolve(__dirname, '..', '..');
const SERVICES = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/services.ts'), 'utf8');
const TYPES = readFileSync(resolve(ROOT, 'src/modules/opportunities/bids/types.ts'), 'utf8');

describe('opportunity bids — domain surface', () => {
  it('exposes the required services', () => {
    expect(typeof bidsModule.listOpportunityBidsForClient).toBe('function');
    expect(typeof bidsModule.listMySubmittedBidsForProvider).toBe('function');
    expect(typeof bidsModule.getMyBidForOpportunity).toBe('function');
    expect(typeof bidsModule.submitOpportunityBid).toBe('function');
    expect(typeof bidsModule.updateDraftOpportunityBid).toBe('function');
    expect(typeof bidsModule.withdrawOpportunityBid).toBe('function');
  });

  it('targets the new opportunity_bids table — never rfq_quotes', () => {
    expect(SERVICES).toContain("from('opportunity_bids')");
    expect(SERVICES).not.toContain("from('rfq_quotes')");
  });

  it('uses no `any` / `as any` / ts suppressions', () => {
    for (const src of [SERVICES, TYPES]) {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    }
  });

  it('submit sets status=submitted (not draft) and a submitted_at timestamp', () => {
    expect(SERVICES).toMatch(/status:\s*'submitted'/);
    expect(SERVICES).toContain('submitted_at:');
  });

  it('withdraw sets status=withdrawn', () => {
    expect(SERVICES).toMatch(/status:\s*'withdrawn'/);
  });

  it('types are derived from the generated Database schema', () => {
    expect(TYPES).toContain("from '@/integrations/supabase/types'");
    expect(TYPES).toContain("['opportunity_bids']");
  });
});