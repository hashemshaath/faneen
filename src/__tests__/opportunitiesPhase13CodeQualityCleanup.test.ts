import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const MOD = resolve(ROOT, 'src/modules/opportunities');

/** Recursively collect .ts/.tsx files under a directory. */
const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collect(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
};

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const MODULE_FILES = collect(MOD).map((p) => ({
  path: p.replace(ROOT + '/', ''),
  src: readFileSync(p, 'utf8'),
  code: stripComments(readFileSync(p, 'utf8')),
}));

const TEST_FILES = readdirSync(resolve(ROOT, 'src/__tests__'))
  .filter((f) => /^opportunities.*\.test\.tsx?$/.test(f))
  .map((f) => ({
    path: `src/__tests__/${f}`,
    src: readFileSync(resolve(ROOT, 'src/__tests__', f), 'utf8'),
  }));

describe('Opportunities Phase 13 — code quality + cleanup', () => {
  it('1. no any / as any inside src/modules/opportunities', () => {
    for (const f of MODULE_FILES) {
      expect(f.code, f.path).not.toMatch(/:\s*any\b/);
      expect(f.code, f.path).not.toMatch(/\bas\s+any\b/);
    }
  });

  it('2. no ts/eslint suppressions inside opportunities module', () => {
    for (const f of MODULE_FILES) {
      expect(f.src, f.path).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
      expect(f.src, f.path).not.toMatch(/eslint-disable/);
    }
  });

  it('3. no service_role references in opportunities module (frontend)', () => {
    for (const f of MODULE_FILES) {
      expect(f.code, f.path).not.toMatch(/service_role/i);
    }
  });

  it('4. provider_leads is never used as an opportunities data source', () => {
    for (const f of MODULE_FILES) {
      // Only the explicit guard constant + types may reference the literal.
      if (/types\.ts$|repository\.ts$|opportunityLabels\.ts$/.test(f.path)) continue;
      expect(f.code, f.path).not.toMatch(/from\(['"]provider_leads['"]\)/);
    }
  });

  it('5. no hardcoded UUIDs inside opportunities module', () => {
    const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
    for (const f of MODULE_FILES) {
      expect(f.code, f.path).not.toMatch(uuid);
    }
  });

  it('6. no hardcoded hex colors inside opportunities module', () => {
    for (const f of MODULE_FILES) {
      expect(f.code, f.path).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
  });

  it('7. no skipped or focused tests across opportunities test suites', () => {
    for (const f of TEST_FILES) {
      expect(f.src, f.path).not.toMatch(/\b(it|test|describe)\.skip\b/);
      expect(f.src, f.path).not.toMatch(/\b(it|test|describe)\.only\b/);
      expect(f.src, f.path).not.toMatch(/\bxit\(|\bxdescribe\(/);
    }
  });

  it('8. SLA thresholds are defined exactly once', () => {
    const sla = MODULE_FILES.filter((f) => /analytics\/sla\.ts$/.test(f.path));
    expect(sla.length).toBe(1);
    // Re-exports through analytics/index.ts are fine; no other module may
    // redefine the threshold constants.
    for (const f of MODULE_FILES) {
      if (/analytics\/sla\.ts$|analytics\/index\.ts$/.test(f.path)) continue;
      expect(f.code, f.path).not.toMatch(/export\s+const\s+SLA_THRESHOLDS\b/);
    }
  });

  it('9. opportunity labels are defined exactly once (single source of truth)', () => {
    const declarations = MODULE_FILES.filter((f) =>
      /export\s+const\s+OPPORTUNITY_LABELS\b/.test(f.code),
    );
    expect(declarations.length).toBe(1);
    expect(declarations[0].path).toMatch(/opportunityLabels\.ts$/);
  });

  it('10. analytics/export services contain no write operations', () => {
    const writers = MODULE_FILES.filter((f) => /analytics\//.test(f.path));
    expect(writers.length).toBeGreaterThan(0);
    for (const f of writers) {
      expect(f.code, f.path).not.toMatch(/\.from\([^)]+\)\.(insert|update|delete|upsert)\(/);
      expect(f.code, f.path).not.toMatch(/\.rpc\(/);
      expect(f.code, f.path).not.toMatch(/functions\.invoke\(/);
    }
  });
});