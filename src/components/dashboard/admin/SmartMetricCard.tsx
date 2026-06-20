import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SmartTone = 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'destructive';

const TONE_MAP: Record<SmartTone, { ring: string; chip: string; stroke: string; fill: string; iconBg: string; iconFg: string }> = {
  primary:     { ring: 'hover:border-primary/40',     chip: 'bg-primary/10 text-primary',         stroke: 'hsl(var(--primary))',     fill: 'hsl(var(--primary) / 0.18)',     iconBg: 'bg-primary/10',     iconFg: 'text-primary' },
  accent:      { ring: 'hover:border-accent/40',      chip: 'bg-accent/10 text-accent',           stroke: 'hsl(var(--accent))',      fill: 'hsl(var(--accent) / 0.18)',      iconBg: 'bg-accent/10',      iconFg: 'text-accent' },
  success:     { ring: 'hover:border-success/40',     chip: 'bg-success/10 text-success',         stroke: 'hsl(var(--success))',     fill: 'hsl(var(--success) / 0.18)',     iconBg: 'bg-success/10',     iconFg: 'text-success' },
  warning:     { ring: 'hover:border-warning/40',     chip: 'bg-warning/10 text-warning',         stroke: 'hsl(var(--warning))',     fill: 'hsl(var(--warning) / 0.18)',     iconBg: 'bg-warning/10',     iconFg: 'text-warning' },
  info:        { ring: 'hover:border-info/40',        chip: 'bg-info/10 text-info',               stroke: 'hsl(var(--info))',        fill: 'hsl(var(--info) / 0.18)',        iconBg: 'bg-info/10',        iconFg: 'text-info' },
  destructive: { ring: 'hover:border-destructive/40', chip: 'bg-destructive/10 text-destructive', stroke: 'hsl(var(--destructive))', fill: 'hsl(var(--destructive) / 0.18)', iconBg: 'bg-destructive/10', iconFg: 'text-destructive' },
};

export interface SmartMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** Series of numeric samples (oldest → newest) for the sparkline. */
  series?: readonly number[];
  /** Override the auto-computed trend % (e.g. when series isn't available). */
  trendPercent?: number | null;
  /** Smart, human-readable insight sentence (already localized). */
  insight?: string;
  to?: string;
  tone?: SmartTone;
  chart?: 'area' | 'bars';
  isRTL: boolean;
}

function computeTrend(series: readonly number[]): number | null {
  if (series.length < 2) return null;
  const half = Math.max(1, Math.floor(series.length / 2));
  const prev = series.slice(0, half).reduce((a, b) => a + b, 0);
  const curr = series.slice(half).reduce((a, b) => a + b, 0);
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 100);
}

export function SmartMetricCard({
  icon: Icon, label, value, series, trendPercent, insight, to, tone = 'primary', chart = 'area', isRTL,
}: SmartMetricCardProps) {
  const t = TONE_MAP[tone];
  const hasSeries = !!series && series.length > 0 && series.some((v) => v > 0);
  const data = useMemo(
    () => (hasSeries ? series! : []).map((v, i) => ({ i, v })),
    [series, hasSeries],
  );
  const trend = trendPercent ?? (hasSeries ? computeTrend(series!) : null);
  const TrendIcon = trend === null || trend === 0 ? Minus : trend > 0 ? ArrowUpRight : ArrowDownRight;
  const trendLabel = trend === null ? '—' : `${trend > 0 ? '+' : ''}${trend}%`;
  const trendChip = trend === null
    ? 'bg-muted/60 text-muted-foreground'
    : trend > 0
      ? 'bg-success/10 text-success'
      : trend < 0
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted/60 text-muted-foreground';

  const body = (
    <Card className={cn('relative overflow-hidden border-border/40 transition-colors p-4 flex flex-col gap-3 h-full', t.ring)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', t.iconBg, t.iconFg)}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{label}</span>
        </div>
        <span className={cn('inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md text-[10px] font-semibold tech-content', trendChip)}>
          <TrendIcon className="w-3 h-3" aria-hidden="true" />
          {trendLabel}
        </span>
      </div>
      <div className="tech-content text-2xl font-bold leading-none">{value}</div>
      {hasSeries && (
        <div className="h-[42px] -mx-1" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            {chart === 'bars' ? (
              <BarChart data={data}>
                <Bar dataKey="v" fill={t.stroke} radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`smart-grad-${tone}-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.stroke} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={t.stroke}
                  strokeWidth={1.75}
                  fill={`url(#smart-grad-${tone}-${label})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {insight && (
        <p className="text-[10px] leading-snug text-muted-foreground line-clamp-2">
          {insight}
        </p>
      )}
    </Card>
  );

  if (!to) return body;
  return (
    <Link to={to} className="group block" aria-label={label}>
      {body}
    </Link>
  );
}

// Convenience: build a deterministic series from a monthly array.
export function seriesFromMonthly(arr: ReadonlyArray<{ count: number }> | undefined, take = 6): number[] {
  if (!arr || arr.length === 0) return [];
  return arr.slice(-take).map((m) => m.count);
}