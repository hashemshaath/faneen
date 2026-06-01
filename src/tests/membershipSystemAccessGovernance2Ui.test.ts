/**
 * MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2-UI — static UI guards.
 *
 * File-shape assertions only; render-level integration is covered by
 * the existing Governance-1 RPC tests + Playwright admin smoke.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2-UI', () => {
  it('exposes a plan × module matrix page wired to the super-admin RPC', () => {
    const src = read('src/pages/admin/AdminMembershipPlanModules.tsx');
    expect(src).toContain('listMembershipPlanModules');
    expect(src).toContain('superAdminSetMembershipPlanModule');
    expect(src).toContain('listAdminMembershipPlans');
    // Locks core modules client-side.
    expect(src).toMatch(/is_core[\s\S]*Core module cannot be disabled/);
    // Renders the matrix table for tests / DOM hooks.
    expect(src).toContain('data-testid="plan-modules-matrix"');
    // Invalidates the relevant query keys after mutate.
    expect(src).toContain("['membership-plan-modules-matrix']");
    expect(src).toContain("['system-modules']");
    expect(src).toContain("['visible-modules']");
    // No direct table writes — RPC only.
    expect(src).not.toMatch(/from\(['"]membership_plan_modules['"]\)/);
  });

  it('registers the matrix in the admin memberships hub', () => {
    const hub = read('src/pages/admin/AdminMembershipsHub.tsx');
    expect(hub).toContain("import('./AdminMembershipPlanModules')");
    expect(hub).toContain('Plan Modules Matrix');
    expect(hub).toContain('مصفوفة الخدمات');
  });

  it('exposes a super-admin only business override panel with mandatory reason', () => {
    const src = read('src/components/admin/system-access/SuperAdminBusinessOverridePanel.tsx');
    expect(src).toContain('superAdminSetBusinessModuleOverride');
    // Reason is enforced before submit.
    expect(src).toMatch(/reason\.trim\(\)\.length > 0/);
    expect(src).toMatch(/Reason is required|السبب مطلوب/);
    // Core modules cannot be disabled via this panel.
    expect(src).toMatch(/is_core[\s\S]*Core module cannot be disabled/);
    // Super admin gate is enforced in the UI.
    expect(src).toContain('isSuperAdmin');
    expect(src).toMatch(/Super Admin (?:only|required)/);
    // Recent audit is rendered.
    expect(src).toContain('listAuditLog');
    // No direct table writes — RPC only.
    expect(src).not.toMatch(/from\(['"]system_module_overrides['"]\)/);
  });

  it('wires the override panel into /admin/system-access for super admins only', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toContain('SuperAdminBusinessOverridePanel');
    // Tab is conditionally rendered behind isSuperAdmin.
    expect(src).toMatch(/isSuperAdmin[\s\S]*super_override/);
    expect(src).toContain("'super_override'");
  });
});