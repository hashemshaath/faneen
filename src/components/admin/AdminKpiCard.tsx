import React from 'react';
import { TrendingUp } from 'lucide-react';

export type AdminKpiTone =
  | 'primary' | 'accent' | 'success' | 'info' | 'warning' | 'destructive' | 'secondary' | 'muted';

interface AdminKpiCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: AdminKpiTone;
  trend?: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}

const TONE_MAP: Record<AdminKpiTone, { gradient: string; iconBg: string; ring: string }> = {
  primary:     { gradient: 'from-primary/10 to-primary/[0.02]',         iconBg: 'bg-primary/15 text-primary',                 ring: 'ring-primary/30' },
  accent:      { gradient: 'from-accent/10 to-accent/[0.02]',           iconBg: 'bg-accent/20 text-accent-foreground',        ring: 'ring-accent/30' },
  success:     { gradient: 'from-success/10 to-success/[0.02]',         iconBg: 'bg-success/15 text-success',                 ring: 'ring-success/30' },
  info:        { gradient: 'from-info/10 to-info/[0.02]',               iconBg: 'bg-info/15 text-info',                       ring: 'ring-info/30' },
  warning:     { gradient: 'from-warning/10 to-warning/[0.02]',         iconBg: 'bg-warning/15 text-warning',                 ring: 'ring-warning/30' },
  destructive: { gradient: 'from-destructive/10 to-destructive/[0.02]', iconBg: 'bg-destructive/15 text-destructive',         ring: 'ring-destructive/30' },
  secondary:   { gradient: 'from-secondary/10 to-secondary/[0.02]',     iconBg: 'bg-secondary/15 text-secondary',             ring: 'ring-secondary/30' },
  muted:       { gradient: 'from-muted/40 to-muted/10',                 iconBg: 'bg-muted text-muted-foreground',             ring: 'ring-border' },
};

/**
 * AdminKpiCard — unified KPI tile for admin surfaces.
 * Optionally clickable (renders as a button) for status filtering.
 */
export const AdminKpiCard: React.FC<AdminKpiCardProps> = React.memo(
  ({ label, value, icon: Icon, tone = 'primary', trend, hint, active, onClick }) => {
    const t = TONE_MAP[tone];
    const Comp = onClick ? 'button' : 'div';
    return (
      <Comp
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={[
          'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 md:p-4',
          'text-start transition-all',
          t.gradient,
          active
            ? `border-transparent ring-2 ${t.ring} shadow-md`
            : 'border-border/40 hover:border-border hover:shadow-md',
          onClick ? 'cursor-pointer hover-lift' : '',
        ].join(' ')}
        aria-pressed={onClick ? !!active : undefined}
      >
        <div className="flex items-center gap-3">
          <div
            className={`shrink-0 h-10 w-10 rounded-xl ${t.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl md:text-2xl font-heading font-bold leading-none tabular-nums tech-content">
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
          </div>
          {trend && (
            <div className="flex items-center gap-0.5 text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded-full font-medium tabular-nums tech-content">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
        {hint && (
          <p className="mt-2 text-[10px] text-muted-foreground/80 truncate">{hint}</p>
        )}
      </Comp>
    );
  },
);
AdminKpiCard.displayName = 'AdminKpiCard';

export default AdminKpiCard;