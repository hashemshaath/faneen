import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'feature' | 'wide' | 'tile';

interface Props {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  to?: string;
  variant?: Variant;
  trend?: { label: string; up?: boolean };
  accent?: 'emerald' | 'gold' | 'neutral';
}

const variantClass: Record<Variant, string> = {
  feature: 'bento-feature',
  wide:    'bento-wide',
  tile:    'bento-tile',
};

/** Bento KPI tile — used inside `.dash-emerald .dash-bento` grids. */
export function BentoTile({
  icon: Icon, label, value, sub, to, variant = 'tile', trend, accent = 'emerald',
}: Props) {
  const inner = (
    <div className={cn('dash-tile group', variantClass[variant])}>
      <div className="flex items-start justify-between gap-2">
        <span className="dash-tile-icon" aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5',
              trend.up
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            )}
          >
            {trend.label}
          </span>
        ) : to ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        ) : null}
      </div>
      <div className="mt-3">
        <p className="dash-tile-value tech-content">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <p className="dash-tile-label mt-2">{label}</p>
      {accent === 'gold' && (
        <span className="absolute top-3 end-3 inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--de-gold))]" aria-hidden="true" />
      )}
    </div>
  );
  return to ? <Link to={to} className={cn(variantClass[variant], 'block')}>{inner}</Link> : inner;
}

export default BentoTile;