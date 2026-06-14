import React from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const fmtMs = (v: number | null | undefined) =>
  v == null ? '—' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`;

export interface WebVitalSummaryRow {
  metric_name: string;
  p75: number | string | null;
  good_pct: number | string | null;
  sample_count: number | null;
}

/**
 * SiteAuditSummarySection — RUM (Real Users) Core Web Vitals KPI grid.
 * Pure presentational; data is loaded by the parent and passed in.
 */
export interface SiteAuditSummarySectionProps {
  isLoading: boolean;
  rows: ReadonlyArray<WebVitalSummaryRow>;
  windowHours: 24 | 72 | 168;
  onWindowChange: (next: 24 | 72 | 168) => void;
  isRTL: boolean;
}

export const SiteAuditSummarySection: React.FC<SiteAuditSummarySectionProps> = ({
  isLoading, rows, windowHours, onWindowChange, isRTL,
}) => (
  <Card className="border-border/40">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          {isRTL ? 'مقاييس Core Web Vitals (زوار حقيقيون)' : 'Core Web Vitals (Real Users)'}
        </CardTitle>
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {([24, 72, 168] as const).map((h) => (
            <button
              key={h}
              onClick={() => onWindowChange(h)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                windowHours === h
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {h === 24 ? (isRTL ? '24س' : '24h') : h === 72 ? (isRTL ? '3أيام' : '3d') : (isRTL ? '7أيام' : '7d')}
            </button>
          ))}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {isRTL
            ? 'لا توجد عينات بعد. سيتم جمع البيانات تلقائياً عند زيارة الموقع المنشور.'
            : 'No samples yet. Data is collected automatically from published-site visitors.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const).map((name) => {
            const row = rows.find((r) => r.metric_name === name);
            const isCls = name === 'CLS';
            const value = row?.p75 != null
              ? (isCls ? Number(row.p75).toFixed(3) : fmtMs(Number(row.p75)))
              : '—';
            return (
              <div key={name} className="rounded-lg border border-border/40 bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{name}</span>
                  {row?.good_pct != null && (
                    <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5', Number(row.good_pct) >= 75 ? 'border-success/30 text-success' : 'border-warning/30 text-warning')}>
                      {Math.round(Number(row.good_pct))}% {isRTL ? 'جيد' : 'good'}
                    </Badge>
                  )}
                </div>
                <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {isRTL ? 'p75 — ' : 'p75 — '}{row?.sample_count ?? 0} {isRTL ? 'عينة' : 'samples'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

export default SiteAuditSummarySection;