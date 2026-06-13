/**
 * Presentational badge for admin contract statuses.
 *
 * Pure UI — no Supabase, no queries, no mutations. Labels and tone come
 * from the single source of truth `getContractStatusMeta` in
 * `@/lib/contract-statuses`. Do NOT redefine labels or statuses here.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getContractStatusMeta, type ContractStatus } from '@/lib/contract-statuses';

export type ContractStatusBadgeTone =
  | 'muted'
  | 'warning'
  | 'success'
  | 'info'
  | 'destructive';

const TONE_CLASSES: Record<ContractStatusBadgeTone, string> = {
  muted: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/10 text-warning border-warning/30',
  success: 'bg-success/10 text-success border-success/30',
  info: 'bg-info/10 text-info border-info/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
};

const STATUS_TONE: Record<ContractStatus, ContractStatusBadgeTone> = {
  draft: 'muted',
  pending_approval: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'muted',
  disputed: 'destructive',
};

export interface ContractStatusBadgeProps {
  status: string | null | undefined;
  isRTL?: boolean;
  withIcon?: boolean;
  className?: string;
}

export const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({
  status,
  isRTL = true,
  withIcon = false,
  className,
}) => {
  const meta = getContractStatusMeta(status);
  const key = (status ?? 'draft') as ContractStatus;
  const tone = STATUS_TONE[key] ?? 'muted';
  const Icon = meta.icon;
  const label = isRTL ? meta.label_ar : meta.label_en;
  return (
    <Badge variant="outline" className={cn('gap-1', TONE_CLASSES[tone], className)}>
      {withIcon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      <span>{label}</span>
    </Badge>
  );
};

export default ContractStatusBadge;