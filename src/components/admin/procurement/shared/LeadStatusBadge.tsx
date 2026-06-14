/**
 * Presentational badge for admin provider-lead statuses.
 *
 * Pure UI — no Supabase, no queries, no mutations. Labels and tone come
 * from the single source of truth in
 * `@/modules/leads/constants/quoteStatuses`. Do NOT redefine labels here.
 *
 * Note: this is the *admin procurement* lead status badge. The provider
 * dashboard variant lives at `@/modules/leads/components/LeadStatusBadge`.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import {
  LEAD_STATUS_LABEL_AR,
  LEAD_STATUS_TONE,
  type LeadRequestStatus,
} from '@/modules/leads/constants/quoteStatuses';

const LEAD_STATUS_LABEL_EN: Record<LeadRequestStatus, string> = {
  new: 'New',
  viewed: 'Viewed',
  interested: 'Interested',
  not_interested: 'Not interested',
  contacted: 'Contacted',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export interface LeadStatusBadgeProps {
  status: string | null | undefined;
  isRTL?: boolean;
  className?: string;
}

const FALLBACK = 'bg-muted text-muted-foreground border-border';

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({
  status,
  isRTL = true,
  className,
}) => {
  const key = (status ?? 'new') as LeadRequestStatus;
  const tone = LEAD_STATUS_TONE[key] ?? FALLBACK;
  const label =
    (isRTL ? LEAD_STATUS_LABEL_AR[key] : LEAD_STATUS_LABEL_EN[key]) ??
    String(status ?? '');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 h-[22px] text-[11px] font-semibold whitespace-nowrap',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
};

export default LeadStatusBadge;