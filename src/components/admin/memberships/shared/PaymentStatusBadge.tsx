/**
 * Presentational badge for membership payment intent statuses.
 * Pure UI — no API, no permissions, no Supabase.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PaymentStatusValue =
  | 'succeeded'
  | 'paid'
  | 'created'
  | 'pending'
  | 'requires_action'
  | 'failed'
  | 'cancelled'
  | 'canceled'
  | 'refunded'
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
  succeeded: 'success',
  paid: 'success',
  created: 'info',
  pending: 'warning',
  requires_action: 'warning',
  failed: 'destructive',
  cancelled: 'muted',
  canceled: 'muted',
  refunded: 'muted',
};

export interface PaymentStatusBadgeProps {
  status: PaymentStatusValue;
  label?: string;
  className?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, label, className }) => {
  const tone = STATUS_TONE[status] ?? 'muted';
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      {label ?? status}
    </Badge>
  );
};

export default PaymentStatusBadge;