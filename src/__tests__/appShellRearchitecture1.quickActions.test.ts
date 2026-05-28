import { describe, it, expect } from 'vitest';
import { QUICK_ACTIONS, filterQuickActions } from '@/modules/workspace/shell/quickActions';

describe('APP-SHELL-1 — quickActions filtering', () => {
  it('hides admin-only actions from providers', () => {
    const visible = filterQuickActions(QUICK_ACTIONS, {
      audience: 'provider',
      hasPermission: () => true,
    });
    expect(visible.find((a) => a.id === 'operations-console')).toBeUndefined();
    expect(visible.find((a) => a.id === 'bulk-reference-triage')).toBeUndefined();
  });

  it('shows provider-eligible actions when permissions granted', () => {
    const visible = filterQuickActions(QUICK_ACTIONS, {
      audience: 'provider',
      hasPermission: () => true,
    });
    expect(visible.find((a) => a.id === 'create-work-order')).toBeDefined();
    expect(visible.find((a) => a.id === 'staff-center')).toBeDefined();
    expect(visible.find((a) => a.id === 'contracts')).toBeDefined();
  });

  it('drops actions whose required permission is missing', () => {
    const visible = filterQuickActions(QUICK_ACTIONS, {
      audience: 'provider',
      hasPermission: () => false,
    });
    expect(visible.find((a) => a.id === 'staff-center')).toBeUndefined();
    expect(visible.find((a) => a.id === 'contracts')).toBeUndefined();
  });

  it('admin sees admin actions', () => {
    const visible = filterQuickActions(QUICK_ACTIONS, {
      audience: 'admin',
      hasPermission: () => true,
    });
    expect(visible.find((a) => a.id === 'operations-console')).toBeDefined();
    expect(visible.find((a) => a.id === 'bulk-reference-triage')).toBeDefined();
  });

  it('regular user only sees actions audienced to user (currently none)', () => {
    const visible = filterQuickActions(QUICK_ACTIONS, {
      audience: 'user',
      hasPermission: () => true,
    });
    // All actions today are admin/provider — user audience sees nothing.
    expect(visible).toEqual([]);
  });
});