import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, FileEdit } from 'lucide-react';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2
 * Display-only badge that maps the existing `businesses.approval_status`
 * (and the legacy `is_verified` boolean) to one of five MVP states:
 *   draft | pending_verification | verified | rejected | needs_more_info.
 *
 * Does NOT change any data, does NOT request KYB documents — it is purely
 * a presentation primitive used by onboarding summary, dashboard cards, and
 * the admin access-requests queue.
 */
export type EntityVerificationStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'needs_more_info';

export interface EntityVerificationStatusBadgeProps {
  approvalStatus?: string | null;
  isVerified?: boolean | null;
  className?: string;
}

export function deriveEntityVerificationStatus(
  approvalStatus?: string | null,
  isVerified?: boolean | null,
): EntityVerificationStatus {
  if (isVerified === true || approvalStatus === 'approved' || approvalStatus === 'published') {
    return 'verified';
  }
  switch (approvalStatus) {
    case 'submitted':
    case 'under_review':
      return 'pending_verification';
    case 'rejected':
      return 'rejected';
    case 'needs_changes':
      return 'needs_more_info';
    case 'draft':
    default:
      return 'draft';
  }
}

const LABELS: Record<EntityVerificationStatus, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  pending_verification: { ar: 'قيد التحقق', en: 'Pending verification' },
  verified: { ar: 'موثقة', en: 'Verified' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
  needs_more_info: { ar: 'يتطلب معلومات إضافية', en: 'Needs more info' },
};

const VARIANT: Record<EntityVerificationStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending_verification: 'bg-warning/10 text-warning-foreground border-warning/30',
  verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  needs_more_info: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
};

const ICON: Record<EntityVerificationStatus, React.ComponentType<{ className?: string }>> = {
  draft: FileEdit,
  pending_verification: Clock,
  verified: ShieldCheck,
  rejected: ShieldAlert,
  needs_more_info: ShieldQuestion,
};

export const EntityVerificationStatusBadge: React.FC<EntityVerificationStatusBadgeProps> = ({
  approvalStatus,
  isVerified,
  className,
}) => {
  const { isRTL } = useLanguage();
  const status = deriveEntityVerificationStatus(approvalStatus, isVerified);
  const Icon = ICON[status];
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 ${VARIANT[status]} ${className ?? ''}`}
      data-verification-status={status}
    >
      <Icon className="w-3 h-3" />
      <span className="text-[11px]">{isRTL ? LABELS[status].ar : LABELS[status].en}</span>
    </Badge>
  );
};