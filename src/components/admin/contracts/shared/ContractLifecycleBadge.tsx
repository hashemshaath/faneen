/**
 * Presentational chip for contract lifecycle states (analytics / timeline).
 *
 * Pure UI — no Supabase, no queries, no mutations. Labels come from the
 * same single source of truth as `ContractStatusBadge`
 * (`getContractStatusMeta` in `@/lib/contract-statuses`).
 *
 * Distinct from `ContractStatusBadge` only in visual weight: this is a
 * compact pill suitable for analytics legends, timeline dots, and small
 * lifecycle indicators.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { getContractStatusMeta, type ContractStatus } from '@/lib/contract-statuses';

export type ContractLifecycleTone =
  | 'muted'
  | 'warning'
  | 'success'
  | 'info'
  | 'destructive';

const TONE_DOT: Record<ContractLifecycleTone, string> = {
  muted: 'bg-muted-foreground/60',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-info',
  destructive: 'bg-destructive',
};

const TONE_RING: Record<ContractLifecycleTone, string> = {
  muted: 'ring-muted-foreground/20 text-muted-foreground',
  warning: 'ring-warning/30 text-warning',
  success: 'ring-success/30 text-success',
  info: 'ring-info/30 text-info',
  destructive: 'ring-destructive/30 text-destructive',
};

const STATUS_TONE: Record<ContractStatus, ContractLifecycleTone> = {
  draft: 'muted',
  pending_approval: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'muted',
  disputed: 'destructive',
};

export interface ContractLifecycleBadgeProps {
  status: string | null | undefined;
  isRTL?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

export const ContractLifecycleBadge: React.FC<ContractLifecycleBadgeProps> = ({
  status,
  isRTL = true,
  size = 'sm',
  className,
}) => {
  const meta = getContractStatusMeta(status);
  const key = (status ?? 'draft') as ContractStatus;
  const tone = STATUS_TONE[key] ?? 'muted';
  const label = isRTL ? meta.label_ar : meta.label_en;
  const sizeCls = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset bg-background',
        sizeCls,
        TONE_RING[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} aria-hidden />
      <span>{label}</span>
    </span>
  );
};

export default ContractLifecycleBadge;