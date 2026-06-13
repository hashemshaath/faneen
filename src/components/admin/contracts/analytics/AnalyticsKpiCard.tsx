/**
 * Small KPI tile used across analytics sections.
 *
 * Pure UI — no Supabase, no queries. Visuals copied verbatim from the
 * inline `KpiCard` previously defined inside
 * `src/pages/admin/AdminContractAnalytics.tsx` to avoid any visual drift
 * during Phase 8E extraction.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type AnalyticsKpiTone = 'default' | 'success' | 'warning' | 'info' | 'destructive';

const TONE: Record<AnalyticsKpiTone, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-sky-600 dark:text-sky-400',
  destructive: 'text-destructive',
};

export interface AnalyticsKpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: AnalyticsKpiTone;
}

export const AnalyticsKpiCard: React.FC<AnalyticsKpiCardProps> = ({
  label,
  value,
  icon: Icon,
  tone = 'default',
}) => {
  const toneClass = TONE[tone];
  return (
    <Card className="rounded-xl hover-lift">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">{label}</div>
            <div className={cn('text-2xl font-semibold mt-1 tech-content', toneClass)}>{value}</div>
          </div>
          <Icon className={cn('h-5 w-5 shrink-0 opacity-70', toneClass)} aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsKpiCard;