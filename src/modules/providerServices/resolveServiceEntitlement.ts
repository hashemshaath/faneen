/**
 * SERVICE-ACTIVATION-GOVERNANCE-1 — Phase B
 *
 * Pure resolver that computes the effective status of a single
 * provider-service activation (a row in `business_services`) given:
 *  - the row itself (provider_status, admin_status, required_plan_tier, …)
 *  - the provider's current membership tier
 *  - the plan's max-active-services quota
 *  - the current count of active services on the business
 *
 * No I/O. All inputs are explicit so this is fully unit-testable and can
 * be called from any UI surface without duplicating logic.
 *
 * Priority order (matches the spec):
 *   1. taxonomy disabled globally        → hidden
 *   2. admin suspended / rejected        → disabled
 *   3. admin pending_review              → pending_review
 *   4. required_plan_tier > current tier → upgrade_required
 *   5. quota exceeded                    → quota_exceeded (upgrade)
 *   6. provider_status = paused          → paused
 *   7. otherwise                         → active
 */

import type { TierKey } from '@/lib/membership-tiers';
import { TIERS } from '@/lib/membership-tiers';

export type ProviderActivationStatus = 'active' | 'paused';
export type AdminActivationStatus = 'allowed' | 'suspended' | 'rejected' | 'pending_review';
export type MembershipGateStatus = 'available' | 'upgrade_required' | 'quota_exceeded' | 'not_in_plan';

export type EffectiveServiceStatus =
  | 'active'
  | 'paused'
  | 'hidden'
  | 'disabled'
  | 'upgrade_required'
  | 'quota_exceeded'
  | 'pending_review';

export interface ProviderServiceRowLike {
  id: string;
  provider_status: ProviderActivationStatus;
  admin_status: AdminActivationStatus;
  required_plan_tier: TierKey | null;
  is_active: boolean;
}

export interface ResolverInput {
  row: ProviderServiceRowLike;
  /** Provider's current membership tier. `null` = treat as free. */
  currentTier: TierKey | null;
  /** Optional plan cap on simultaneously-active services. `null` / `undefined` = unlimited. */
  maxActiveServices?: number | null;
  /** Count of services that resolved to `active` BEFORE this row was considered. */
  activeCountSoFar?: number;
  /** True when the upstream taxonomy entry (sub_service) is disabled/hidden globally. */
  taxonomyDisabled?: boolean;
}

export interface ResolvedServiceEntitlement {
  effective_status: EffectiveServiceStatus;
  membership_gate_status: MembershipGateStatus;
  canActivate: boolean;
  canPause: boolean;
  canShowPublicly: boolean;
  canReceiveLeads: boolean;
  canReceiveRFQs: boolean;
  requiresUpgrade: boolean;
  upgradeReason: string | null;
  upgradeTargetTier: TierKey | null;
  adminBlockedReason: string | null;
}

const TIER_RANK: Record<TierKey, number> = { free: 0, basic: 1, premium: 2, enterprise: 3 };

function tierMeets(current: TierKey | null, required: TierKey | null): boolean {
  if (!required) return true;
  const cur = current ?? 'free';
  return TIER_RANK[cur] >= TIER_RANK[required];
}

/** Whitelist a tier coming from the DB. Falls back to `null` for unknowns. */
export function normalizeTier(value: unknown): TierKey | null {
  if (typeof value !== 'string') return null;
  return (TIERS as readonly string[]).includes(value) ? (value as TierKey) : null;
}

export function resolveServiceEntitlement(input: ResolverInput): ResolvedServiceEntitlement {
  const { row, currentTier, maxActiveServices, activeCountSoFar = 0, taxonomyDisabled = false } = input;

  // 1) Taxonomy disabled → hidden
  if (taxonomyDisabled) {
    return base({
      effective_status: 'hidden',
      membership_gate_status: 'available',
      adminBlockedReason: 'taxonomy_disabled',
    });
  }

  // 2) Admin suspended / rejected → disabled
  if (row.admin_status === 'suspended' || row.admin_status === 'rejected') {
    return base({
      effective_status: 'disabled',
      membership_gate_status: 'available',
      adminBlockedReason: row.admin_status,
    });
  }

  // 3) Admin pending_review
  if (row.admin_status === 'pending_review') {
    return base({
      effective_status: 'pending_review',
      membership_gate_status: 'available',
      adminBlockedReason: 'pending_review',
    });
  }

  // 4) Required plan tier not met
  if (!tierMeets(currentTier, row.required_plan_tier)) {
    return base({
      effective_status: 'upgrade_required',
      membership_gate_status: 'upgrade_required',
      requiresUpgrade: true,
      upgradeReason: 'tier_required',
      upgradeTargetTier: row.required_plan_tier,
    });
  }

  // 5) Quota exceeded (only counts if the row would otherwise be active)
  const wouldBeActive = row.provider_status === 'active';
  if (
    wouldBeActive &&
    typeof maxActiveServices === 'number' &&
    maxActiveServices >= 0 &&
    activeCountSoFar >= maxActiveServices
  ) {
    return base({
      effective_status: 'quota_exceeded',
      membership_gate_status: 'quota_exceeded',
      requiresUpgrade: true,
      upgradeReason: 'quota_exceeded',
      upgradeTargetTier: nextTier(currentTier),
    });
  }

  // 6) Provider paused
  if (row.provider_status === 'paused') {
    return {
      effective_status: 'paused',
      membership_gate_status: 'available',
      canActivate: true,
      canPause: false,
      canShowPublicly: false,
      canReceiveLeads: false,
      canReceiveRFQs: false,
      requiresUpgrade: false,
      upgradeReason: null,
      upgradeTargetTier: null,
      adminBlockedReason: null,
    };
  }

  // 7) Active
  return {
    effective_status: 'active',
    membership_gate_status: 'available',
    canActivate: false,
    canPause: true,
    canShowPublicly: true,
    canReceiveLeads: true,
    canReceiveRFQs: true,
    requiresUpgrade: false,
    upgradeReason: null,
    upgradeTargetTier: null,
    adminBlockedReason: null,
  };
}

/** Resolve a whole list while threading the running active count for quota. */
export function resolveServiceEntitlements(
  rows: ProviderServiceRowLike[],
  context: Omit<ResolverInput, 'row' | 'activeCountSoFar'>,
): Array<{ row: ProviderServiceRowLike; resolved: ResolvedServiceEntitlement }> {
  let activeCount = 0;
  return rows.map((row) => {
    const resolved = resolveServiceEntitlement({ ...context, row, activeCountSoFar: activeCount });
    if (resolved.effective_status === 'active') activeCount += 1;
    return { row, resolved };
  });
}

function nextTier(current: TierKey | null): TierKey | null {
  const cur = current ?? 'free';
  const idx = TIERS.indexOf(cur);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

function base(overrides: Partial<ResolvedServiceEntitlement> & Pick<ResolvedServiceEntitlement, 'effective_status' | 'membership_gate_status'>): ResolvedServiceEntitlement {
  return {
    canActivate: false,
    canPause: false,
    canShowPublicly: false,
    canReceiveLeads: false,
    canReceiveRFQs: false,
    requiresUpgrade: false,
    upgradeReason: null,
    upgradeTargetTier: null,
    adminBlockedReason: null,
    ...overrides,
  };
}