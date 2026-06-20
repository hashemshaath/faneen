import React from 'react';
import { pickBi } from '@/components/common/Bilingual';

export type StatTone =
  | 'primary' | 'success' | 'warning' | 'destructive' | 'accent' | 'info' | 'muted';

const TONE: Record<StatTone, { bar: string; chip: string; icon: string; accent: string }> = {
  primary:     { bar: 'bg-primary',     chip: 'bg-primary/10 text-primary',         icon: 'bg-primary/10 text-primary',           accent: 'text-primary' },
  success:     { bar: 'bg-success',     chip: 'bg-success/10 text-success',         icon: 'bg-success/10 text-success',           accent: 'text-success' },
  warning:     { bar: 'bg-warning',     chip: 'bg-warning/10 text-warning',         icon: 'bg-warning/10 text-warning',           accent: 'text-warning' },
  destructive: { bar: 'bg-destructive', chip: 'bg-destructive/10 text-destructive', icon: 'bg-destructive/10 text-destructive',   accent: 'text-destructive' },
  accent:      { bar: 'bg-accent',      chip: 'bg-accent/15 text-accent-foreground',icon: 'bg-accent/15 text-accent-foreground',  accent: 'text-accent-foreground' },
  info:        { bar: 'bg-info',        chip: 'bg-info/10 text-info',               icon: 'bg-info/10 text-info',                 accent: 'text-info' },
  muted:       { bar: 'bg-muted-foreground/40', chip: 'bg-muted text-muted-foreground', icon: 'bg-muted text-muted-foreground',   accent: 'text-muted-foreground' },
};

export interface StatTileProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: StatTone;
  /** % of total (0-100) — drives the bottom bar + ratio chip. */
  ratio?: number;
  /** Secondary count to merge inline, e.g. "8 / 12". */
  ofTotal?: number;
  hint?: string;
  /** Optional delta vs previous period, signed. */
  delta?: number;
  isRTL: boolean;
  onClick?: () => void;
}

/**
 * StatTile — distinct from AdminKpiCard: numeric-first layout with an
 * inline ratio chip, optional "X / total" merge, and a footer progress
 * bar that visualises the share. Designed for the Overview command-center
 * top strip.
 */
export const StatTile: React.FC<StatTileProps> = React.memo(
  ({ label, value, icon: Icon, tone = 'primary', ratio, ofTotal, hint, delta, isRTL, onClick }) => {
    const t = TONE[tone];
    const Comp = onClick ? 'button' : 'div';
    const pct = ratio !== undefined ? Math.max(0, Math.min(100, Math.round(ratio))) : undefined;
    return (
      <Comp
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={[
          'group relative overflow-hidden rounded-2xl border border-border/60 bg-card text-start',
          'p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
          onClick ? 'cursor-pointer' : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2">
          <div className={`h-9 w-9 rounded-xl grid place-items-center ${t.icon}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          {pct !== undefined ? (
            <span className={`text-[10.5px] font-bold tabular-nums px-2 py-1 rounded-md ${t.chip}`}>
              {pct}%
            </span>
          ) : delta !== undefined ? (
            <span
              className={`text-[10.5px] font-bold tabular-nums px-2 py-1 rounded-md ${
                delta >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-muted-foreground truncate">{label}</p>

        <div className="mt-1 flex items-baseline gap-1.5 tech-content">
          <span className={`text-[1.75rem] font-heading font-bold leading-none tabular-nums ${t.accent}`}>
            {value}
          </span>
          {ofTotal !== undefined ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              / {ofTotal}
            </span>
          ) : null}
        </div>

        {hint ? (
          <p className="mt-1.5 text-[10.5px] text-muted-foreground/80 truncate">{hint}</p>
        ) : null}

        {pct !== undefined ? (
          <div
            className="mt-3 h-1 w-full rounded-full bg-muted/60 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={pickBi(isRTL, 'النسبة من الإجمالي', 'share of total')}
          >
            <div
              className={`h-full ${t.bar} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </Comp>
    );
  },
);
StatTile.displayName = 'StatTile';

export default StatTile;