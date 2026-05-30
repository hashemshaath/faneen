/**
 * RFQ-BRAND-PICKER-1E — pure helper that classifies a supplier-proposed brand
 * against the RFQ/BOQ requested brand + lock. No I/O. MUST NOT import Supabase.
 * Enforced by `scripts/procurement-isolation-audit.mjs`.
 */
import type { BrandLock } from '@/modules/brands/lib/brandSelectionRules';
import type { BrandMatchStatus } from '../types';

export interface BrandEquivalenceInput {
  requested_brand_id: string | null;
  brand_lock: BrandLock | null;
  proposed_brand_id: string | null;
  /** Optional free-text fallback when a non-catalog brand is proposed. */
  proposed_brand_name: string | null;
}

export type BrandEquivalenceReason =
  | 'no_request'
  | 'no_proposal'
  | 'same_brand'
  | 'different_brand'
  | 'free_text_proposal'
  | 'exact_lock_violation';

export interface BrandEquivalenceResult {
  brandMatchStatus: BrandMatchStatus;
  reviewRequired: boolean;
  reason: BrandEquivalenceReason;
}

/**
 * Classifies a supplier proposal vs a requested brand + lock.
 * Pure / deterministic. Free-text proposals always need review.
 */
export function classifyBrandEquivalence(
  input: BrandEquivalenceInput,
): BrandEquivalenceResult {
  const requested = input.requested_brand_id ?? null;
  const proposed = input.proposed_brand_id ?? null;
  const freeText =
    typeof input.proposed_brand_name === 'string' &&
    input.proposed_brand_name.trim().length > 0;
  const lock: BrandLock | null = input.brand_lock ?? null;

  // 1) No requested brand on the RFQ line.
  if (!requested) {
    if (proposed || freeText) {
      // Supplier offered a brand we didn't ask for — informational, no review.
      return {
        brandMatchStatus: 'proposed_equivalent',
        reviewRequired: false,
        reason: 'no_request',
      };
    }
    return {
      brandMatchStatus: 'no_brand',
      reviewRequired: false,
      reason: 'no_request',
    };
  }

  // 2) Requested brand exists but supplier proposed nothing.
  if (!proposed && !freeText) {
    return {
      brandMatchStatus: 'no_brand',
      // Exact / preferred locks need a human to confirm the empty proposal.
      reviewRequired: lock === 'exact' || lock === 'preferred',
      reason: 'no_proposal',
    };
  }

  // 3) Exact id-to-id match.
  if (proposed && proposed === requested) {
    return {
      brandMatchStatus: 'exact_match',
      reviewRequired: false,
      reason: 'same_brand',
    };
  }

  // 4) Free-text proposal — never auto-approves regardless of lock.
  if (freeText && !proposed) {
    if (lock === 'exact') {
      return {
        brandMatchStatus: 'mismatch',
        reviewRequired: true,
        reason: 'exact_lock_violation',
      };
    }
    return {
      brandMatchStatus: 'pending_review',
      reviewRequired: true,
      reason: 'free_text_proposal',
    };
  }

  // 5) Different approved brand proposed.
  switch (lock) {
    case 'exact':
      return {
        brandMatchStatus: 'mismatch',
        reviewRequired: true,
        reason: 'exact_lock_violation',
      };
    case 'preferred':
      return {
        brandMatchStatus: 'proposed_equivalent',
        reviewRequired: true,
        reason: 'different_brand',
      };
    case 'flexible':
    case null:
    default:
      return {
        brandMatchStatus: 'proposed_equivalent',
        // Flexible lock still wants review so audit log captures the choice.
        reviewRequired: lock === 'flexible',
        reason: 'different_brand',
      };
  }
}

/**
 * Maps a stored review_status + match_status pair to the effective match
 * shown to the user (so approved/rejected equivalence overrides the raw
 * computed status).
 */
export function resolveEffectiveBrandMatchStatus(
  computed: BrandMatchStatus | null,
  review_status: 'not_required' | 'pending' | 'approved' | 'rejected',
): BrandMatchStatus | null {
  if (review_status === 'approved') return 'approved_equivalent';
  if (review_status === 'rejected') return 'rejected_equivalent';
  if (review_status === 'pending') return 'pending_review';
  return computed;
}

/**
 * Convenience for the line-item comparison engine — returns a stable warning
 * code when a quote line's brand requires reviewer attention.
 */
export function brandWarningForLine(
  effective: BrandMatchStatus | null,
): 'brand_pending_review' | 'brand_mismatch' | 'brand_rejected' | null {
  if (effective === 'pending_review') return 'brand_pending_review';
  if (effective === 'mismatch') return 'brand_mismatch';
  if (effective === 'rejected_equivalent') return 'brand_rejected';
  return null;
}