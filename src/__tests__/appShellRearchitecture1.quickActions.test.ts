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

  it('regular user sees only actions audienced to user (rfq-new + loyalty)', () => {
    const visible = filterQuickActions(QUICK_ACTIONS, {
      audience: 'user',
      hasPermission: () => true,
    });
    // Post-consolidation: rfq-new and loyalty are audienced to all roles
    // (admin/provider/user). Admin/provider-only actions (operations-console,
    // bulk-reference-triage, staff-center, contracts, rfq-inbox, etc.) must
    // not appear for the user audience.
    const ids = visible.map((a) => a.id).sort();
    expect(ids).toEqual(['loyalty', 'rfq-new']);
    expect(visible.find((a) => a.id === 'operations-console')).toBeUndefined();
    expect(visible.find((a) => a.id === 'bulk-reference-triage')).toBeUndefined();
    expect(visible.find((a) => a.id === 'staff-center')).toBeUndefined();
    expect(visible.find((a) => a.id === 'contracts')).toBeUndefined();
  });
});