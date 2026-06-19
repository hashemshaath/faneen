/**
 * PROVIDER INTAKE UX PROFESSIONALIZATION — Compact KPI strip.
 *
 * Reusable horizontal strip of small KPI tiles shown atop the existing
 * `/admin/provider-leads` and `/admin/provider-growth/queue` pages.
 * Tones are bound to semantic design tokens (no hex literals).
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type IntakeKpiTone =
  | 'neutral'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive';

const TONE_CLASSES: Record<IntakeKpiTone, string> = {
  neutral: 'bg-muted/40 text-foreground border-border',
  primary: 'bg-primary/10 text-primary border-primary/30',
  info: 'bg-info/10 text-info border-info/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
};

export interface IntakeKpiItem {
  id: string;
  label: string;
  value: number | string;
  tone?: IntakeKpiTone;
  hint?: string;
  /** Optional mini trend series rendered as a sparkline. */
  spark?: number[];
}

export interface IntakeKpiStripProps {
  items: IntakeKpiItem[];
  className?: string;
  testId?: string;
}

export const IntakeKpiStrip: React.FC<IntakeKpiStripProps> = ({
  items,
  className,
  testId = 'intake-kpi-strip',
}) => {
  return (
    <div
      data-testid={testId}
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5',
        className,
      )}
    >
      {items.map((item) => (
        <Card
          key={item.id}
          data-testid={`${testId}-${item.id}`}
          className={cn(
            'rounded-xl border p-3 transition-colors',
            TONE_CLASSES[item.tone ?? 'neutral'],
          )}
        >
          <div className="text-[11px] font-medium opacity-80 leading-tight">
            {item.label}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="text-lg font-bold tech-content leading-none">
              {item.value}
            </div>
            {item.spark && item.spark.length > 0 && (
              <Sparkline series={item.spark} />
            )}
          </div>
          {item.hint && (
            <div className="mt-1 text-[10px] opacity-70">{item.hint}</div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default IntakeKpiStrip;

const Sparkline: React.FC<{ series: number[] }> = ({ series }) => {
  const w = 56;
  const h = 18;
  const max = Math.max(1, ...series);
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const pts = series
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`)
    .join(' L');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="opacity-80">
      <path d={`M${pts}`} stroke="currentColor" strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};