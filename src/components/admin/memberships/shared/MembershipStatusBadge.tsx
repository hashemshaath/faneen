/**
 * Presentational badge for membership subscription statuses.
 * Pure UI — no API, no permissions, no Supabase. Uses semantic tokens only.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MembershipStatusValue =
  | 'active'
  | 'canceled'
  | 'cancelled'
  | 'past_due'
  | 'incomplete'
  | 'trialing'
  | 'expired'
  | 'pending'
  | (string & {});

type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
  info: 'bg-info/10 text-info border-info/30',
  muted: 'bg-muted text-muted-foreground border-border',
};

const STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  trialing: 'info',
  pending: 'warning',
  past_due: 'warning',
  incomplete: 'warning',
  canceled: 'muted',
  cancelled: 'muted',
  expired: 'destructive',
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  active: { ar: 'نشطة', en: 'Active' },
  trialing: { ar: 'تجريبية', en: 'Trialing' },
  pending: { ar: 'بانتظار', en: 'Pending' },
  past_due: { ar: 'متأخرة', en: 'Past due' },
  incomplete: { ar: 'غير مكتملة', en: 'Incomplete' },
  canceled: { ar: 'ملغاة', en: 'Canceled' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' },
  expired: { ar: 'منتهية', en: 'Expired' },
  paused: { ar: 'موقوفة', en: 'Paused' },
};

export interface MembershipStatusBadgeProps {
  status: MembershipStatusValue;
  isRTL?: boolean;
  className?: string;
}

export const MembershipStatusBadge: React.FC<MembershipStatusBadgeProps> = ({ status, isRTL = true, className }) => {
  const tone = STATUS_TONE[status] ?? 'muted';
  const label = STATUS_LABEL[status];
  const text = label ? (isRTL ? label.ar : label.en) : status;
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      {text}
    </Badge>
  );
};

export default MembershipStatusBadge;