import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface AdminFilterPill {
  key: string;
  label: string;
  count?: number;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'destructive';
}

interface AdminFiltersBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  pills?: AdminFilterPill[];
  activePill?: string;
  onPillSelect?: (key: string) => void;
  rightSlot?: React.ReactNode;
  onClear?: () => void;
  canClear?: boolean;
  clearLabel?: string;
}

const TONE: Record<NonNullable<AdminFilterPill['tone']>, { active: string; idle: string }> = {
  default:     { active: 'bg-foreground text-background',       idle: 'bg-muted/60 text-foreground hover:bg-muted' },
  primary:     { active: 'bg-primary text-primary-foreground',  idle: 'bg-primary/10 text-primary hover:bg-primary/15' },
  success:     { active: 'bg-success text-success-foreground',  idle: 'bg-success/10 text-success hover:bg-success/15' },
  warning:     { active: 'bg-warning text-warning-foreground',  idle: 'bg-warning/10 text-warning hover:bg-warning/15' },
  info:        { active: 'bg-info text-info-foreground',        idle: 'bg-info/10 text-info hover:bg-info/15' },
  destructive: { active: 'bg-destructive text-destructive-foreground', idle: 'bg-destructive/10 text-destructive hover:bg-destructive/15' },
};

/**
 * AdminFiltersBar — unified search + status pills row for admin pages.
 * Additive primitive; pages can opt in without breaking existing markup.
 */
export const AdminFiltersBar: React.FC<AdminFiltersBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  pills,
  activePill,
  onPillSelect,
  rightSlot,
  onClear,
  canClear,
  clearLabel = 'مسح',
}) => {
  const showSearch = typeof onSearchChange === 'function';
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-sm p-3 md:p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {showSearch && (
          <div className="relative flex-1 min-w-0 max-w-xl">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 ps-9 pe-3 rounded-xl bg-background/60"
              dir="auto"
            />
          </div>
        )}
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
      {(pills && pills.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pills.map((p) => {
            const tone = TONE[p.tone ?? 'default'];
            const isActive = activePill === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPillSelect?.(p.key)}
                aria-pressed={isActive}
                className={[
                  'inline-flex items-center gap-2 h-9 px-3 rounded-full text-xs font-semibold transition-all',
                  isActive ? tone.active + ' shadow-sm' : tone.idle,
                ].join(' ')}
              >
                <span>{p.label}</span>
                {typeof p.count === 'number' && (
                  <span className={[
                    'min-w-[1.25rem] h-5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums tech-content',
                    isActive ? 'bg-background/20 text-current' : 'bg-background/80 text-foreground/80',
                  ].join(' ')}>{p.count}</span>
                )}
              </button>
            );
          })}
          {canClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-9 rounded-full text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 me-1" />
              {clearLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFiltersBar;