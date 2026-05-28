/**
 * ORG-RBAC-STRUCTURE-7 — safety guardrails.
 *
 * Confirms this phase remained additive:
 *  - No migrations were authored under this phase id.
 *  - The new orgStructure helper imports nothing from auth, memberships,
 *    payments, or supabase client (pure module).
 *  - No page added a direct supabase.from('business_staff') call beyond
 *    the pre-existing audited allow-list.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ORG = join(ROOT, 'src/modules/workspace/governance/orgStructure.ts');

describe('ORG-RBAC-STRUCTURE-7 — guardrails', () => {
  it('orgStructure helper is a pure module', () => {
    const src = readFileSync(ORG, 'utf8');
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(src).not.toMatch(/@\/contexts\/AuthContext/);
    expect(src).not.toMatch(/@\/modules\/payments/);
    expect(src).not.toMatch(/@\/modules\/memberships/);
    expect(src).not.toMatch(/supabase\.auth\b/);
    // No React/hooks: this is a pure data module.
    expect(src).not.toMatch(/from\s+['"]react['"]/);
  });

  it('no migration files were added for ORG-RBAC-STRUCTURE-7 (phase is UI-only)', () => {
    const dir = join(ROOT, 'supabase/migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const offenders: string[] = [];
    for (const f of files) {
      const c = readFileSync(join(dir, f), 'utf8');
      if (/ORG-RBAC-STRUCTURE-7\b/i.test(c)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('orgStructure exports remain stable for downstream diagnostics', () => {
    const src = readFileSync(ORG, 'utf8');
    for (const sym of [
      'ORG_ROLE_HIERARCHY',
      'compareRoleRank',
      'validateBusinessInvariants',
      'computeEffectiveBusinessIds',
    ]) {
      expect(src).toMatch(new RegExp(`export[^\\n]*\\b${sym}\\b`));
    }
  });

  // Phase-8 tightened this from a budget to zero. See
  // orgRbacStructure8.businessStaffAccess.test.ts for the canonical check.
  it('business_staff direct supabase.from() callsites in pages is zero', () => {
    const pagesDir = join(ROOT, 'src/pages');
    const walk = (d: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        const st = statSync(p);
        if (st.isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx)$/.test(e)) out.push(p);
      }
      return out;
    };
    const files = walk(pagesDir);
    const offenders: string[] = [];
    const re = /supabase\s*\.\s*from\s*\(\s*['"`]business_staff['"`]\s*\)/;
    for (const f of files) {
      if (re.test(readFileSync(f, 'utf8'))) offenders.push(f.replace(ROOT + '/', ''));
    }
    expect(offenders).toEqual([]);
  });
});