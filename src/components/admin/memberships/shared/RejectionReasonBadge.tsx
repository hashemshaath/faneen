/**
 * Presentational badge for membership upgrade rejection reason codes.
 * Pure UI — no API, no permissions, no Supabase.
 * Source of truth for reason labels used in:
 *  - AdminMembershipRejections
 *  - Any other admin surface that displays rejection reasons
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';

export type RejectionReasonCode =
  | 'ref_id_mismatch'
  | 'business_user_mismatch'
  | 'business_not_found'
  | 'missing_ref_id'
  | 'expired_card'
  | 'insufficient_funds'
  | 'payment_failed'
  | 'manual_rejection'
  | 'fraud_suspected'
  | 'other'
  | 'unknown'
  | (string & {});

type Tone = 'destructive' | 'warning' | 'secondary';

export interface RejectionReasonMeta {
  ar: string;
  en: string;
  tone: Tone;
}

export const REJECTION_REASON_LABELS: Record<string, RejectionReasonMeta> = {
  ref_id_mismatch:        { ar: 'عدم تطابق المعرّف',     en: 'ref_id mismatch',         tone: 'destructive' },
  business_user_mismatch: { ar: 'المنشأة لمستخدم آخر',   en: 'business/user mismatch',  tone: 'destructive' },
  business_not_found:     { ar: 'لا توجد منشأة',          en: 'business not found',      tone: 'warning' },
  missing_ref_id:         { ar: 'معرّف مرجعي مفقود',     en: 'missing ref_id',          tone: 'warning' },
  expired_card:           { ar: 'بطاقة منتهية',           en: 'expired card',            tone: 'destructive' },
  insufficient_funds:     { ar: 'رصيد غير كافٍ',          en: 'insufficient funds',      tone: 'destructive' },
  payment_failed:         { ar: 'فشل الدفع',              en: 'payment failed',          tone: 'destructive' },
  manual_rejection:       { ar: 'رفض يدوي',               en: 'manual rejection',        tone: 'warning' },
  fraud_suspected:        { ar: 'اشتباه احتيال',          en: 'fraud suspected',         tone: 'destructive' },
  other:                  { ar: 'أخرى',                   en: 'Other',                   tone: 'secondary' },
  unknown:                { ar: 'غير محدد',               en: 'Unknown',                 tone: 'secondary' },
};

export function getRejectionReasonMeta(code: string): RejectionReasonMeta {
  return REJECTION_REASON_LABELS[code] ?? REJECTION_REASON_LABELS.unknown;
}

export interface RejectionReasonBadgeProps {
  code: RejectionReasonCode;
  isRTL?: boolean;
  title?: string;
  className?: string;
}

export const RejectionReasonBadge: React.FC<RejectionReasonBadgeProps> = ({ code, isRTL = true, title, className }) => {
  const meta = getRejectionReasonMeta(code);
  const variant = meta.tone === 'destructive' ? 'destructive' : meta.tone === 'warning' ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className={className} title={title}>
      {isRTL ? meta.ar : meta.en}
    </Badge>
  );
};

export default RejectionReasonBadge;