/**
 * BUSINESS-OPERATIONS-1C — Lifecycle adapter + transition guard for
 * provider lead_requests rows (low-risk archive/lost actions only).
 *
 * Additive only. Wraps existing `updateLeadRequestStatus` callers with a
 * pre-mutation check using the canonical `lead` lifecycle transition
 * table from `@/modules/shared/lifecycle`. Server-side RLS + existing
 * row-level checks remain authoritative; this is an extra client guard
 * applied to `rejected` (lost) and `closed` (archived) transitions only.
 *
 * Disable by setting LIFECYCLE_VALIDATE_LEADS to false if production
 * behavior needs to be reverted quickly.
 */
import type { LeadLifecycleState } from '@/modules/shared/lifecycle';
import { canTransition } from '@/modules/shared/lifecycle/transitions';

export const LIFECYCLE_VALIDATE_LEADS = true;

/**
 * Persisted lead_requests.status vocabulary as used today in the UI
 * and services. Kept as a string union (legacy values may still exist
 * in older rows).
 */
export type LeadDbStatus =
  | 'new'
  | 'viewed'
  | 'needs_info'
  | 'accepted'
  | 'quoted'
  | 'contacted'
  | 'rejected'
  | 'closed'
  | 'cancelled'
  | 'qualified'
  | 'spam';

/**
 * Low-risk lifecycle actions this guard validates. Other status
 * transitions (viewed/accepted/quoted/etc.) are intentionally NOT
 * gated in 1C to preserve existing behavior.
 */
export type LeadLifecycleAction = 'lost' | 'archive';

/**
 * Map the persisted `lead_requests.status` value to a canonical `lead`
 * lifecycle state. Unknown inputs map to `null` so callers fail closed.
 *
 * Mapping preserves current UI permissions in LeadActionsBar (which
 * allows `new → rejected/closed` and `viewed → rejected/closed`) by
 * mapping `new` to `viewed` — the closest canonical state that allows
 * the lost/archived transitions.
 */
export function mapLeadStatusToLifecycle(
  status: string | null | undefined,
): LeadLifecycleState | null {
  switch (status) {
    case 'new':
    case 'viewed':
    case 'needs_info':
      return 'viewed';
    case 'accepted':
    case 'contacted':
    case 'qualified':
      return 'contacted';
    case 'quoted':
      return 'quoted';
    case 'rejected':
      return 'lost';
    case 'closed':
    case 'cancelled':
      return 'archived';
    case 'spam':
      return 'spam';
    default:
      return null;
  }
}

export function mapLeadActionToLifecycleTarget(
  action: LeadLifecycleAction,
): LeadLifecycleState | null {
  switch (action) {
    case 'lost':
      return 'lost';
    case 'archive':
      return 'archived';
    default:
      return null;
  }
}

/**
 * Translate a target persisted status into a low-risk lifecycle action.
 * Returns null for statuses that are NOT gated by this phase (e.g.
 * 'viewed', 'accepted', 'quoted', 'contacted', 'needs_info').
 */
export function leadActionFromTargetStatus(
  next: string,
): LeadLifecycleAction | null {
  if (next === 'rejected') return 'lost';
  if (next === 'closed') return 'archive';
  return null;
}

export const LEAD_LIFECYCLE_REJECTED_AR =
  'لا يمكن تنفيذ هذا الانتقال للحالة الحالية.';
export const LEAD_LIFECYCLE_REJECTED_EN =
  'This action is not allowed for the current status.';

export interface LeadTransitionCheck {
  allowed: boolean;
  from: LeadLifecycleState | null;
  to: LeadLifecycleState | null;
  reasonAr?: string;
  reasonEn?: string;
}

/**
 * Pure check — returns whether moving a lead in `currentStatus` via
 * `action` is permitted by the canonical lead lifecycle table.
 * When the feature flag is off, returns allowed=true for backwards
 * compatibility (server + RLS still enforce).
 */
export function checkLeadTransition(
  currentStatus: string | null | undefined,
  action: LeadLifecycleAction,
): LeadTransitionCheck {
  const from = mapLeadStatusToLifecycle(currentStatus);
  const to = mapLeadActionToLifecycleTarget(action);

  if (!LIFECYCLE_VALIDATE_LEADS) {
    return { allowed: true, from, to };
  }
  if (!from || !to) {
    return {
      allowed: false,
      from,
      to,
      reasonAr: LEAD_LIFECYCLE_REJECTED_AR,
      reasonEn: LEAD_LIFECYCLE_REJECTED_EN,
    };
  }
  const allowed = canTransition('lead', from, to);
  return {
    allowed,
    from,
    to,
    reasonAr: allowed ? undefined : LEAD_LIFECYCLE_REJECTED_AR,
    reasonEn: allowed ? undefined : LEAD_LIFECYCLE_REJECTED_EN,
  };
}