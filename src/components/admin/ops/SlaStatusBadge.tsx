import React from 'react';
import { AdminStatusBadge, type AdminStatusTone } from '@/components/admin/AdminStatusBadge';

export type SlaStatus = 'on_time' | 'at_risk' | 'breached' | 'escalated';

const TONE: Record<SlaStatus, AdminStatusTone> = {
  on_time: 'success',
  at_risk: 'warning',
  breached: 'destructive',
  escalated: 'info',
};

export interface SlaStatusBadgeProps {
  status: SlaStatus;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * SlaStatusBadge — display-only chip for SLA states. Does NOT compute SLA;
 * caller supplies the resolved status.
 */
export const SlaStatusBadge: React.FC<SlaStatusBadgeProps> = ({
  status, label, dot, size, className,
}) => (
  <AdminStatusBadge label={label} tone={TONE[status]} dot={dot} size={size} className={className} />
);

export default SlaStatusBadge;