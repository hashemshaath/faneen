import { describe, it, expect } from 'vitest';
import {
  buildContextualActions,
  filterContextualActions,
  groupContextualActions,
} from '@/modules/workspace/shell/contextualQuickActions';

describe('APP-SHELL-2 — contextual quick actions', () => {
  it('returns work-order primary + tools when in WO module', () => {
    const actions = buildContextualActions({ module: 'work-orders', ref: 'WO-1' });
    expect(actions.find((a) => a.id === 'wo-open-feed')?.group).toBe('primary');
    expect(actions.find((a) => a.id === 'wo-assign-staff')?.group).toBe('tools');
    expect(actions.find((a) => a.id === 'wo-contracts')?.group).toBe('related');
    expect(actions.find((a) => a.id === 'wo-open-feed')?.to).toContain('ref=WO-1');
  });

  it('returns admin actions only for admin audience', () => {
    const all = buildContextualActions({ module: 'admin', ref: null });
    const adminView = filterContextualActions(all, { audience: 'admin', hasPermission: () => true });
    const providerView = filterContextualActions(all, { audience: 'provider', hasPermission: () => true });
    expect(adminView.length).toBeGreaterThan(0);
    expect(providerView.length).toBe(0);
  });

  it('filters actions by required permission', () => {
    const all = buildContextualActions({ module: 'work-orders', ref: 'WO-1' });
    const without = filterContextualActions(all, { audience: 'provider', hasPermission: () => false });
    expect(without.find((a) => a.id === 'wo-assign-staff')).toBeUndefined();
    const withPerm = filterContextualActions(all, { audience: 'provider', hasPermission: () => true });
    expect(withPerm.find((a) => a.id === 'wo-assign-staff')).toBeDefined();
  });

  it('groupContextualActions splits into primary/related/tools', () => {
    const grouped = groupContextualActions(
      buildContextualActions({ module: 'work-orders', ref: null }),
    );
    expect(grouped.primary.length).toBeGreaterThan(0);
    expect(grouped.related.length).toBeGreaterThan(0);
    expect(grouped.tools.length).toBeGreaterThan(0);
  });

  it('returns empty list for unknown module', () => {
    expect(buildContextualActions({ module: 'unknown', ref: null })).toEqual([]);
  });
});