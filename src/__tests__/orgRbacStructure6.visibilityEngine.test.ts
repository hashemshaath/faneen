/**
 * ORG-RBAC-STRUCTURE-6 — Permission Resolution + Visibility Engine.
 *
 * Pure-logic + source-guardrail tests. Runtime hook coverage is exercised
 * indirectly through the resolver (which is what the hooks call). RLS
 * remains authoritative — these tests assert UI visibility decisions only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveEffectivePermissions,
  hasEffectivePermission,
  EFFECTIVE_PERMISSIONS_ALL_MARKER,
} from '@/modules/workspace/permissions/resolveEffectivePermissions';
import { WORKSPACE_ROUTE_PERMISSIONS, canViewWorkspaceRoute } from '@/modules/workspace/permissions/routePermissions';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('ORG-RBAC-STRUCTURE-6 — resolveEffectivePermissions', () => {
  it('returns empty for null input and never throws', () => {
    expect(() => resolveEffectivePermissions(null)).not.toThrow();
    expect(() => resolveEffectivePermissions(undefined)).not.toThrow();
    const r = resolveEffectivePermissions(null);
    expect(r.permissions).toEqual([]);
    expect(r.sources).toEqual({ role: [], delegated: [], teams: [], overrides: [] });
  });

  it('owner short-circuits to wildcard', () => {
    const r = resolveEffectivePermissions({ active_role: 'owner', permissions: [] });
    expect(r.permissions).toContain(EFFECTIVE_PERMISSIONS_ALL_MARKER);
    expect(r.sources.overrides).toContain(EFFECTIVE_PERMISSIONS_ALL_MARKER);
    expect(hasEffectivePermission(r, 'anything.weird')).toBe(true);
  });

  it('admin override grants wildcard regardless of role', () => {
    const r = resolveEffectivePermissions({ active_role: 'viewer', permissions: [], isAdmin: true });
    expect(hasEffectivePermission(r, 'contracts.manage')).toBe(true);
  });

  it('merges role defaults with explicit per-membership permissions', () => {
    const r = resolveEffectivePermissions({
      active_role: 'staff',
      permissions: ['contracts.manage'],
    });
    expect(r.sources.role).toContain('contracts.manage');
    expect(r.sources.role).toContain('entity.view'); // staff default
    expect(r.permissions).toContain('contracts.manage');
    expect(hasEffectivePermission(r, 'contracts.manage')).toBe(true);
  });

  it('includes active delegations', () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const r = resolveEffectivePermissions({
      active_role: 'viewer',
      permissions: [],
      delegations: [{ permissions: ['contracts.approve'], expires_at: future }],
    });
    expect(r.sources.delegated).toContain('contracts.approve');
    expect(hasEffectivePermission(r, 'contracts.approve')).toBe(true);
  });

  it('ignores expired delegations', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const r = resolveEffectivePermissions({
      active_role: 'viewer',
      permissions: [],
      delegations: [{ permissions: ['contracts.approve'], expires_at: past }],
    });
    expect(r.sources.delegated).toEqual([]);
    expect(hasEffectivePermission(r, 'contracts.approve')).toBe(false);
  });

  it('ignores revoked delegations', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const r = resolveEffectivePermissions({
      active_role: 'viewer',
      permissions: [],
      delegations: [{ permissions: ['x'], expires_at: future, revoked_at: new Date().toISOString() }],
    });
    expect(r.sources.delegated).toEqual([]);
  });

  it('ignores delegations that have not yet started', () => {
    const startFuture = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const expFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const r = resolveEffectivePermissions({
      active_role: 'viewer',
      permissions: [],
      delegations: [{ permissions: ['x'], starts_at: startFuture, expires_at: expFuture }],
    });
    expect(r.sources.delegated).toEqual([]);
  });

  it('aggregates active team memberships and skips inactive ones', () => {
    const r = resolveEffectivePermissions({
      active_role: 'viewer',
      permissions: [],
      teamMemberships: [
        { permissions: ['reports.export'], is_active: true },
        { permissions: ['contracts.approve'], is_active: false },
      ],
    });
    expect(r.sources.teams).toContain('reports.export');
    expect(r.sources.teams).not.toContain('contracts.approve');
  });

  it('dedupes merged permissions', () => {
    const r = resolveEffectivePermissions({
      active_role: 'staff',
      permissions: ['contracts.view'],
      teamMemberships: [{ permissions: ['contracts.view'], is_active: true }],
    });
    const count = r.permissions.filter((p) => p === 'contracts.view').length;
    expect(count).toBe(1);
  });

  it('hasEffectivePermission returns false on unknown/null', () => {
    const r = resolveEffectivePermissions({ active_role: 'viewer', permissions: [] });
    expect(hasEffectivePermission(r, '')).toBe(false);
    expect(hasEffectivePermission(r, null)).toBe(false);
    expect(hasEffectivePermission(null, 'x')).toBe(false);
  });
});

describe('ORG-RBAC-STRUCTURE-6 — route guard parity', () => {
  it('no-access route is registered and not in sidebar', () => {
    const desc = WORKSPACE_ROUTE_PERMISSIONS['/dashboard/no-access' as keyof typeof WORKSPACE_ROUTE_PERMISSIONS];
    expect(desc).toBeTruthy();
    expect(desc.sidebar).toBe(false);
    expect(desc.permissions).toEqual([]);
  });

  it('owner short-circuit preserved across mapped routes', () => {
    const ctx = { workspace: { active_role: 'owner', permissions: [] }, isAdmin: false };
    expect(canViewWorkspaceRoute('/dashboard/contracts', ctx)).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/settings/staff', ctx)).toBe(true);
  });

  it('admin override preserved across mapped routes', () => {
    const ctx = { workspace: { active_role: 'viewer', permissions: [] }, isAdmin: true };
    expect(canViewWorkspaceRoute('/dashboard/contracts', ctx)).toBe(true);
  });

  it('viewer without contracts.view is denied contracts route', () => {
    const ctx = { workspace: { active_role: 'viewer', permissions: [] }, isAdmin: false };
    expect(canViewWorkspaceRoute('/dashboard/contracts', ctx)).toBe(false);
  });
});

describe('ORG-RBAC-STRUCTURE-6 — source guardrails', () => {
  it('PermissionRouteGuard exists and redirects to /dashboard/no-access', () => {
    const src = read('src/components/auth/PermissionRouteGuard.tsx');
    expect(src).toMatch(/canViewWorkspaceRoute/);
    expect(src).toMatch(/\/dashboard\/no-access/);
    expect(src).toMatch(/Navigate/);
  });

  it('No-access page exists and is bilingual', () => {
    const src = read('src/pages/dashboard/DashboardNoAccess.tsx');
    expect(src).toMatch(/useBi/);
    expect(src).toMatch(/لا تملك صلاحية/);
    expect(src).toMatch(/do not have access/i);
  });

  it('No-access route is registered in App.tsx', () => {
    const src = read('src/App.tsx');
    expect(src).toMatch(/DashboardNoAccess/);
    expect(src).toMatch(/\/dashboard\/no-access/);
  });

  it('PermissionSection uses centralized matrix and never touches Supabase', () => {
    const src = read('src/components/workspace/PermissionSection.tsx');
    expect(src).toMatch(/usePermissionMatrix/);
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });

  it('Visibility hooks centralize the decision (no direct hardcoded role arrays in hooks file)', () => {
    const src = read('src/hooks/useVisibilityEngine.ts');
    // Allow references to canonical catalogs; forbid ad-hoc role arrays
    expect(src).not.toMatch(/\['owner'\s*,\s*'entity_admin'/);
    expect(src).toMatch(/canViewWorkspaceRoute/);
    expect(src).toMatch(/resolveEffectivePermissions/);
  });

  it('resolver never imports Supabase or React (pure)', () => {
    const src = read('src/modules/workspace/permissions/resolveEffectivePermissions.ts');
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(src).not.toMatch(/from\s+['"]react['"]/);
  });
});