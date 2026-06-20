import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

function readPhase11Files(): { path: string; body: string }[] {
  const out: { path: string; body: string }[] = [];
  const paths = [
    'src/modules/opportunities/timeline/OpportunityTimeline.tsx',
    'src/modules/opportunities/timeline/index.ts',
  ];
  for (const p of paths) {
    out.push({ path: p, body: readFileSync(resolve(ROOT, p), 'utf8') });
  }
  return out;
}

function listMigrations(): string[] {
  const dir = resolve(ROOT, 'supabase/migrations');
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.sql'));
  } catch {
    return [];
  }
}

describe('Opportunities Phase 11 — no logic regression', () => {
  const phase11 = readPhase11Files();

  it('1. introduces no new DB migrations in this phase', () => {
    // Phase 11 is visual-only. The migration list MUST NOT include a
    // file mentioning «phase11» / «phase_11» / «opportunity_timeline».
    const migs = listMigrations();
    const forbidden = migs.filter((m) =>
      /phase[_-]?11|opportunity_timeline|opportunities_phase11/i.test(m),
    );
    expect(forbidden).toEqual([]);
  });

  it('2. introduces no new RPC calls', () => {
    for (const f of phase11) {
      expect(f.body, f.path).not.toMatch(/supabase\.rpc\(/);
    }
  });

  it('3. introduces no new edge function invocations', () => {
    for (const f of phase11) {
      expect(f.body, f.path).not.toMatch(/functions\.invoke\(/);
    }
  });

  it('4. introduces no new mutations / writes', () => {
    for (const f of phase11) {
      expect(f.body, f.path).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
      expect(f.body, f.path).not.toMatch(/useMutation\b/);
      expect(f.body, f.path).not.toMatch(
        /awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|withdrawOpportunityBid/,
      );
    }
  });

  it('5. never references service_role', () => {
    for (const f of phase11) {
      expect(f.body, f.path).not.toMatch(/service_role/i);
    }
  });

  it('6. forbids any / as any in new files', () => {
    for (const f of phase11) {
      expect(f.body, f.path).not.toMatch(/:\s*any\b/);
      expect(f.body, f.path).not.toMatch(/\bas\s+any\b/);
    }
  });

  it('7. forbids ts suppression directives in new files', () => {
    for (const f of phase11) {
      expect(f.body, f.path).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    }
  });

  // sanity — make sure the test actually scanned files
  it('scanned the expected Phase 11 files', () => {
    expect(phase11.length).toBeGreaterThan(0);
    for (const f of phase11) {
      const abs = resolve(ROOT, f.path);
      expect(statSync(abs).isFile()).toBe(true);
      expect(join(ROOT, f.path)).toContain('opportunities');
    }
  });
});