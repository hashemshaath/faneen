import React from 'react';
import { AdminStatusBadge, type AdminStatusTone } from '@/components/admin/AdminStatusBadge';
import { pickBi } from '@/components/common/Bilingual';

/**
 * BusinessStatusBadge — unified status chip for an admin business row.
 *
 * Derives the displayed status from `approval_status` first (draft /
 * pending / approved / rejected / suspended), then falls back to the
 * operational flags `is_active` / `is_verified`. Pure presentational —
 * no Supabase calls, no business logic, no sensitive fields.
 *
 * Color semantics (locked to design tokens — no hex colors):
 *   - approved + active     → success (green)
 *   - pending / review      → warning (amber)
 *   - rejected              → destructive (red)
 *   - suspended / inactive  → muted (grey)
 *   - draft                 → info (blue)
 */
export type BusinessStatusInput = {
  approval_status?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
};

interface BusinessStatusBadgeProps {
  business: BusinessStatusInput;
  isRTL: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

type Derived = { label: string; tone: AdminStatusTone };

function deriveStatus(b: BusinessStatusInput, isRTL: boolean): Derived {
  const status = (b.approval_status || '').toLowerCase();
  if (status === 'rejected') {
    return { label: pickBi(isRTL, 'مرفوضة', 'Rejected'), tone: 'destructive' };
  }
  if (status === 'suspended') {
    return { label: pickBi(isRTL, 'معلّقة', 'Suspended'), tone: 'destructive' };
  }
  if (status === 'pending' || status === 'submitted' || status === 'under_review' || status === 'in_review' || status === 'review') {
    return { label: pickBi(isRTL, 'قيد المراجعة', 'Under Review'), tone: 'warning' };
  }
  if (status === 'approved') {
    return { label: pickBi(isRTL, 'معتمدة غير منشورة', 'Approved · not public'), tone: 'warning' };
  }
  if (status === 'needs_changes') {
    return { label: pickBi(isRTL, 'تحتاج تعديلات', 'Needs changes'), tone: 'warning' };
  }
  if (status === 'draft' || (!status && b.is_active === false && b.is_verified === false)) {
    return { label: pickBi(isRTL, 'مسودة', 'Draft'), tone: 'info' };
  }
  if (b.is_active === false) {
    return { label: pickBi(isRTL, 'غير نشطة', 'Inactive'), tone: 'muted' };
  }
  if (status === 'published' && b.is_verified) {
    return { label: pickBi(isRTL, 'منشورة وموثّقة', 'Published · Verified'), tone: 'success' };
  }
  if (status === 'published') {
    return { label: pickBi(isRTL, 'منشورة', 'Published'), tone: 'success' };
  }
  return { label: pickBi(isRTL, 'غير منشورة', 'Not public'), tone: 'muted' };
}

export const BusinessStatusBadge: React.FC<BusinessStatusBadgeProps> = ({
  business, isRTL, size = 'sm', className,
}) => {
  const { label, tone } = deriveStatus(business, isRTL);
  return <AdminStatusBadge label={label} tone={tone} size={size} className={className} />;
};

export default BusinessStatusBadge;