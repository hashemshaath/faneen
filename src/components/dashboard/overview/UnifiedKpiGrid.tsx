import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Phase A — Unified KPI Grid (4 columns).
 * Industrial clean style chosen by the user (v1 direction). Each tile shows
 * a label, a large numeric value, and an optional delta pill with trend.
 */
export interface UnifiedKpiTile {
  id: string;
  label: string;
  /** Already-formatted value (e.g. "45,200 ر.س"). */
  value: string | number;
  /** Optional small sub-label under the value. */
  sub?: string | null;
  /** Optional trend delta (e.g. "+12%"). Sign drives color & arrow. */
  delta?: { value: string; direction: 'up' | 'down' | 'neutral' } | null;
  /** Optional destination route on click. */
  to?: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
}

export const UnifiedKpiGrid: React.FC<{ tiles: UnifiedKpiTile[]; isRTL: boolean }> = ({
  tiles,
  isRTL,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {tiles.map((t) => {
        const TrendIcon =
          t.delta?.direction === 'down' ? TrendingDown : TrendingUp;
        const deltaTone =
          t.delta?.direction === 'down'
            ? 'text-destructive bg-destructive/10'
            : t.delta?.direction === 'up'
              ? 'text-success bg-success/10'
              : 'text-muted-foreground bg-muted/60';
        const Icon = t.icon;

        const inner = (
          <div
            className={cn(
              'bg-card p-4 sm:p-5 rounded-xl border border-border/60 transition-all h-full',
              t.to && 'hover:border-primary/40 hover:shadow-sm cursor-pointer',
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {t.label}
              </p>
              {Icon && (
                <Icon
                  className="w-4 h-4 text-muted-foreground/60 shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex items-end justify-between gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-bold leading-none tracking-tight tech-content text-foreground">
                {t.value}
              </h3>
              {t.delta && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 tech-content',
                    deltaTone,
                  )}
                  aria-label={
                    isRTL
                      ? `تغيّر ${t.delta.value}`
                      : `change ${t.delta.value}`
                  }
                >
                  <TrendIcon className="w-3 h-3" aria-hidden="true" />
                  {t.delta.value}
                </span>
              )}
            </div>
            {t.sub && (
              <p className="text-[10px] text-muted-foreground/80 mt-2 truncate">
                {t.sub}
              </p>
            )}
          </div>
        );

        return t.to ? (
          <Link key={t.id} to={t.to} className="block h-full">
            {inner}
          </Link>
        ) : (
          <div key={t.id} className="h-full">
            {inner}
          </div>
        );
      })}
    </div>
  );
};

UnifiedKpiGrid.displayName = 'UnifiedKpiGrid';