import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

const UX_AUDIT_FILES = [
  'src/modules/opportunities/timeline/OpportunityTimeline.tsx',
  'src/modules/opportunities/timeline/index.ts',
];

function read(p: string) {
  return { path: p, body: readFileSync(resolve(ROOT, p), 'utf8') };
}

function listMigrations(): string[] {
  const dir = resolve(ROOT, 'supabase/migrations');
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.sql'));
  } catch {
    return [];
  }
}

describe('Opportunities Final UX Audit — no logic regression', () => {
  const files = UX_AUDIT_FILES.map(read);

  it('1. no DB migrations were introduced for this audit', () => {
    const migs = listMigrations();
    const forbidden = migs.filter((m) =>
      /final[_-]?ux[_-]?audit|opportunities_final_ux|pilot_readiness/i.test(m),
    );
    expect(forbidden).toEqual([]);
  });

  it('2. no RPC calls in audit-touched files', () => {
    for (const f of files) expect(f.body, f.path).not.toMatch(/supabase\.rpc\(/);
  });

  it('3. no edge function invocations in audit-touched files', () => {
    for (const f of files) expect(f.body, f.path).not.toMatch(/functions\.invoke\(/);
  });

  it('4. no write mutations in audit-touched files', () => {
    for (const f of files) {
      expect(f.body, f.path).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
      expect(f.body, f.path).not.toMatch(/useMutation\b/);
    }
  });

  it('5. never references service_role', () => {
    for (const f of files) expect(f.body, f.path).not.toMatch(/service_role/i);
  });

  it('6. no hardcoded UUIDs in audit-touched files', () => {
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    for (const f of files) expect(f.body, f.path).not.toMatch(uuid);
  });

  it('7. no hardcoded hex colors in audit-touched files', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of files) expect(f.body, f.path).not.toMatch(hex);
  });

  it('8. forbids any / as any', () => {
    for (const f of files) {
      expect(f.body, f.path).not.toMatch(/:\s*any\b/);
      expect(f.body, f.path).not.toMatch(/\bas\s+any\b/);
    }
  });

  it('9. forbids ts suppression directives', () => {
    for (const f of files) {
      expect(f.body, f.path).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    }
  });

  it('sanity — audit files exist on disk', () => {
    for (const f of files) {
      expect(statSync(resolve(ROOT, f.path)).isFile()).toBe(true);
    }
  });
});