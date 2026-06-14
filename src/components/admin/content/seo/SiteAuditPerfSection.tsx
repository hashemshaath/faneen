import React from 'react';
import {
  Smartphone, Activity, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const fmtMs = (v: number | null | undefined) =>
  v == null ? '—' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`;
const fmtNum = (v: number | null | undefined, d = 2) =>
  v == null ? '—' : Number(v).toFixed(d);

function scoreBadge(score: number | null | undefined) {
  if (score == null) return { label: '—', cls: 'bg-muted text-muted-foreground' };
  if (score >= 90) return { label: String(score), cls: 'bg-success/15 text-success dark:text-success border border-success/30' };
  if (score >= 50) return { label: String(score), cls: 'bg-warning/15 text-warning dark:text-warning border border-warning/30' };
  return { label: String(score), cls: 'bg-destructive/15 text-destructive dark:text-destructive border border-destructive/30' };
}

export interface PerfRunRow {
  id: string;
  url: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  fcp_ms: number | null;
  speed_index_ms: number | null;
  error?: string | null;
  previous?: { performance_score: number | null } | null;
}

export interface PerfTrendPoint { day: string; score: number }

/**
 * SiteAuditPerfSection — PageSpeed latest-per-page list and 30-day trend
 * chart. Pure display; never re-runs the audit and never queries the DB.
 */
export interface SiteAuditPerfSectionProps {
  isLoading: boolean;
  rows: ReadonlyArray<PerfRunRow>;
  trendLoading: boolean;
  trend: ReadonlyArray<PerfTrendPoint>;
  isRTL: boolean;
}

export const SiteAuditPerfSection: React.FC<SiteAuditPerfSectionProps> = ({
  isLoading, rows, trendLoading, trend, isRTL,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
    <Card className="border-border/40 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-accent" />
          {isRTL ? 'PageSpeed (آخر فحص لكل صفحة)' : 'PageSpeed (latest per page)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : rows.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {isRTL ? 'لا توجد فحوصات بعد. اضغط "تشغيل تدقيق الآن".' : 'No runs yet. Click "Run audit now".'}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const perf = scoreBadge(row.performance_score);
              const a11y = scoreBadge(row.accessibility_score);
              const bp = scoreBadge(row.best_practices_score);
              const seo = scoreBadge(row.seo_score);
              const prev = row.previous;
              const delta = prev?.performance_score != null && row.performance_score != null
                ? row.performance_score - prev.performance_score
                : null;
              return (
                <div key={row.id} className="rounded-lg border border-border/40 bg-card/50 p-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <code className="text-[11px] tech-content text-muted-foreground truncate max-w-[260px]" dir="ltr">
                      {row.url.replace('https://qitaat.com', '') || '/'}
                    </code>
                    <div className="flex gap-1">
                      {delta != null && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums flex items-center gap-0.5',
                            delta > 0 ? 'bg-success/15 text-success dark:text-success'
                              : delta < 0 ? 'bg-destructive/15 text-destructive dark:text-destructive'
                                : 'bg-muted text-muted-foreground',
                          )}
                          title={isRTL ? `السابق: ${prev?.performance_score}` : `Previous: ${prev?.performance_score}`}
                        >
                          {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : delta < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', perf.cls)}>P {perf.label}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', a11y.cls)}>A {a11y.label}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', bp.cls)}>BP {bp.label}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', seo.cls)}>S {seo.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-2 text-[10px] tabular-nums">
                    <div><span className="text-muted-foreground">LCP </span><span className="font-medium">{fmtMs(row.lcp_ms)}</span></div>
                    <div><span className="text-muted-foreground">CLS </span><span className="font-medium">{fmtNum(row.cls, 3)}</span></div>
                    <div><span className="text-muted-foreground">TBT </span><span className="font-medium">{fmtMs(row.tbt_ms)}</span></div>
                    <div><span className="text-muted-foreground">FCP </span><span className="font-medium">{fmtMs(row.fcp_ms)}</span></div>
                    <div><span className="text-muted-foreground">SI </span><span className="font-medium">{fmtMs(row.speed_index_ms)}</span></div>
                  </div>
                  {row.error && (
                    <p className="text-[10px] text-destructive mt-1">⚠ {row.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          {isRTL ? 'متوسط الأداء (30 يوم)' : 'Performance trend (30d)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trendLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : trend.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            {isRTL ? 'لا توجد بيانات تاريخية بعد.' : 'No historical data yet.'}
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...trend]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

export default SiteAuditPerfSection;