/**
 * BUSINESS-FINISHING-1 Phase H — Read-only access events timeline.
 *
 * Filters business_audit_log to identity/access events:
 * user added, role changed, owner/manager changes, invitation accepted.
 */
import React from 'react';
import { UnifiedTimeline } from '@/components/timeline/UnifiedTimeline';
import { useLanguage } from '@/i18n/LanguageContext';
import type { BusinessActivityEvent } from '@/modules/businesses/notes/services/listBusinessActivityTimeline';

const ACCESS_ACTIONS = new Set([
  'user_added',
  'user_removed',
  'role_changed',
  'role_granted',
  'role_revoked',
  'owner_changed',
  'primary_manager_changed',
  'invitation_sent',
  'invitation_accepted',
  'invitation_declined',
  'membership_created',
  'membership_suspended',
]);

const ACCESS_ENTITIES = new Set([
  'user_role', 'membership', 'staff_invitation', 'business_member', 'business',
]);

export const isAccessEvent = (e: BusinessActivityEvent): boolean =>
  ACCESS_ACTIONS.has(e.action) || ACCESS_ENTITIES.has(e.entity_type);

export const AccessTimeline: React.FC<{ businessId: string; className?: string }> = ({
  businessId, className,
}) => {
  const { isRTL } = useLanguage();
  return (
    <UnifiedTimeline
      businessId={businessId}
      limit={50}
      filter={isAccessEvent}
      title={isRTL ? 'سجل الوصول' : 'Access timeline'}
      className={className}
    />
  );
};

export default AccessTimeline;