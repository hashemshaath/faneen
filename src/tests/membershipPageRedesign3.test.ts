/**
 * MEMBERSHIP-PAGE-REDESIGN-2 (module-driven matrix + JSON-LD copy fix).
 *
 * Static guards — render flow is covered by membershipPageRedesign2 +
 * membershipPageGovernanceRedesign1 suites.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMBERSHIP-PAGE-REDESIGN-2 — module matrix + JSON-LD safety', () => {
  it('exposes a module-driven plan matrix using list_membership_plan_modules', () => {
    const src = read('src/components/membership/MembershipPlanModuleMatrix.tsx');
    expect(src).toContain('listMembershipPlanModules');
    expect(src).toContain('listActiveMembershipPlans');
    expect(src).toContain('data-testid="membership-plan-module-matrix"');
    // Core modules render the locked icon (always-on).
    expect(src).toMatch(/is_core[\s\S]*Lock/);
    // No invented numeric limits or fake SLA in the component copy.
    expect(src).not.toMatch(/\bSLA\b/);
    // The safe disclaimer says "does NOT guarantee" — explicit safety.
    expect(src).toMatch(/does not guarantee|لا تعني[^.]*ضمان/);
    // No direct table writes / reads — RPC only.
    expect(src).not.toMatch(/from\(['"]membership_plan_modules['"]\)/);
  });

  it('mounts the module matrix on the public membership page', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('MembershipPlanModuleMatrix');
    // Must sit inside the lazy comparison block, after the limits matrix.
    const compareIdx = page.indexOf('id="compare"');
    const moduleIdx = page.indexOf('<MembershipPlanModuleMatrix');
    expect(compareIdx).toBeGreaterThan(-1);
    expect(moduleIdx).toBeGreaterThan(compareIdx);
  });

  it('removes the contradictory "beta / manual upgrade" claim from the JSON-LD FAQ', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).not.toContain('حالياً النسخة تجريبية');
    expect(page).not.toContain('We are in beta');
    expect(page).not.toContain('upgrades are activated manually');
    // The replacement payment copy mentions Moyasar (matches the human FAQ).
    expect(page).toMatch(/Moyasar/);
    expect(page).toMatch(/مُيسّر/);
  });

  it('preserves the public claim-safety disclaimer on the page', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('ولا تعني ضمان الطلبات أو المبيعات');
  });

  it('preserves the membership visibility guard import', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('useMembershipVisibility');
    expect(page).toContain('MembershipUnavailableState');
  });
});