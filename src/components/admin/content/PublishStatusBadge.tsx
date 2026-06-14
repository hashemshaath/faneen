import React from 'react';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { AdminStatusBadge, type AdminStatusTone } from '@/components/admin/AdminStatusBadge';

/**
 * PublishStatusBadge — read-only chip for "is this visible publicly?"
 * Presentational only — caller passes the resolved status. Does NOT
 * compute visibility, never imports Supabase, never decides publish.
 */
export type PublishStatus = 'published' | 'hidden' | 'pending';

export interface PublishStatusBadgeProps {
  status: PublishStatus;
  publishedLabel?: string;
  hiddenLabel?: string;
  pendingLabel?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const TONE: Record<PublishStatus, AdminStatusTone> = {
  published: 'success',
  hidden: 'muted',
  pending: 'warning',
};

const ICON = {
  published: Eye,
  hidden: EyeOff,
  pending: Clock,
} as const;

export const PublishStatusBadge: React.FC<PublishStatusBadgeProps> = ({
  status,
  publishedLabel = 'Published',
  hiddenLabel = 'Hidden',
  pendingLabel = 'Pending',
  size = 'sm',
  showIcon = true,
  className,
}) => {
  const Icon = ICON[status];
  const label =
    status === 'published' ? publishedLabel
    : status === 'hidden' ? hiddenLabel
    : pendingLabel;
  return (
    <span className={['inline-flex items-center gap-1.5', className ?? ''].join(' ')}>
      {showIcon && (
        <Icon
          aria-hidden="true"
          className={size === 'md' ? 'h-3.5 w-3.5 text-muted-foreground' : 'h-3 w-3 text-muted-foreground'}
        />
      )}
      <AdminStatusBadge label={label} tone={TONE[status]} size={size} />
    </span>
  );
};

export default PublishStatusBadge;