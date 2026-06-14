import React from 'react';
import { AdminStatusBadge, type AdminStatusTone } from '@/components/admin/AdminStatusBadge';

export type OperationsStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

const TONE: Record<OperationsStatus, AdminStatusTone> = {
  pending: 'muted',
  running: 'info',
  success: 'success',
  failed: 'destructive',
  skipped: 'muted',
};

export interface OperationsStatusBadgeProps {
  status: OperationsStatus;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * OperationsStatusBadge — display-only chip for generic operation runs.
 * Does not own status logic; caller supplies status + localized label.
 */
export const OperationsStatusBadge: React.FC<OperationsStatusBadgeProps> = ({
  status, label, dot, size, className,
}) => (
  <AdminStatusBadge label={label} tone={TONE[status]} dot={dot} size={size} className={className} />
);

export default OperationsStatusBadge;