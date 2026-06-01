/**
 * MEMBERSHIP-GOVERNANCE-FINAL-AUDIT
 *
 * End-to-end source-level assertions tying together super-admin override,
 * plan-module matrix, system-access sync, FeatureGate beneficiary effect,
 * and audit-log privacy. Complements the per-phase suites instead of
 * duplicating their assertions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const FILES = walk(ROOT);
const NON_TEST_FILES = FILES.filter(
  (f) => !/\/tests\//.test(f) && !/__tests__/.test(f) && !/\.test\.tsx?$/.test(f),
);

function read(p: string): string {
  return readFileSync(p, 'utf8');
}

describe('MEMBERSHIP-GOVERNANCE-FINAL-AUDIT — wrapper-only governance access', () => {
  const GOVERNANCE_RPCS = [
    'super_admin_set_business_module_override',
    'super_admin_set_membership_plan_module',
    'list_membership_plan_modules',
  ];

  it('product code never invokes governance RPCs directly outside the wrapper module', () => {
    const wrapper = join('src', 'modules', 'systemAccess');
    const offenders: string[] = [];
    for (const file of NON_TEST_FILES) {
      if (file.includes(wrapper)) continue;
      if (file.endsWith('integrations/supabase/types.ts')) continue;
      const src = read(file);
      for (const rpc of GOVERNANCE_RPCS) {
        if (src.includes(`'${rpc}'`) || src.includes(`"${rpc}"`)) {
          offenders.push(`${file} → ${rpc}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('governance table membership_plan_modules is not written from UI/product code', () => {
    const offenders: string[] = [];
    for (const file of NON_TEST_FILES) {
      const src = read(file);
      if (
        /\.from\(['"]membership_plan_modules['"]\)\s*\.(insert|update|upsert|delete)/.test(src)
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('MEMBERSHIP-GOVERNANCE-FINAL-AUDIT — audit log privacy', () => {
  it('listAuditLog is only called from admin-scoped surfaces', () => {
    const callers = NON_TEST_FILES.filter((f) => read(f).includes('listAuditLog('));
    expect(callers.length).toBeGreaterThan(0);
    for (const f of callers) {
      // Must be under /admin/ pages or admin components
      const isAdminSurface =
        f.includes('/admin/') ||
        f.includes('/pages/admin/') ||
        f.endsWith('src/modules/systemAccess/index.ts');
      expect(isAdminSurface, `listAuditLog leaked into non-admin surface: ${f}`).toBe(true);
    }
  });
});

describe('MEMBERSHIP-GOVERNANCE-FINAL-AUDIT — plan-module matrix beneficiary effect', () => {
  const matrix = read('src/pages/admin/AdminMembershipPlanModules.tsx');

  it('invalidates feature-gate beneficiary surfaces after plan-module toggle', () => {
    // After SA toggles a plan flag, every consumer of effective access
    // must refresh — not just the matrix itself. We do this via the
    // shared useBusinessAccessInvalidation hook.
    expect(matrix).toMatch(/useBusinessAccessInvalidation/);
    expect(matrix).toMatch(/invalidateAccess\(\s*\{\s*includeAudit:\s*true\s*\}\s*\)/);
  });

  it('still refreshes the matrix and visible modules locally', () => {
    expect(matrix).toMatch(/membership-plan-modules-matrix/);
    expect(matrix).toMatch(/visible-modules/);
    expect(matrix).toMatch(/effective-business-access/);
  });

  it('locks core modules in the UI', () => {
    expect(matrix).toMatch(/is_core/);
    expect(matrix).toMatch(/Core module cannot be disabled|لا يمكن تعطيل النظام الأساسي/);
  });
});

describe('MEMBERSHIP-GOVERNANCE-FINAL-AUDIT — super-admin override panel', () => {
  const panel = read('src/components/admin/system-access/SuperAdminBusinessOverridePanel.tsx');

  it('requires non-empty reason before submit', () => {
    expect(panel).toMatch(/reason\.trim\(\)\.length\s*>\s*0/);
  });

  it('locks core modules from being disabled', () => {
    expect(panel).toMatch(/is_core[\s\S]{0,80}!enabled|!enabled[\s\S]{0,80}is_core/);
  });

  it('gates mutations behind isSuperAdmin', () => {
    expect(panel).toMatch(/isSuperAdmin/);
  });

  it('invalidates beneficiary caches and audit panel on success', () => {
    expect(panel).toMatch(/invalidateAccess\(\s*\{[^}]*includeAudit:\s*true/);
    expect(panel).toMatch(/system-module-audit-recent/);
  });
});

describe('MEMBERSHIP-GOVERNANCE-FINAL-AUDIT — FeatureGate CTA branching', () => {
  const gate = read('src/components/membership/FeatureGate.tsx');

  it('routes upgrade CTA to membershipPathOrNull when visible', () => {
    expect(gate).toMatch(/membershipVisibility\.membershipPathOrNull/);
    expect(gate).toMatch(/to=\{membershipVisibility\.membershipPathOrNull\}/);
  });

  it('falls back to /contact when membership module is hidden', () => {
    expect(gate).toMatch(/to="\/contact"/);
  });
});

describe('MEMBERSHIP-GOVERNANCE-FINAL-AUDIT — public surfaces stay clean', () => {
  const publicSurfaces = [
    'src/pages/Membership.tsx',
    'src/components/membership/MembershipPlanModuleMatrix.tsx',
    'src/components/membership/PlanCard.tsx',
    'src/components/membership/MembershipHeader.tsx',
  ];

  it('public membership surfaces do not link into /admin or expose audit logs', () => {
    for (const f of publicSurfaces) {
      const src = read(f);
      expect(src, `${f} leaks /admin link`).not.toMatch(/to=["']\/admin/);
      expect(src, `${f} leaks audit log`).not.toMatch(/listAuditLog|system_module_audit_log/);
    }
  });
});