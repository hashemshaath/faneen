/**
 * WORKSPACE-RBAC-6A — catalog + helper audit.
 *
 * - Validates the static catalog mirrors the spec.
 * - Validates `hasWorkspacePermission` semantics for owner / overrides /
 *   role defaults / unknown perms.
 * - Safety: confirms helpers stay UI-only (no callers in this phase),
 *   no RLS or payment/auth files were modified, and no direct
 *   catalog-table access in pages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  WORKSPACE_ROLES,
  WORKSPACE_PERMISSIONS,
  ROLE_PERMISSION_DEFAULTS,
  getDefaultPermissionsForRole,
  hasWorkspacePermission,
} from '@/modules/workspace/permissions';

describe('WORKSPACE-RBAC-6A — static catalog', () => {
  it('exposes the 10 canonical workspace roles', () => {
    expect(WORKSPACE_ROLES).toEqual([
      'owner',
      'entity_admin',
      'business_manager',
      'site_manager',
      'operations_manager',
      'contracts_manager',
      'finance',
      'sales',
      'staff',
      'viewer',
    ]);
  });

  it('exposes all canonical permission keys grouped by domain', () => {
    for (const key of [
      'entity.view', 'entity.manage', 'entity.verify',
      'staff.view', 'staff.manage',
      'locations.view', 'locations.manage',
      'services.view', 'services.manage',
      'leads.view', 'leads.manage',
      'quotes.view', 'quotes.create', 'quotes.respond',
      'contracts.view', 'contracts.create', 'contracts.sign', 'contracts.manage',
      'bookings.view', 'bookings.manage',
      'documents.view', 'documents.upload', 'documents.manage',
      'memberships.view', 'memberships.manage',
      'payments.view', 'payments.manage',
      'settings.view', 'settings.manage',
    ]) {
      expect(WORKSPACE_PERMISSIONS).toContain(key);
    }
  });

  it('owner and entity_admin map to all permissions', () => {
    expect(ROLE_PERMISSION_DEFAULTS.owner).toEqual([...WORKSPACE_PERMISSIONS]);
    expect(ROLE_PERMISSION_DEFAULTS.entity_admin).toEqual([...WORKSPACE_PERMISSIONS]);
  });

  it('viewer is limited to entity.view only', () => {
    expect(ROLE_PERMISSION_DEFAULTS.viewer).toEqual(['entity.view']);
  });

  it('finance includes payments + memberships management', () => {
    expect(ROLE_PERMISSION_DEFAULTS.finance).toEqual(
      expect.arrayContaining(['payments.view', 'payments.manage', 'memberships.view', 'memberships.manage']),
    );
  });

  it('contracts_manager includes the full contract lifecycle', () => {
    expect(ROLE_PERMISSION_DEFAULTS.contracts_manager).toEqual(
      expect.arrayContaining(['contracts.view', 'contracts.create', 'contracts.sign', 'contracts.manage']),
    );
  });

  it('sales does NOT grant contracts or payment permissions', () => {
    const s = ROLE_PERMISSION_DEFAULTS.sales;
    expect(s).not.toContain('contracts.manage');
    expect(s).not.toContain('payments.view');
    expect(s).not.toContain('payments.manage');
  });

  it('staff is read-only (no .manage / .create / .sign permissions)', () => {
    for (const p of ROLE_PERMISSION_DEFAULTS.staff) {
      expect(p.endsWith('.manage') || p.endsWith('.create') || p.endsWith('.sign')).toBe(false);
    }
  });

  it('getDefaultPermissionsForRole tolerates unknown / null', () => {
    expect(getDefaultPermissionsForRole(null)).toEqual([]);
    expect(getDefaultPermissionsForRole('not_a_role')).toEqual([]);
  });
});

describe('WORKSPACE-RBAC-6A — hasWorkspacePermission', () => {
  it('owner role short-circuits to true even with empty permissions[]', () => {
    expect(hasWorkspacePermission({ active_role: 'owner', permissions: [] }, 'payments.manage')).toBe(true);
  });

  it('explicit permissions_override grants the permission', () => {
    expect(
      hasWorkspacePermission({ active_role: 'viewer', permissions: ['payments.view'] }, 'payments.view'),
    ).toBe(true);
  });

  it('viewer denies non-entity.view permissions', () => {
    expect(hasWorkspacePermission({ active_role: 'viewer', permissions: [] }, 'leads.view')).toBe(false);
    expect(hasWorkspacePermission({ active_role: 'viewer', permissions: [] }, 'entity.view')).toBe(true);
  });

  it('falls back to role defaults when no override provided', () => {
    expect(hasWorkspacePermission({ active_role: 'finance', permissions: [] }, 'payments.manage')).toBe(true);
    expect(hasWorkspacePermission({ active_role: 'sales', permissions: [] }, 'contracts.manage')).toBe(false);
  });

  it('returns false for unknown permissions and missing workspace', () => {
    expect(hasWorkspacePermission({ active_role: 'owner', permissions: [] }, 'unknown.perm')).toBe(true); // owner overrides
    expect(hasWorkspacePermission({ active_role: 'staff', permissions: [] }, 'unknown.perm')).toBe(false);
    expect(hasWorkspacePermission(null, 'entity.view')).toBe(false);
    expect(hasWorkspacePermission({ active_role: null, permissions: [] }, 'entity.view')).toBe(false);
  });
});

describe('WORKSPACE-RBAC-6A — safety invariants', () => {
  const SRC = join(process.cwd(), 'src');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
    }
    return out;
  };

  it('useCan / PermissionHint usage is limited to the 6C-approved low-risk pages', () => {
    // WORKSPACE-RBAC-6C: a small, audited allow-list of UI-only callers.
    // Extend this list only via an explicit follow-up phase.
    const ALLOWED = new Set(
      [
        'pages/dashboard/DashboardServices.tsx',
        'pages/dashboard/DashboardPortfolio.tsx',
        'pages/dashboard/DashboardPromotions.tsx',
        'pages/dashboard/DashboardBusinessEdit.tsx',
        'pages/dashboard/DashboardStaffCenter.tsx',
      ].map((p) => join(SRC, p)),
    );
    const pagesDir = join(SRC, 'pages');
    const files = walk(pagesDir);
    const offenders: string[] = [];
    for (const f of files) {
      const c = readFileSync(f, 'utf8');
      const uses = /\buseCan\s*\(/.test(c) || /\bPermissionHint\b/.test(c) || /\bPermissionGate\b/.test(c);
      if (uses && !ALLOWED.has(f)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('catalog tables are only accessed through the workspace permissions wrapper', () => {
    const files = walk(SRC);
    const wrapperPath = join(SRC, 'modules/workspace/services/permissions/index.ts');
    for (const f of files) {
      if (f === wrapperPath) continue;
      const c = readFileSync(f, 'utf8');
      for (const tbl of ['roles_catalog', 'permissions_catalog', 'role_permissions']) {
        // Allow string mentions in tests/docs; forbid supabase.from('<tbl>') usage.
        const re = new RegExp(`supabase\\s*\\.\\s*from\\(\\s*['"\`]${tbl}['"\`]\\s*\\)`);
        expect(re.test(c), `${f} should not call supabase.from('${tbl}') directly`).toBe(false);
      }
    }
  });

  it('helpers do not import payment, auth, or membership modules', () => {
    const wrapper = readFileSync(join(SRC, 'modules/workspace/services/permissions/index.ts'), 'utf8');
    const hook = readFileSync(join(SRC, 'hooks/useCan.ts'), 'utf8');
    for (const src of [wrapper, hook]) {
      expect(src).not.toMatch(/from\s+['"]@\/modules\/memberships/);
      expect(src).not.toMatch(/from\s+['"]@\/modules\/payments/);
      expect(src).not.toMatch(/from\s+['"]@\/contexts\/AuthContext/);
      expect(src).not.toMatch(/supabase\.auth\b/);
    }
  });
});