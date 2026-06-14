import React from 'react';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';

/**
 * VerificationStatusBadge — presentational wrapper around the canonical
 * `VerifiedBadge`. When verified, renders the unified Twitter-style
 * icon. When unverified/pending, renders a muted chip — never invents
 * a new "verified" visual. Caller resolves the status; this component
 * does NOT decide verification.
 */
export type VerificationStatus = 'verified' | 'unverified' | 'pending';

export interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  size?: 'xs' | 'sm' | 'md';
  unverifiedLabel?: string;
  pendingLabel?: string;
  className?: string;
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  status,
  size = 'sm',
  unverifiedLabel = 'Unverified',
  pendingLabel = 'Pending',
  className,
}) => {
  if (status === 'verified') {
    return <VerifiedBadge size={size} className={className} />;
  }
  const chipSize = size === 'md' ? 'md' : 'sm';
  return (
    <AdminStatusBadge
      label={status === 'pending' ? pendingLabel : unverifiedLabel}
      tone={status === 'pending' ? 'warning' : 'muted'}
      size={chipSize}
      className={className}
    />
  );
};

export default VerificationStatusBadge;