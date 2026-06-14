import React from 'react';
import { AdminStatusBadge, type AdminStatusTone } from '@/components/admin/AdminStatusBadge';

export type NotificationStatus =
  | 'pending' | 'sent' | 'failed' | 'dlq' | 'suppressed' | 'bounced' | 'complained';

const TONE: Record<NotificationStatus, AdminStatusTone> = {
  pending: 'muted',
  sent: 'success',
  failed: 'destructive',
  dlq: 'destructive',
  suppressed: 'warning',
  bounced: 'warning',
  complained: 'warning',
};

export interface NotificationStatusBadgeProps {
  status: NotificationStatus;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * NotificationStatusBadge — display-only chip for email/notification send
 * states. Does NOT change send/retry/DLQ behavior.
 */
export const NotificationStatusBadge: React.FC<NotificationStatusBadgeProps> = ({
  status, label, dot, size, className,
}) => (
  <AdminStatusBadge label={label} tone={TONE[status]} dot={dot} size={size} className={className} />
);

export default NotificationStatusBadge;