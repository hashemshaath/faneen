/**
 * Presentational badge for admin brand-request statuses.
 *
 * Pure UI — no Supabase, no queries, no mutations. Labels and tones mirror
 * the existing maps inlined in `AdminBrandRequests.tsx` so adoption is a
 * drop-in replacement. Status values are NOT redefined.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export type BrandRequestStatusValue =
  | 'pending'
  | 'in_review'
  | 'needs_more_info'
  | 'approved'
  | 'rejected';

export const BRAND_REQUEST_STATUS_LABEL_AR: Record<BrandRequestStatusValue, string> = {
  pending: 'قيد الانتظار',
  in_review: 'قيد المراجعة',
  needs_more_info: 'يحتاج معلومات إضافية',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

export const BRAND_REQUEST_STATUS_LABEL_EN: Record<BrandRequestStatusValue, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  needs_more_info: 'Needs More Info',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const BRAND_REQUEST_STATUS_TONE: Record<BrandRequestStatusValue, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  in_review: 'bg-primary/10 text-primary border-primary/30',
  needs_more_info: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

export interface BrandRequestStatusBadgeProps {
  status: string | null | undefined;
  isRTL?: boolean;
  className?: string;
}

const FALLBACK = 'bg-muted text-muted-foreground border-border';

export const BrandRequestStatusBadge: React.FC<BrandRequestStatusBadgeProps> = ({
  status,
  isRTL = true,
  className,
}) => {
  const key = (status ?? 'pending') as BrandRequestStatusValue;
  const tone = BRAND_REQUEST_STATUS_TONE[key] ?? FALLBACK;
  const label =
    (isRTL ? BRAND_REQUEST_STATUS_LABEL_AR[key] : BRAND_REQUEST_STATUS_LABEL_EN[key]) ??
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

export default BrandRequestStatusBadge;