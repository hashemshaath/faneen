/**
 * Presentational KPI strip for membership/finance pages.
 * Pure UI — consumes pre-computed values. Does NOT query the DB or call Supabase.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type MembershipStatTone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

export interface MembershipStatItem {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: MembershipStatTone;
  icon?: React.ReactNode;
}

const TONE_VALUE: Record<MembershipStatTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
};

export interface MembershipStatsStripProps {
  items: MembershipStatItem[];
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

const COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

export const MembershipStatsStrip: React.FC<MembershipStatsStripProps> = ({ items, className, columns = 4 }) => {
  return (
    <div className={cn('grid gap-3', COLS[columns], className)}>
      {items.map((item) => (
        <Card key={item.key} className="border-border/60">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
              {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            </div>
            <span className={cn('text-lg font-semibold tech-content', TONE_VALUE[item.tone ?? 'default'])}>
              {item.value}
            </span>
            {item.hint && <span className="text-[10px] text-muted-foreground">{item.hint}</span>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MembershipStatsStrip;