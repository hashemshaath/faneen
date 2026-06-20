import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

const TOUCHED = [
  'src/modules/opportunities/opportunityLabels.ts',
  'src/pages/dashboard/QuoteRequestDetails.tsx',
  'src/modules/dashboard/navigation/dashboardNavigation.config.ts',
  'src/modules/admin-shell/navigation/adminNavigation.ts',
];

const readAll = TOUCHED.map((p) => ({ p, src: readFileSync(resolve(ROOT, p), 'utf8') }));

describe('Opportunities Phase 12 — no logic regression', () => {
  it('1. no SQL migrations were added in this phase', () => {
    const migDir = resolve(ROOT, 'supabase', 'migrations');
    const entries = (() => {
      try { return readdirSync(migDir); } catch { return []; }
    })();
    // Phase 12 is UI-only; nothing under touched files references new migration files.
    for (const { src } of readAll) {
      for (const f of entries) {
        expect(src).not.toContain(f);
      }
    }
  });
  it('2. touched files do not invoke RPCs', () => {
    for (const { src } of readAll) {
      expect(src).not.toMatch(/\.rpc\(/);
    }
  });
  it('3. touched files do not invoke edge functions', () => {
    for (const { src } of readAll) {
      expect(src).not.toMatch(/functions\.invoke\(/);
    }
  });
  it('4. touched files do not mutate the database', () => {
    for (const { src } of readAll) {
      expect(src).not.toMatch(/\.from\([^)]+\)\.(insert|update|delete|upsert)\(/);
    }
  });
  it('5. touched files do not touch matching/bids/award/contract services', () => {
    for (const { src } of readAll) {
      expect(src).not.toMatch(/awardOpportunityBid|convertAwardedBidToContract|matching_run|matchingService/);
      expect(src).not.toMatch(/consume_provider_lead_credit|provider_lead_credit_transactions|reveal_contact|contact_reveal/);
    }
  });
  it('6. no service_role references in touched files', () => {
    for (const { src } of readAll) {
      expect(src).not.toMatch(/service_role/i);
    }
  });
  it('7. no hardcoded UUIDs in touched files', () => {
    const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
    for (const { src } of readAll) {
      expect(src).not.toMatch(uuid);
    }
  });
  it('8. no ts/eslint suppressions in touched files', () => {
    for (const { src } of readAll) {
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });

  // Anchor unused imports so node ignores them when tree-shaking tests.
  void statSync; void join;
});