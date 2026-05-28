/**
 * ORG-RBAC-STRUCTURE-7 — Org/RBAC structure invariants.
 *
 * Pure tests over `validateBusinessInvariants` /
 * `computeEffectiveBusinessIds` / `compareRoleRank`. No DB, no auth.
 * Mirrors the post Phase-2 backfill expectation.
 */
import { describe, it, expect } from 'vitest';
import {
  ORG_ROLE_HIERARCHY,
  ORG_ROLES_CANONICAL,
  compareRoleRank,
  computeEffectiveBusinessIds,
  validateBusinessInvariants,
  type OrgBusinessSnapshot,
} from '@/modules/workspace/governance/orgStructure';

const OWNER = 'u-owner';
const STAFF_A = 'u-staff-a';

function snap(overrides: Partial<OrgBusinessSnapshot> = {}): OrgBusinessSnapshot {
  return {
    business_id: 'b-1',
    owner_user_id: OWNER,
    staff: [
      { user_id: OWNER, role: 'owner', is_active: true, is_primary_manager: true },
    ],
    ...overrides,
  };
}

describe('ORG-RBAC-STRUCTURE-7 — role hierarchy', () => {
  it('exposes the 10 canonical roles in privilege order', () => {
    expect(ORG_ROLE_HIERARCHY).toEqual([
      'owner', 'entity_admin', 'business_manager', 'site_manager',
      'operations_manager', 'contracts_manager', 'finance', 'sales',
      'staff', 'viewer',
    ]);
    // Parity with the catalog enum used by hasWorkspacePermission.
    expect([...ORG_ROLES_CANONICAL].sort()).toEqual([...ORG_ROLE_HIERARCHY].sort());
  });

  it('compareRoleRank prefers higher privilege and sinks unknown/null', () => {
    expect(compareRoleRank('owner', 'staff')).toBeLessThan(0);
    expect(compareRoleRank('staff', 'owner')).toBeGreaterThan(0);
    expect(compareRoleRank('owner', 'owner')).toBe(0);
    expect(compareRoleRank('mystery', 'staff')).toBeGreaterThan(0);
    expect(compareRoleRank(null, 'viewer')).toBeGreaterThan(0);
  });
});

describe('ORG-RBAC-STRUCTURE-7 — validateBusinessInvariants', () => {
  it('passes for a normalized owner row (I1–I5)', () => {
    expect(validateBusinessInvariants(snap())).toEqual([]);
  });

  it('flags orphan_business_no_owner', () => {
    const v = validateBusinessInvariants(snap({ owner_user_id: null, staff: [] }));
    expect(v.map((x) => x.code)).toContain('orphan_business_no_owner');
  });

  it('flags owner_missing_active_staff_row when no active owner row exists', () => {
    const v = validateBusinessInvariants(snap({
      staff: [{ user_id: OWNER, role: 'owner', is_active: false, is_primary_manager: true }],
    }));
    expect(v.map((x) => x.code)).toEqual(
      expect.arrayContaining(['owner_missing_active_staff_row', 'inactive_staff_marked_primary']),
    );
  });

  it('flags owner_not_primary_manager when active owner row lacks the flag', () => {
    const v = validateBusinessInvariants(snap({
      staff: [{ user_id: OWNER, role: 'owner', is_active: true, is_primary_manager: false }],
    }));
    expect(v.map((x) => x.code)).toEqual(
      expect.arrayContaining(['owner_not_primary_manager', 'no_active_primary_manager']),
    );
  });

  it('flags multiple_active_primary_managers', () => {
    const v = validateBusinessInvariants(snap({
      staff: [
        { user_id: OWNER, role: 'owner', is_active: true, is_primary_manager: true },
        { user_id: STAFF_A, role: 'business_manager', is_active: true, is_primary_manager: true },
      ],
    }));
    expect(v.map((x) => x.code)).toContain('multiple_active_primary_managers');
  });

  it('does NOT flag a healthy non-primary active staff member', () => {
    expect(validateBusinessInvariants(snap({
      staff: [
        { user_id: OWNER, role: 'owner', is_active: true, is_primary_manager: true },
        { user_id: STAFF_A, role: 'sales', is_active: true, is_primary_manager: false },
      ],
    }))).toEqual([]);
  });
});

describe('ORG-RBAC-STRUCTURE-7 — computeEffectiveBusinessIds', () => {
  it('inactive staff rows do not grant access (parity with has_entity_membership)', () => {
    const ids = computeEffectiveBusinessIds({
      owned: ['b-1'],
      staffMemberships: [
        { business_id: 'b-2', is_active: false },
        { business_id: 'b-3', is_active: true },
      ],
    });
    expect(ids.sort()).toEqual(['b-1', 'b-3']);
    expect(ids).not.toContain('b-2');
  });

  it('dedupes when owned and staff overlap', () => {
    const ids = computeEffectiveBusinessIds({
      owned: ['b-1'],
      staffMemberships: [{ business_id: 'b-1', is_active: true }],
    });
    expect(ids).toEqual(['b-1']);
  });

  it('returns empty when nothing is owned and no active membership exists', () => {
    expect(computeEffectiveBusinessIds({ owned: [], staffMemberships: [] })).toEqual([]);
  });
});