import React from 'react';
import { History, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface SitemapAuditRunRow {
  id: string;
  created_at: string;
  triggered_by: string;
  ok_count: number;
  total_endpoints: number;
  total_urls: number;
  has_failures: boolean;
  has_spa_fallback: boolean;
  error_count: number;
  alert_sent: boolean;
  diff_from_previous?: {
    firstRun?: boolean;
    statusFlips?: Array<{ url: string; from: boolean; to: boolean }>;
    urlCountDeltas?: Array<{ url: string; from: number; to: number; delta: number }>;
    totalUrlsDelta?: number;
  } | null;
  results?: Array<{ url: string; status: number; ok: boolean; urlCount: number; isSpaFallback: boolean }>;
}

/**
 * SitemapAuditHistorySection — presentational view of saved audit runs.
 * Receives rows from the parent (which owns the DB query); never reads or
 * writes audit storage directly.
 */
export interface SitemapAuditHistorySectionProps {
  isLoading: boolean;
  runs: ReadonlyArray<SitemapAuditRunRow>;
  expandedRunId: string | null;
  onToggleRun: (id: string) => void;
  isAr: boolean;
}

export const SitemapAuditHistorySection: React.FC<SitemapAuditHistorySectionProps> = ({
  isLoading, runs, expandedRunId, onToggleRun, isAr,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <History className="h-5 w-5" />
        {isAr ? 'سجل عمليات الفحص' : 'Audit history'}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      {!isLoading && runs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {isAr ? 'لا توجد عمليات فحص محفوظة بعد.' : 'No saved audit runs yet.'}
        </p>
      )}
      {runs.map((run) => {
        const isOpen = expandedRunId === run.id;
        const diff = run.diff_from_previous ?? {};
        return (
          <div key={run.id} className="border rounded-xl">
            <button
              type="button"
              onClick={() => onToggleRun(run.id)}
              className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                {run.has_failures || run.has_spa_fallback
                  ? <XCircle className="h-5 w-5 text-destructive dark:text-destructive shrink-0" />
                  : <CheckCircle2 className="h-5 w-5 text-success dark:text-success shrink-0" />}
                <div className="text-start min-w-0">
                  <div className="text-sm font-semibold tech-content">{new Date(run.created_at).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground tech-content">
                    {run.triggered_by} · {run.ok_count}/{run.total_endpoints} ok · {run.total_urls} urls
                    {typeof diff.totalUrlsDelta === 'number' && diff.totalUrlsDelta !== 0 && (
                      <span className={diff.totalUrlsDelta > 0 ? ' text-success' : ' text-destructive'}> ({diff.totalUrlsDelta > 0 ? '+' : ''}{diff.totalUrlsDelta})</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {run.has_spa_fallback && <Badge variant="destructive">SPA</Badge>}
                {run.error_count > 0 && <Badge variant="destructive" className="tech-content">{run.error_count} err</Badge>}
                {run.alert_sent && <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" />{isAr ? 'تنبيه' : 'alerted'}</Badge>}
              </div>
            </button>
            {isOpen && (
              <div className="border-t p-3 space-y-3 text-sm">
                {diff.firstRun && <div className="text-xs text-muted-foreground">{isAr ? 'هذه أول عملية فحص — لا توجد مقارنة.' : 'First audit — no diff available.'}</div>}
                {(diff.statusFlips?.length ?? 0) > 0 && (
                  <div>
                    <div className="font-semibold text-xs mb-1">{isAr ? 'تغيرات الحالة' : 'Status flips'}</div>
                    <ul className="text-xs space-y-1 tech-content">
                      {diff.statusFlips!.map((f) => (
                        <li key={f.url} className={f.to ? 'text-success' : 'text-destructive'}>
                          {f.url} : {String(f.from)} → {String(f.to)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(diff.urlCountDeltas?.length ?? 0) > 0 && (
                  <div>
                    <div className="font-semibold text-xs mb-1">{isAr ? 'تغيّر عدد الروابط' : 'URL count changes'}</div>
                    <ul className="text-xs space-y-1 tech-content">
                      {diff.urlCountDeltas!.map((d) => (
                        <li key={d.url}>
                          {d.url} : {d.from} → {d.to} <span className={d.delta > 0 ? 'text-success' : 'text-destructive'}>({d.delta > 0 ? '+' : ''}{d.delta})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-xs mb-1">{isAr ? 'النقاط' : 'Endpoints'}</div>
                  <ul className="text-xs space-y-1 tech-content">
                    {(run.results ?? []).map((r) => (
                      <li key={r.url} className={r.ok ? '' : 'text-destructive'}>
                        [{r.status || 'ERR'}] {r.url} — {r.urlCount} urls{r.isSpaFallback ? ' · SPA!' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </CardContent>
  </Card>
);

export default SitemapAuditHistorySection;