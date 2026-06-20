import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type ChipTone = 'primary' | 'success' | 'warning' | 'destructive' | 'accent' | 'muted' | 'info';

const TONE: Record<ChipTone, { idle: string; active: string }> = {
  primary: {
    idle:   'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15',
    active: 'bg-primary text-primary-foreground border-primary shadow-sm',
  },
  success: {
    idle:   'bg-success/10 text-success-foreground border-success/30 hover:bg-success/15',
    active: 'bg-success text-success-foreground border-success shadow-sm',
  },
  warning: {
    idle:   'bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/15',
    active: 'bg-warning text-warning-foreground border-warning shadow-sm',
  },
  destructive: {
    idle:   'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15',
    active: 'bg-destructive text-destructive-foreground border-destructive shadow-sm',
  },
  accent: {
    idle:   'bg-accent/15 text-accent-foreground border-accent/30 hover:bg-accent/25',
    active: 'bg-accent text-accent-foreground border-accent shadow-sm',
  },
  info: {
    idle:   'bg-info/10 text-info-foreground border-info/30 hover:bg-info/15',
    active: 'bg-info text-info-foreground border-info shadow-sm',
  },
  muted: {
    idle:   'bg-muted/40 text-foreground border-border hover:bg-muted/60',
    active: 'bg-foreground text-background border-foreground shadow-sm',
  },
};

interface ControlChipProps {
  label: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
  tone?: ChipTone;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}

/**
 * Unified pill badge for the businesses control center.
 * Used by QuickActions, CommandBar, Providers segments — keeps the
 * shape, height, radius and tone language consistent across tabs.
 */
export const ControlChip: React.FC<ControlChipProps> = ({
  label, icon: Icon, count, tone = 'muted', active = false, onClick, testId,
}) => {
  const cls = active ? TONE[tone].active : TONE[tone].idle;
  const Cmp: 'button' | 'span' = onClick ? 'button' : 'span';
  return (
    <Cmp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-all ${cls} ${onClick ? 'cursor-pointer active:scale-[0.97]' : ''}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{label}</span>
      {typeof count === 'number' ? (
        <span className="tabular-nums text-[11px] opacity-80 ms-1">· {count}</span>
      ) : null}
    </Cmp>
  );
};

export default ControlChip;