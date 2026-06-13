/**
 * Props-driven KPI strip for admin contracts surfaces.
 *
 * Pure UI — no Supabase, no queries, no aggregations. All items must be
 * computed upstream by the page that owns the data.
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContractStatsTone =
  | 'neutral'
  | 'muted'
  | 'warning'
  | 'success'
  | 'info'
  | 'destructive';

const TONE_CARD: Record<ContractStatsTone, string> = {
  neutral: 'border-border bg-card',
  muted: 'border-border bg-muted/30',
  warning: 'border-warning/30 bg-warning/5',
  success: 'border-success/30 bg-success/5',
  info: 'border-info/30 bg-info/5',
  destructive: 'border-destructive/30 bg-destructive/5',
};

const TONE_VALUE: Record<ContractStatsTone, string> = {
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
  destructive: 'text-destructive',
};

const TONE_ICON: Record<ContractStatsTone, string> = {
  neutral: 'text-muted-foreground',
  muted: 'text-muted-foreground',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
  destructive: 'text-destructive',
};

export interface ContractStatsItem {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
  tone?: ContractStatsTone;
  icon?: LucideIcon;
}

export interface ContractStatsStripProps {
  items: ContractStatsItem[];
  className?: string;
  columnsClassName?: string;
}

export const ContractStatsStrip: React.FC<ContractStatsStripProps> = ({
  items,
  className,
  columnsClassName,
}) => {
  if (!items.length) return null;
  return (
    <div
      className={cn(
        'grid gap-3',
        columnsClassName ?? 'grid-cols-2 md:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => {
        const tone = item.tone ?? 'neutral';
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={cn(
              'rounded-xl border p-4 flex flex-col gap-1 transition-colors',
              TONE_CARD[tone],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
              {Icon ? <Icon className={cn('h-4 w-4', TONE_ICON[tone])} aria-hidden /> : null}
            </div>
            <div className={cn('text-2xl font-semibold tabular-nums', TONE_VALUE[tone])}>
              {item.value}
            </div>
            {item.helper ? (
              <div className="text-xs text-muted-foreground">{item.helper}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default ContractStatsStrip;