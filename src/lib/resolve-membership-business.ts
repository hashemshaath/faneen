/**
 * Pure resolver for the "current business" used on the Membership page.
 *
 * Centralises the priority + linking rules so we can:
 *   1) Avoid the "no business" error when the user is staff/manager only.
 *   2) Guarantee the resolved business id and ref_id always belong to the
 *      same row (no cross-wiring between an owned business and a managed one).
 *   3) Deterministically pick a single business when the user has multiple
 *      ownerships or staff roles.
 *
 * Rules applied (in order):
 *   - Owned businesses win over staff memberships (a person can be owner of
 *     one and staff at another — they should manage their OWN subscription).
 *   - Within owned, prefer the most recently created (callers pre-sort).
 *   - Within staff, only `owner` / `manager` roles can act on memberships,
 *     and inactive rows are ignored.
 *   - The returned object must have a non-empty `id` AND `ref_id` — rows
 *     missing either are skipped (defensive against partial joins).
 *   - Duplicates that share the same `id` are collapsed.
 */
export interface ResolvableBusiness {
  id: string;
  ref_id: string | null;
  membership_tier?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  approval_status?: string | null;
  onboarding_completion?: number | null;
}

export interface StaffCandidate {
  business_id: string;
  role: string;
  is_active?: boolean;
  businesses?: ResolvableBusiness | null;
}

export interface ResolveInput {
  owned?: ResolvableBusiness[] | null;
  staff?: StaffCandidate[] | null;
}

const ELIGIBLE_STAFF_ROLES = new Set(['owner', 'manager']);

function isLinked(b: ResolvableBusiness | null | undefined): b is ResolvableBusiness {
  return !!b && typeof b.id === 'string' && b.id.length > 0
    && typeof b.ref_id === 'string' && b.ref_id.length > 0;
}

/** Resolve the single business this user should manage on /membership. */
export function resolveMembershipBusiness(input: ResolveInput): ResolvableBusiness | null {
  const owned = (input.owned ?? []).filter(isLinked);
  if (owned.length > 0) return owned[0];

  const staffRows = (input.staff ?? []).filter((row) => {
    if (row.is_active === false) return false;
    if (!ELIGIBLE_STAFF_ROLES.has(row.role)) return false;
    if (!isLinked(row.businesses)) return false;
    // Critical: the join's business_id MUST match the joined business.id —
    // otherwise the row is corrupt and unsafe to act on.
    return row.business_id === row.businesses!.id;
  });
  if (staffRows.length === 0) return null;
  return staffRows[0].businesses ?? null;
}

/**
 * Verifies that an upgrade payload's business_id and business_ref_id refer
 * to the SAME row in `candidates` (owned + staff-linked businesses the user
 * legitimately controls). Mirrors the server-side trigger so we fail fast
 * before hitting the network.
 */
export function verifyUpgradeBinding(
  payload: { business_id: string; business_ref_id: string | null | undefined },
  candidates: ResolvableBusiness[],
): { ok: true } | { ok: false; reason: 'missing-ref' | 'unknown-business' | 'ref-mismatch' } {
  if (!payload.business_ref_id || payload.business_ref_id.length === 0) {
    return { ok: false, reason: 'missing-ref' };
  }
  const match = candidates.find((c) => c.id === payload.business_id);
  if (!match) return { ok: false, reason: 'unknown-business' };
  if (match.ref_id !== payload.business_ref_id) return { ok: false, reason: 'ref-mismatch' };
  return { ok: true };
}