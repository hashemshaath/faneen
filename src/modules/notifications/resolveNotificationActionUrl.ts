/**
 * Resolve the destination URL for a notification click.
 *
 * Priority:
 *   1. Explicit `action_url` on the row (unless it points at a coarse list
 *      URL that we can improve via `reference_type` + `reference_id`).
 *   2. Deterministic map from `reference_type` + `notification_type`
 *      + optional `metadata.audience` to a canonical dashboard route.
 *   3. Safe fallback → `/dashboard/notifications` (never `null`).
 */
type NotificationActionLike = {
  action_url?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notification_type?: string | null;
  metadata?: Record<string, any> | null;
};

const NOTIFICATIONS_HOME = '/dashboard/notifications';

/** Notification types that indicate the recipient is a provider. */
const PROVIDER_TYPES = new Set<string>([
  'opportunity_provider_matched',
  'opportunity_assigned',
  'opportunity_awarded',
  'opportunity_award_lost',
  'opportunity_bid_shortlisted',
  'opportunity_bid_declined',
  'opportunity_bid_revision_requested',
  'quote_lead_assigned',
  'quote_contact_revealed',
  'lead_created',
  'provider_credit_granted',
  'provider_credit_consumed',
  'provider_brand_link_approved',
  'provider_brand_link_rejected',
]);

function isProviderAudience(n: NotificationActionLike): boolean {
  const audience = n.metadata?.audience;
  if (audience === 'provider') return true;
  if (audience === 'client') return false;
  return PROVIDER_TYPES.has(n.notification_type || '');
}

export function resolveNotificationActionUrl(notification: NotificationActionLike): string {
  const raw = notification.action_url?.trim();
  const actionUrl = raw && raw.length > 0 ? raw : null;
  const refId = notification.reference_id || null;
  const refType = notification.reference_type || null;
  const nType = notification.notification_type || '';

  // Coarse list URLs we happily override when we have a better deep-link.
  const COARSE = new Set(['/dashboard/my-requests', '/dashboard/opportunities', '/dashboard/contracts', '/dashboard/notifications']);
  const canUpgrade = !actionUrl || COARSE.has(actionUrl);

  // ── quote_request (client-owned RFQ) — keep existing behaviour.
  if (refType === 'quote_request' && refId && canUpgrade) {
    return `/dashboard/my-requests/${refId}`;
  }

  // ── Opportunity family — route by audience.
  if ((refType === 'opportunity' || refType === 'opportunity_bid' || nType.startsWith('opportunity_') || nType === 'rfq_clarification_posted') && canUpgrade) {
    const provider = isProviderAudience(notification);
    if (provider) {
      // For bid-level rows we still land on the assigned inbox because
      // reference_id is a bid id, not an opportunity id.
      if (refType === 'opportunity' && refId) return `/dashboard/opportunities/${refId}`;
      return '/dashboard/opportunities/assigned';
    }
    // Client audience.
    if (refType === 'opportunity' && refId) return `/dashboard/my-requests/${refId}`;
    return '/dashboard/my-requests';
  }

  // ── Contracts / milestones / payments.
  if ((refType === 'contract' || nType.startsWith('contract_') || nType === 'payment_due' || nType === 'stage_completed' || nType === 'stage_awaiting') && canUpgrade) {
    if (refId) return `/dashboard/contracts/${refId}/review`;
    return '/dashboard/contracts';
  }

  // ── Membership.
  if (refType === 'membership' || nType.startsWith('membership_')) {
    return actionUrl && !canUpgrade ? actionUrl : '/dashboard/membership';
  }

  // ── Provider leads / assigned quotes.
  if (refType === 'lead' || nType.startsWith('lead_') || nType === 'quote_lead_assigned' || nType === 'quote_contact_revealed') {
    if (canUpgrade) return refId ? `/dashboard/leads/${refId}` : '/dashboard/opportunities/assigned';
  }

  // ── Invitations (business staff, client).
  if (refType === 'business_staff_invitation' || nType === 'business_staff_invitation') {
    return actionUrl && !canUpgrade ? actionUrl : '/dashboard/staff';
  }
  if (refType === 'client_invitation' || nType === 'client_invitation') {
    return actionUrl && !canUpgrade ? actionUrl : '/dashboard/clients';
  }

  // ── Brand approvals.
  if (nType.startsWith('brand_request_') || nType.startsWith('provider_brand_link_') || refType === 'brand_request' || refType === 'provider_brand_link') {
    return actionUrl && !canUpgrade ? actionUrl : '/dashboard/brands';
  }

  // ── Maintenance / warranty.
  if (refType === 'maintenance' || nType.startsWith('maintenance_')) {
    if (canUpgrade) return refId ? `/dashboard/work-orders/${refId}` : '/dashboard/work-orders';
  }
  if (nType === 'warranty_expiring' || refType === 'warranty') {
    return actionUrl && !canUpgrade ? actionUrl : '/dashboard/warranties';
  }

  // ── Explicit action_url wins if we couldn't do better.
  if (actionUrl) return actionUrl;

  // ── Final safety net — never return null.
  return NOTIFICATIONS_HOME;
}