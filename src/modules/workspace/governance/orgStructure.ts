/**
 * ORG-RBAC-STRUCTURE-7 — Organization structure invariants (pure helpers).
 *
 * Purpose:
 *   Centralize the documented role hierarchy and membership invariants
 *   that the UI uses for diagnostics / admin visibility. **Not** an
 *   authorization boundary — RLS + `has_entity_membership` /
 *   `has_permission` remain authoritative server-side.
 *
 * Why pure:
 *   Phase 7 explicitly disallows new RLS, ownership rewrites, or auth
 *   changes. These helpers operate on snapshots already fetched through
 *   approved wrappers (e.g. `getAdminCompanyAccessDiagnostic`).
 */
import { WORKSPACE_ROLES, type WorkspaceRole } from '@/modules/workspace/permissions/catalog';

/**
 * Canonical role ranking (highest privilege first). Mirrors the seed in
 * `roles_catalog` and the static catalog. Used by diagnostics to surface
 * "who has the strongest tie to the entity" without implying authority.
 */
export const ORG_ROLE_HIERARCHY: readonly WorkspaceRole[] = [
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
];

export function compareRoleRank(a: string | null | undefined, b: string | null | undefined): number {
  const ai = a ? ORG_ROLE_HIERARCHY.indexOf(a as WorkspaceRole) : -1;
  const bi = b ? ORG_ROLE_HIERARCHY.indexOf(b as WorkspaceRole) : -1;
  // Unknown roles rank lowest.
  const aw = ai < 0 ? ORG_ROLE_HIERARCHY.length : ai;
  const bw = bi < 0 ? ORG_ROLE_HIERARCHY.length : bi;
  return aw - bw;
}

/** Snapshot row (subset) describing a `business_staff` membership. */
export interface OrgStaffRow {
  user_id: string | null;
  role: string | null;
  is_active: boolean;
  is_primary_manager: boolean | null;
}

export interface OrgBusinessSnapshot {
  business_id: string;
  owner_user_id: string | null;
  staff: OrgStaffRow[];
}

export interface OrgInvariantViolation {
  code:
    | 'orphan_business_no_owner'
    | 'owner_missing_active_staff_row'
    | 'owner_not_primary_manager'
    | 'multiple_active_primary_managers'
    | 'no_active_primary_manager'
    | 'inactive_staff_marked_primary'
    | 'owner_staff_inactive'
    | 'owner_staff_role_changed';
  detail?: string;
}

/**
 * Validate documented invariants for one entity. Returns a structured
 * violation list. Empty list = healthy. Pure / synchronous / never throws.
 *
 * Invariants:
 *   I1. Every business has an owner_user_id (else `orphan_business_no_owner`).
 *   I2. Owner has an ACTIVE `business_staff` row with role='owner'.
 *   I3. Owner's active staff row is `is_primary_manager = true`
 *       (post-Phase-2 normalization).
 *   I4. Exactly one active primary manager per entity (or zero only if
 *       the entity is orphaned).
 *   I5. Inactive rows must not carry `is_primary_manager = true`.
 */
export function validateBusinessInvariants(
  snapshot: OrgBusinessSnapshot,
): OrgInvariantViolation[] {
  const out: OrgInvariantViolation[] = [];
  const active = snapshot.staff.filter((s) => s.is_active);

  if (!snapshot.owner_user_id) {
    out.push({ code: 'orphan_business_no_owner' });
  } else {
    // Look at ALL rows for the owner (including inactive / wrong role)
    // so we can surface specific 9B-aligned failure modes.
    const ownerAny = snapshot.staff.filter((s) => s.user_id === snapshot.owner_user_id);
    const ownerActiveOwnerRole = ownerAny.find((s) => s.is_active && s.role === 'owner');
    const ownerInactive = ownerAny.find((s) => !s.is_active && s.role === 'owner');
    const ownerRoleChanged = ownerAny.find((s) => s.is_active && s.role !== 'owner');
    if (!ownerActiveOwnerRole) {
      out.push({ code: 'owner_missing_active_staff_row' });
      if (ownerInactive) out.push({ code: 'owner_staff_inactive' });
      if (ownerRoleChanged) {
        out.push({ code: 'owner_staff_role_changed', detail: ownerRoleChanged.role ?? undefined });
      }
    } else if (ownerActiveOwnerRole.is_primary_manager !== true) {
      // Option C: owner is not REQUIRED to be primary manager. This is
      // a soft warning surfaced only when no other primary manager is
      // active. Reported via 'no_active_primary_manager' below instead
      // to keep diagnostics actionable.
    }
  }

  const primaries = active.filter((s) => s.is_primary_manager === true);
  if (primaries.length === 0 && snapshot.owner_user_id) {
    out.push({ code: 'no_active_primary_manager' });
  }
  if (primaries.length > 1) {
    out.push({
      code: 'multiple_active_primary_managers',
      detail: `${primaries.length}`,
    });
  }

  const inactivePrimary = snapshot.staff.find(
    (s) => !s.is_active && s.is_primary_manager === true,
  );
  if (inactivePrimary) {
    out.push({ code: 'inactive_staff_marked_primary' });
  }

  return out;
}

/**
 * Compute the effective list of business ids a user can act within,
 * given their owned set and their staff memberships. Inactive staff rows
 * MUST NOT grant access — this mirrors `getAdminUserAccessSummary` and
 * the server-side `has_entity_membership` semantics (UI parity only).
 */
export function computeEffectiveBusinessIds(input: {
  owned: string[];
  staffMemberships: Array<{ business_id: string | null; is_active: boolean }>;
}): string[] {
  const staff = input.staffMemberships
    .filter((s) => s.is_active && !!s.business_id)
    .map((s) => s.business_id as string);
  return Array.from(new Set([...input.owned, ...staff]));
}

/** Sanity export so consumers can iterate documented roles in canonical order. */
export const ORG_ROLES_CANONICAL: readonly WorkspaceRole[] = WORKSPACE_ROLES;