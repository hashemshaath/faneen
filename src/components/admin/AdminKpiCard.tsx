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
  primary:     { gradient: 'bg-card',  iconBg: 'bg-primary/10 text-primary',          ring: 'ring-primary/30' },
  accent:      { gradient: 'bg-card',  iconBg: 'bg-accent/15 text-accent-foreground', ring: 'ring-accent/30' },
  success:     { gradient: 'bg-card',  iconBg: 'bg-success/10 text-success',          ring: 'ring-success/30' },
  info:        { gradient: 'bg-card',  iconBg: 'bg-info/10 text-info',                ring: 'ring-info/30' },
  warning:     { gradient: 'bg-card',  iconBg: 'bg-warning/10 text-warning',          ring: 'ring-warning/30' },
  destructive: { gradient: 'bg-card',  iconBg: 'bg-destructive/10 text-destructive',  ring: 'ring-destructive/30' },
  secondary:   { gradient: 'bg-card',  iconBg: 'bg-secondary/15 text-secondary',      ring: 'ring-secondary/30' },
  muted:       { gradient: 'bg-card',  iconBg: 'bg-muted text-muted-foreground',      ring: 'ring-border' },
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
          'group relative overflow-hidden rounded-3xl border p-4 md:p-5',
          'text-start transition-all',
          t.gradient,
          active
            ? `border-transparent ring-2 ${t.ring} shadow-md`
            : 'border-border/60 hover:shadow-md',
          onClick ? 'cursor-pointer hover-lift' : '',
        ].join(' ')}
        aria-pressed={onClick ? !!active : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={`shrink-0 h-11 w-11 rounded-2xl ${t.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}
          >
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className="flex items-center gap-0.5 text-[10px] text-success bg-success/10 px-2 py-1 rounded-lg font-bold tabular-nums tech-content">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
        <div className="mt-3 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl md:text-[1.6rem] font-heading font-bold leading-tight mt-1 tabular-nums tech-content">
            {value}
          </p>
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