/**
 * BUSINESS-OPERATIONS-1B — Lifecycle adapter + transition guard for
 * business_staff_invitations.
 *
 * Additive only. Wraps existing accept/revoke flows with a pre-mutation
 * check using the canonical `staff` lifecycle transition table from
 * `@/modules/shared/lifecycle`. Server-side status checks (RPC + DB)
 * remain the authoritative enforcement; this is an extra client guard.
 *
 * Disable by setting LIFECYCLE_VALIDATE_STAFF_INVITES to false if a
 * production issue appears.
 */
import type { StaffMembershipState } from '@/modules/shared/lifecycle';
import { canTransition } from '@/modules/shared/lifecycle/transitions';

export const LIFECYCLE_VALIDATE_STAFF_INVITES = true;

export type InvitationDbStatus =
  | 'pending'
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired';

export type InvitationAction = 'accept' | 'decline' | 'revoke' | 'expire';

/**
 * Map the persisted `business_staff_invitations.status` value to a
 * canonical `staff` lifecycle state. Unknown inputs map to `null` so
 * callers can fail closed.
 */
export function mapInvitationStatusToLifecycle(
  status: string | null | undefined,
): StaffMembershipState | null {
  switch (status) {
    case 'pending':
    case 'invited':
      return 'pending_acceptance';
    case 'accepted':
      return 'active';
    case 'declined':
      // No canonical 'declined' — declined invites are terminal like revoked.
      return 'revoked';
    case 'revoked':
      return 'revoked';
    case 'expired':
      return 'expired';
    default:
      return null;
  }
}

export function mapActionToLifecycleTarget(
  action: InvitationAction,
): StaffMembershipState | null {
  switch (action) {
    case 'accept':
      return 'active';
    case 'decline':
    case 'revoke':
      return 'revoked';
    case 'expire':
      return 'expired';
    default:
      return null;
  }
}

export const INVITATION_LIFECYCLE_REJECTED_AR =
  'لا يمكن تنفيذ هذا الانتقال للحالة الحالية.';
export const INVITATION_LIFECYCLE_REJECTED_EN =
  'This action is not allowed for the current status.';

export interface InvitationTransitionCheck {
  allowed: boolean;
  from: StaffMembershipState | null;
  to: StaffMembershipState | null;
  reasonAr?: string;
  reasonEn?: string;
}

/**
 * Pure check — returns whether moving an invitation in `currentStatus`
 * via `action` is permitted by the canonical staff lifecycle table.
 * When the feature flag is off, returns allowed=true for backwards
 * compatibility (server still enforces).
 */
export function checkInvitationTransition(
  currentStatus: string | null | undefined,
  action: InvitationAction,
): InvitationTransitionCheck {
  const from = mapInvitationStatusToLifecycle(currentStatus);
  const to = mapActionToLifecycleTarget(action);

  if (!LIFECYCLE_VALIDATE_STAFF_INVITES) {
    return { allowed: true, from, to };
  }
  if (!from || !to) {
    return {
      allowed: false,
      from,
      to,
      reasonAr: INVITATION_LIFECYCLE_REJECTED_AR,
      reasonEn: INVITATION_LIFECYCLE_REJECTED_EN,
    };
  }
  const allowed = canTransition('staff', from, to);
  return {
    allowed,
    from,
    to,
    reasonAr: allowed ? undefined : INVITATION_LIFECYCLE_REJECTED_AR,
    reasonEn: allowed ? undefined : INVITATION_LIFECYCLE_REJECTED_EN,
  };
}