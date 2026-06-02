/**
 * ADMIN-DIRECT-TOGGLE-INTEGRATION-1
 *
 * Integration coverage for the `/admin/system-access` direct-toggle flow.
 *
 * Covers every scope (global / account_type / entity / user) plus the
 * reset path, asserting that:
 *   - admin writes are NEVER blocked by membership when `bypassMembership`
 *     is true (the console always sets this for admins)
 *   - non-admin writes are rejected up-front with a clear bilingual reason
 *   - the SECURITY DEFINER RPC is invoked with the right arguments
 *   - `useBusinessAccessInvalidation` widely invalidates every consumer
 *     (sidebar, feature gates, workspace, command palette, dashboard)
 *     so the change is reflected immediately across the app
 *   - the audit/reason tag `[admin direct]` is preserved on RPC payloads
 *   - the source AdminSystemAccess page does not gate admin toggles
 *     behind any inline "module unavailable" UI block
 */
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { updateBusinessSystemAccess } from '@/modules/systemAccess/services/updateBusinessSystemAccess';

const rpcMock = supabase.rpc as unknown as Mock;

function rpcOk() {
  rpcMock.mockImplementation(async (_fn: string) => ({ data: null, error: null }));
}

/** Make `has_membership_feature` answer "false" so we can verify bypass. */
function rpcBlocksMembership() {
  rpcMock.mockImplementation(async (fn: string) => {
    if (fn === 'has_membership_feature') return { data: false, error: null };
    return { data: null, error: null };
  });
}

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf8');

describe('ADMIN-DIRECT-TOGGLE-INTEGRATION-1 — toggle scenarios', () => {
  beforeEach(() => { rpcMock.mockReset(); });

  it('global scope: admin enable writes without any membership check', async () => {
    rpcOk();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'contracts',
      scopeType: 'global_default',
      scopeValue: null,
      enabled: true,
      isAdmin: true,
      reason: '[admin direct] system-access console',
    });
    expect(res.ok).toBe(true);
    expect(res.blocked_by_membership).toBe(false);
    expect(res.changed).toBe(true);
    expect(res.audit_recorded).toBe(true);
    // No membership check ever ran for a global scope
    const calls = rpcMock.mock.calls.map(c => c[0]);
    expect(calls).not.toContain('has_membership_feature');
    expect(calls).toContain('admin_set_module_override');
  });

  it('account_type scope: admin disable bypasses membership and writes via RPC', async () => {
    rpcOk();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'brands',
      scopeType: 'account_type',
      scopeValue: 'provider',
      enabled: false,
      isAdmin: true,
      reason: '[admin direct] system-access console',
    });
    expect(res.ok).toBe(true);
    const setCall = rpcMock.mock.calls.find(c => c[0] === 'admin_set_module_override');
    expect(setCall?.[1]).toMatchObject({
      _module_key: 'brands',
      _scope_type: 'account_type',
      _scope_value: 'provider',
      _enabled: false,
      _reason: '[admin direct] system-access console',
    });
  });

  it('entity scope: admin enable is NOT blocked when membership says false but bypassMembership=true', async () => {
    rpcBlocksMembership();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'procurement',
      scopeType: 'entity',
      scopeValue: 'biz_1',
      enabled: true,
      isAdmin: true,
      bypassMembership: true,
      actingUserId: 'admin_u',
      businessId: 'biz_1',
      reason: '[admin direct] system-access console',
    });
    expect(res.ok).toBe(true);
    expect(res.blocked_by_membership).toBe(false);
    // Membership pre-check must be skipped when bypassMembership is true.
    const calls = rpcMock.mock.calls.map(c => c[0]);
    expect(calls).not.toContain('has_membership_feature');
    expect(calls).toContain('admin_set_module_override');
  });

  it('entity scope without bypass: still blocks on explicit membership=false', async () => {
    rpcBlocksMembership();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'procurement',
      scopeType: 'entity',
      scopeValue: 'biz_1',
      enabled: true,
      isAdmin: true,
      bypassMembership: false,
      actingUserId: 'admin_u',
      businessId: 'biz_1',
    });
    expect(res.ok).toBe(false);
    expect(res.blocked_by_membership).toBe(true);
    expect(res.reason_ar).toMatch(/الباقة/);
    expect(res.reason_en).toMatch(/plan/i);
    // No write occurred
    expect(rpcMock.mock.calls.some(c => c[0] === 'admin_set_module_override')).toBe(false);
  });

  it('user scope: admin enable bypasses membership and writes', async () => {
    rpcBlocksMembership();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'work_orders',
      scopeType: 'user',
      scopeValue: 'user_1',
      enabled: true,
      isAdmin: true,
      bypassMembership: true,
      actingUserId: 'admin_u',
      businessId: 'biz_1',
    });
    expect(res.ok).toBe(true);
    expect(rpcMock.mock.calls.some(c => c[0] === 'admin_set_module_override')).toBe(true);
  });

  it('reset path: admin clears override via dedicated RPC', async () => {
    rpcOk();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'contracts',
      scopeType: 'entity',
      scopeValue: 'biz_1',
      enabled: false,
      reset: true,
      isAdmin: true,
      bypassMembership: true,
      businessId: 'biz_1',
    });
    expect(res.ok).toBe(true);
    const calls = rpcMock.mock.calls.map(c => c[0]);
    expect(calls).toContain('admin_clear_module_override');
    expect(calls).not.toContain('admin_set_module_override');
  });

  it('non-admin caller is rejected with a bilingual reason and never writes', async () => {
    rpcOk();
    const res = await updateBusinessSystemAccess({
      moduleKey: 'contracts',
      scopeType: 'entity',
      scopeValue: 'biz_1',
      enabled: true,
      isAdmin: false,
    });
    expect(res.ok).toBe(false);
    expect(res.changed).toBe(false);
    expect(res.reason_ar).toBeTruthy();
    expect(res.reason_en).toMatch(/admin/i);
    expect(rpcMock.mock.calls.length).toBe(0);
  });
});

describe('ADMIN-DIRECT-TOGGLE-INTEGRATION-1 — immediate cross-section sync', () => {
  it('useBusinessAccessInvalidation invalidates every effective-access consumer', () => {
    const src = read('src/hooks/useBusinessAccessInvalidation.ts');
    for (const key of [
      'system-modules',
      'system-module-overrides',
      'system-access',
      'visible-modules',
      'catalog',
      'feature-gate',
      'membership-subscription',
      'membership-usage',
      'workspace',
      'active-workspace',
      'dashboard-modules',
      'command-palette',
    ]) {
      expect(src).toContain(key);
    }
  });

  it('admin page wires invalidation + audit refresh after every successful write', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/invalidateAccess\(/);
    expect(src).toMatch(/includeAudit:\s*true/);
    // Optimistic UI flip + rollback on error
    expect(src).toMatch(/onMutate/);
    expect(src).toMatch(/qc\.setQueryData/);
    expect(src).toMatch(/ctx\?\.previous/);
  });
});

describe('ADMIN-DIRECT-TOGGLE-INTEGRATION-1 — permission boundary', () => {
  it('admin page passes bypassMembership=!!isAdmin for every toggle call', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/bypassMembership:\s*!!isAdmin/);
    expect(src).toMatch(/\[admin direct\]/);
  });

  it('admin page does not render any blocking "module unavailable" interstitial', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).not.toMatch(/blockedAttempt/);
    expect(src).not.toMatch(/super-admin-bypass-card/);
    // The only refusal path for admins is the core-module guard
    expect(src).toMatch(/Core modules cannot be disabled/);
  });

  it('admin page never writes directly to the override or audit tables (RPC only)', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).not.toMatch(/from\(['"]system_module_overrides['"]\)/);
    expect(src).not.toMatch(/from\(['"]system_module_audit_log['"]\)/);
  });

  it('update wrapper never references the service-role key', () => {
    const src = read('src/modules/systemAccess/services/updateBusinessSystemAccess.ts');
    expect(src).not.toMatch(/SERVICE_ROLE/);
  });
});

describe('ADMIN-DIRECT-TOGGLE-INTEGRATION-1 — audit log UI', () => {
  it('AuditLogPanel surfaces [admin direct] tagging, scope filter, and search', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/audit-admin-direct-tag/);
    expect(src).toMatch(/audit-scope-filter/);
    expect(src).toMatch(/audit-search-input/);
    expect(src).toMatch(/audit-before-after/);
    // Filter chip for admin-direct entries
    expect(src).toMatch(/admin_direct/);
  });

  it('AuditLogPanel resolves business + user identities by ref/name for readable rows', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    expect(src).toMatch(/businessById/);
    expect(src).toMatch(/userById/);
    // Audit view eagerly loads businesses + users for search/labels
    expect(src).toMatch(/viewTab === 'audit'/);
  });
});