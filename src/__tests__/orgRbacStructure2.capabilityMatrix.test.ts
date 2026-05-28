/**
 * ORG-RBAC-STRUCTURE-2 — Phase B tests.
 *
 * Covers:
 *  - matrix integrity (no duplicate capability keys; every group entry is known)
 *  - owner short-circuits
 *  - explicit grant beats role default
 *  - explicit deny beats every other source (incl. owner)
 *  - unknown capability → false
 *  - role-default snapshot (catches accidental widening)
 *  - hasAny / hasAll helpers
 */
import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_CAPABILITIES,
  CAPABILITY_GROUPS,
  CAPABILITY_ROLE_DEFAULTS,
  hasCapability,
  hasAnyCapability,
  hasAllCapabilities,
  isKnownCapability,
  type WorkspaceCapabilityLike,
} from '@/modules/workspace/permissions/capabilityMatrix';

const ws = (overrides: Partial<WorkspaceCapabilityLike> = {}): WorkspaceCapabilityLike => ({
  active_role: null,
  permissions: [],
  denies: [],
  ...overrides,
});

describe('capability matrix integrity', () => {
  it('has no duplicate capability keys', () => {
    const set = new Set(WORKSPACE_CAPABILITIES);
    expect(set.size).toBe(WORKSPACE_CAPABILITIES.length);
  });

  it('every capability in CAPABILITY_GROUPS is a known capability', () => {
    for (const [group, caps] of Object.entries(CAPABILITY_GROUPS)) {
      for (const c of caps) {
        expect(isKnownCapability(c), `${group}.${c}`).toBe(true);
      }
    }
  });

  it('every role-default capability is a known capability', () => {
    for (const [role, caps] of Object.entries(CAPABILITY_ROLE_DEFAULTS)) {
      for (const c of caps) {
        expect(isKnownCapability(c), `${role}.${c}`).toBe(true);
      }
    }
  });

  it('isKnownCapability rejects unknown keys', () => {
    expect(isKnownCapability('nope.invented')).toBe(false);
    expect(isKnownCapability('')).toBe(false);
  });
});

describe('hasCapability precedence', () => {
  it('returns false for null workspace', () => {
    expect(hasCapability(null, 'contracts.approve')).toBe(false);
  });

  it('returns false for unknown capability even when owner', () => {
    expect(hasCapability(ws({ active_role: 'owner' }), 'nope.invented')).toBe(false);
  });

  it('owner short-circuits known capabilities', () => {
    for (const c of WORKSPACE_CAPABILITIES) {
      expect(hasCapability(ws({ active_role: 'owner' }), c)).toBe(true);
    }
  });

  it('explicit grant beats role default for a role that lacks it', () => {
    const viewer = ws({ active_role: 'viewer', permissions: ['contracts.approve'] });
    expect(hasCapability(viewer, 'contracts.approve')).toBe(true);
  });

  it('explicit deny beats explicit grant', () => {
    const w = ws({
      active_role: 'owner',
      permissions: ['contracts.approve'],
      denies: ['contracts.approve'],
    });
    expect(hasCapability(w, 'contracts.approve')).toBe(false);
  });

  it('explicit deny beats role default', () => {
    const w = ws({ active_role: 'business_manager', denies: ['work_orders.assign'] });
    expect(hasCapability(w, 'work_orders.assign')).toBe(false);
  });

  it('viewer cannot approve / suspend / manage billing', () => {
    const viewer = ws({ active_role: 'viewer' });
    expect(hasCapability(viewer, 'contracts.approve')).toBe(false);
    expect(hasCapability(viewer, 'staff.suspend')).toBe(false);
    expect(hasCapability(viewer, 'billing.manage')).toBe(false);
  });

  it('finance gets billing but not work-order assignment', () => {
    const fin = ws({ active_role: 'finance' });
    expect(hasCapability(fin, 'billing.manage')).toBe(true);
    expect(hasCapability(fin, 'work_orders.assign')).toBe(false);
  });

  it('unknown role falls back to legacy catalog (entity.view only)', () => {
    const w = ws({ active_role: 'unknown_role' });
    expect(hasCapability(w, 'contracts.approve')).toBe(false);
  });
});

describe('role-default snapshot (guards against accidental widening)', () => {
  it('only owner and entity_admin get every capability', () => {
    for (const [role, caps] of Object.entries(CAPABILITY_ROLE_DEFAULTS)) {
      const isFull = caps.length === WORKSPACE_CAPABILITIES.length;
      const expectedFull = role === 'owner' || role === 'entity_admin';
      expect(isFull, `role=${role}`).toBe(expectedFull);
    }
  });

  it('viewer defaults are read-only (no manage/approve/assign/close/export/invite/suspend)', () => {
    const viewerCaps = CAPABILITY_ROLE_DEFAULTS.viewer;
    const forbidden = ['manage', 'approve', 'assign', 'close', 'export', 'invite', 'suspend'];
    for (const cap of viewerCaps) {
      for (const f of forbidden) {
        expect(cap.endsWith(`.${f}`), `viewer must not have ${cap}`).toBe(false);
      }
    }
  });
});

describe('hasAny / hasAll helpers', () => {
  const finance = ws({ active_role: 'finance' });
  it('hasAnyCapability returns true if any one matches', () => {
    expect(hasAnyCapability(finance, ['work_orders.assign', 'billing.view'])).toBe(true);
    expect(hasAnyCapability(finance, ['work_orders.assign', 'staff.suspend'])).toBe(false);
  });
  it('hasAllCapabilities requires every capability', () => {
    expect(hasAllCapabilities(finance, ['billing.view', 'billing.manage'])).toBe(true);
    expect(hasAllCapabilities(finance, ['billing.view', 'work_orders.assign'])).toBe(false);
  });
});