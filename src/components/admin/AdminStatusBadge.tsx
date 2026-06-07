import React from 'react';

export type AdminStatusTone =
  | 'success' | 'warning' | 'info' | 'destructive' | 'primary' | 'muted' | 'accent';

interface AdminStatusBadgeProps {
  label: string;
  tone?: AdminStatusTone;
  /** Optional small dot before the label (Salla-like). Default true. */
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const TONE: Record<AdminStatusTone, { bg: string; text: string; dot: string }> = {
  success:     { bg: 'bg-success/10',     text: 'text-success',     dot: 'bg-success' },
  warning:     { bg: 'bg-warning/10',     text: 'text-warning',     dot: 'bg-warning' },
  info:        { bg: 'bg-info/10',        text: 'text-info',        dot: 'bg-info' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' },
  primary:     { bg: 'bg-primary/10',     text: 'text-primary',     dot: 'bg-primary' },
  accent:      { bg: 'bg-accent/15',      text: 'text-accent-foreground', dot: 'bg-accent' },
  muted:       { bg: 'bg-muted',          text: 'text-muted-foreground',  dot: 'bg-muted-foreground/60' },
};

/**
 * AdminStatusBadge — unified status chip with optional dot.
 * Use across admin tables/cards to standardize status presentation.
 */
export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
  label, tone = 'muted', dot = true, size = 'sm', className,
}) => {
  const t = TONE[tone];
  const sizeCls = size === 'md'
    ? 'h-7 text-xs px-3'
    : 'h-6 text-[11px] px-2.5';
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        t.bg, t.text, sizeCls, className ?? '',
      ].join(' ')}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />}
      {label}
    </span>
  );
};

export default AdminStatusBadge;