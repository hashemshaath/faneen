/**
 * BUSINESS-FINISHING-2A — Compact KPI tile.
 *
 * Purely presentational. Values come from already-loaded data + pure
 * helpers in @/modules/analytics. Use <KpiStrip /> for a horizontal row.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export type KpiTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

const TONE: Record<KpiTone, string> = {
  neutral: 'bg-muted/40 text-foreground border-border/60',
  success: 'bg-success/10 text-success border-success/30',
  info:    'bg-info/10 text-info border-info/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger:  'bg-destructive/10 text-destructive border-destructive/30',
};

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  className?: string;
  testId?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, hint, tone = 'neutral', className, testId,
}) => (
  <div
    data-testid={testId}
    className={cn(
      'rounded-xl border px-3 py-2.5 min-w-[8rem] flex flex-col gap-0.5',
      TONE[tone],
      className,
    )}
  >
    <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
    <span className="text-xl font-bold tech-content leading-tight">{value}</span>
    {hint && <span className="text-[10px] opacity-70 truncate">{hint}</span>}
  </div>
);

export interface KpiStripProps {
  items: ReadonlyArray<KpiCardProps>;
  className?: string;
  testId?: string;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ items, className, testId }) => (
  <div
    data-testid={testId ?? 'kpi-strip'}
    className={cn('flex flex-wrap gap-2', className)}
  >
    {items.map((it, i) => (
      <KpiCard key={`${it.label}-${i}`} {...it} />
    ))}
  </div>
);

export default KpiCard;