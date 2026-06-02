import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/modules/systemAccess', () => ({
  setModuleOverride: vi.fn(async () => ({ ok: true })),
  clearModuleOverride: vi.fn(async () => ({ ok: true })),
}));

const hasMembershipFeature = vi.fn(async () => ({ data: false, error: null }));
vi.mock('@/modules/memberships', () => ({
  hasMembershipFeature: (...a: unknown[]) => hasMembershipFeature(...(a as [])),
}));

import { updateBusinessSystemAccess } from '@/modules/systemAccess/services/updateBusinessSystemAccess';

const baseArgs = {
  moduleKey: 'contracts',
  enabled: true,
  isAdmin: true,
  actingUserId: 'admin-user',
} as const;

describe('SYSTEM-ACCESS-DEFAULT-SCOPE-1 — scope-aware membership check', () => {
  beforeEach(() => {
    hasMembershipFeature.mockClear();
    hasMembershipFeature.mockResolvedValue({ data: false, error: null });
  });

  it('global_default does NOT call has_membership_feature and is not blocked', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, scopeType: 'global_default', scopeValue: null, businessId: null,
    });
    expect(hasMembershipFeature).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    expect(res.blocked_by_membership).toBe(false);
  });

  it('account_type does NOT call has_membership_feature and is not blocked', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, scopeType: 'account_type', scopeValue: 'provider', businessId: null,
    });
    expect(hasMembershipFeature).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    expect(res.blocked_by_membership).toBe(false);
  });

  it('entity scope DOES call has_membership_feature and blocks when plan lacks module', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, scopeType: 'entity', scopeValue: 'biz-1', businessId: 'biz-1',
    });
    expect(hasMembershipFeature).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    expect(res.blocked_by_membership).toBe(true);
  });

  it('entity scope is NOT blocked when bypassMembership is true', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, scopeType: 'entity', scopeValue: 'biz-1', businessId: 'biz-1',
      bypassMembership: true, reason: '[super-admin bypass] test',
    });
    expect(hasMembershipFeature).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it('user scope WITHOUT businessId skips membership check', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, scopeType: 'user', scopeValue: 'usr-1', businessId: null,
    });
    expect(hasMembershipFeature).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it('user scope WITH explicit businessId checks that business only', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, scopeType: 'user', scopeValue: 'usr-1', businessId: 'biz-1',
    });
    expect(hasMembershipFeature).toHaveBeenCalledTimes(1);
    expect(res.blocked_by_membership).toBe(true);
  });

  it('disable / reset still skips the pre-check on entity scope', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, enabled: false, reset: true,
      scopeType: 'entity', scopeValue: 'biz-1', businessId: 'biz-1',
    });
    expect(hasMembershipFeature).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it('non-admin caller is rejected regardless of scope', async () => {
    const res = await updateBusinessSystemAccess({
      ...baseArgs, isAdmin: false,
      scopeType: 'global_default', scopeValue: null, businessId: null,
    });
    expect(res.ok).toBe(false);
    expect(hasMembershipFeature).not.toHaveBeenCalled();
  });
});

describe('SYSTEM-ACCESS-DEFAULT-SCOPE-1 — UI helper copy', () => {
  const src = fs.readFileSync(path.resolve('src/pages/admin/AdminSystemAccess.tsx'), 'utf8');

  it('global default helper copy states it is not gated by a business plan', () => {
    expect(src).toMatch(/الإعداد الافتراضي العام/);
    expect(src).toMatch(/لا يخضع لباقة منشأة محددة/);
  });

  it('account type helper copy states it is not gated by a business plan', () => {
    expect(src).toMatch(/حسب نوع الحساب/);
    // appears twice (header copy + the global/account hints)
  });

  it('entity scope helper copy states it is gated by the business plan', () => {
    expect(src).toMatch(/يخضع لباقة المنشأة/);
    expect(src).toMatch(/يمكن للسوبر أدمن التجاوز/);
  });

  it('user scope helper copy is shown when a user is selected', () => {
    expect(src).toMatch(/scopeTab === 'user' && selectedUserId/);
  });
});