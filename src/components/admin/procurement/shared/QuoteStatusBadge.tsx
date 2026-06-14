/**
 * Presentational badge for admin RFQ (quote request) statuses.
 *
 * Pure UI — no Supabase, no queries, no mutations. Labels and tone come
 * from the single source of truth in
 * `@/modules/leads/constants/quoteStatuses` (re-exported via
 * `@/lib/quoteRequests`). Do NOT redefine labels or statuses here.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import {
  QUOTE_STATUS_LABEL_AR,
  QUOTE_STATUS_LABEL_EN,
  QUOTE_STATUS_TONE,
  type QuoteStatus,
} from '@/modules/leads/constants/quoteStatuses';

export interface QuoteStatusBadgeProps {
  status: string | null | undefined;
  isRTL?: boolean;
  className?: string;
}

const FALLBACK = 'bg-muted text-muted-foreground border-border';

export const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({
  status,
  isRTL = true,
  className,
}) => {
  const key = (status ?? 'new') as QuoteStatus;
  const tone = QUOTE_STATUS_TONE[key] ?? FALLBACK;
  const label =
    (isRTL ? QUOTE_STATUS_LABEL_AR[key] : QUOTE_STATUS_LABEL_EN[key]) ??
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

export default QuoteStatusBadge;