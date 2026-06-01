import { describe, expect, it } from 'vitest';
import {
  resolveServiceEntitlement,
  resolveServiceEntitlements,
  type ProviderServiceRowLike,
} from '../resolveServiceEntitlement';

function row(overrides: Partial<ProviderServiceRowLike> = {}): ProviderServiceRowLike {
  return {
    id: 'r1',
    provider_status: 'active',
    admin_status: 'allowed',
    required_plan_tier: null,
    is_active: true,
    ...overrides,
  };
}

describe('resolveServiceEntitlement — priority order', () => {
  it('1) taxonomy disabled beats everything', () => {
    const r = resolveServiceEntitlement({
      row: row({ admin_status: 'allowed', provider_status: 'active' }),
      currentTier: 'enterprise',
      taxonomyDisabled: true,
    });
    expect(r.effective_status).toBe('hidden');
    expect(r.canShowPublicly).toBe(false);
  });

  it('2) admin suspended beats membership and provider', () => {
    const r = resolveServiceEntitlement({
      row: row({ admin_status: 'suspended', required_plan_tier: 'enterprise' }),
      currentTier: 'free',
    });
    expect(r.effective_status).toBe('disabled');
    expect(r.adminBlockedReason).toBe('suspended');
  });

  it('2) admin rejected → disabled', () => {
    const r = resolveServiceEntitlement({
      row: row({ admin_status: 'rejected' }),
      currentTier: 'premium',
    });
    expect(r.effective_status).toBe('disabled');
  });

  it('3) pending review takes precedence over membership gate', () => {
    const r = resolveServiceEntitlement({
      row: row({ admin_status: 'pending_review', required_plan_tier: 'enterprise' }),
      currentTier: 'free',
    });
    expect(r.effective_status).toBe('pending_review');
  });

  it('4) required tier not met → upgrade_required with target tier', () => {
    const r = resolveServiceEntitlement({
      row: row({ required_plan_tier: 'premium' }),
      currentTier: 'basic',
    });
    expect(r.effective_status).toBe('upgrade_required');
    expect(r.upgradeTargetTier).toBe('premium');
    expect(r.requiresUpgrade).toBe(true);
  });

  it('4) required tier met → not upgrade required', () => {
    const r = resolveServiceEntitlement({
      row: row({ required_plan_tier: 'basic' }),
      currentTier: 'premium',
    });
    expect(r.effective_status).toBe('active');
  });

  it('5) quota exceeded → quota_exceeded', () => {
    const r = resolveServiceEntitlement({
      row: row(),
      currentTier: 'free',
      maxActiveServices: 2,
      activeCountSoFar: 2,
    });
    expect(r.effective_status).toBe('quota_exceeded');
    expect(r.upgradeTargetTier).toBe('basic');
  });

  it('5) quota allows when below cap', () => {
    const r = resolveServiceEntitlement({
      row: row(),
      currentTier: 'free',
      maxActiveServices: 5,
      activeCountSoFar: 2,
    });
    expect(r.effective_status).toBe('active');
  });

  it('5) paused row does not consume quota', () => {
    const r = resolveServiceEntitlement({
      row: row({ provider_status: 'paused' }),
      currentTier: 'free',
      maxActiveServices: 0,
      activeCountSoFar: 0,
    });
    expect(r.effective_status).toBe('paused');
  });

  it('6) provider paused → paused', () => {
    const r = resolveServiceEntitlement({
      row: row({ provider_status: 'paused' }),
      currentTier: 'free',
    });
    expect(r.effective_status).toBe('paused');
    expect(r.canActivate).toBe(true);
  });

  it('7) all clear → active with full capabilities', () => {
    const r = resolveServiceEntitlement({ row: row(), currentTier: 'premium' });
    expect(r.effective_status).toBe('active');
    expect(r.canShowPublicly).toBe(true);
    expect(r.canReceiveLeads).toBe(true);
    expect(r.canReceiveRFQs).toBe(true);
  });
});

describe('resolveServiceEntitlements — list threading', () => {
  it('threads active count so quota kicks in after the cap', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' }), row({ id: 'd' })];
    const results = resolveServiceEntitlements(rows, { currentTier: 'free', maxActiveServices: 2 });
    expect(results.map((r) => r.resolved.effective_status)).toEqual([
      'active',
      'active',
      'quota_exceeded',
      'quota_exceeded',
    ]);
  });

  it('paused rows do not count toward quota', () => {
    const rows = [
      row({ id: 'a', provider_status: 'paused' }),
      row({ id: 'b' }),
      row({ id: 'c' }),
      row({ id: 'd' }),
    ];
    const results = resolveServiceEntitlements(rows, { currentTier: 'free', maxActiveServices: 2 });
    expect(results.map((r) => r.resolved.effective_status)).toEqual([
      'paused',
      'active',
      'active',
      'quota_exceeded',
    ]);
  });
});