import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Activity, AlertCircle, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import {
  listCronRunLogs,
  getCronRunHealth,
  type CronRunHealthRow,
} from '@/modules/system/services/cronRuns';

interface CronRunRow {
  id: string;
  job_name: string;
  function_name: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  status: string | null;
  summary: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  duration_ms: number | null;
}

function formatDate(iso: string, isRTL: boolean): string {
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

const AdminCronRuns = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'سجل تشغيل المهام المجدولة' : 'Cron Run Log' });
  useNoIndex();

  const [jobFilter, setJobFilter] = useState('');
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);

  const sinceIso = useMemo(
    () => new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString(),
    [windowDays],
  );

  const healthQuery = useQuery({
    queryKey: ['admin-cron-health', windowDays],
    queryFn: async () => {
      const { data, error } = await getCronRunHealth({ sinceIso });
      if (error) throw error;
      return (data ?? []) as CronRunHealthRow[];
    },
    staleTime: 30_000,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-cron-runs', jobFilter],
    queryFn: async () => {
      const { data, error } = await listCronRunLogs({
        limit: 50,
        jobName: jobFilter.trim() || undefined,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CronRunRow[];
    },
    staleTime: 30_000,
  });

  const rows = data ?? [];
  const healthRows = healthQuery.data ?? [];

  // Aggregate totals from the server-side per-job rows.
  const health = useMemo(() => {
    const total = healthRows.reduce((a, r) => a + Number(r.total_runs || 0), 0);
    const succeeded = healthRows.reduce((a, r) => a + Number(r.ok_runs || 0), 0);
    const failed = healthRows.reduce((a, r) => a + Number(r.failed_runs || 0), 0);
    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;
    const sortedByLatest = [...healthRows].sort((a, b) => {
      const ta = a.last_run_at ? new Date(a.last_run_at).getTime() : 0;
      const tb = b.last_run_at ? new Date(b.last_run_at).getTime() : 0;
      return tb - ta;
    });
    const lastRun = sortedByLatest[0]?.last_run_at ?? null;
    const latestFailed = [...healthRows]
      .filter((r) => r.last_failed_at)
      .sort(
        (a, b) =>
          new Date(b.last_failed_at as string).getTime() -
          new Date(a.last_failed_at as string).getTime(),
      )[0];
    return {
      total,
      succeeded,
      failed,
      successRate,
      lastRun,
      latestFailedJob: latestFailed?.job_name ?? null,
      jobsObserved: healthRows.length,
    };
  }, [healthRows]);

  const hasIssues = health.failed > 0;

  function successBadgeClass(rate: number, failedRuns: number): string {
    if (failedRuns > 0 && rate < 90) {
      return 'bg-destructive/10 text-destructive border-destructive/30';
    }
    if (failedRuns > 0) {
      return 'bg-warning/10 text-warning border-warning/30';
    }
    return 'bg-success/10 text-success border-success/30';
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {isRTL ? 'سجل تشغيل المهام المجدولة' : 'Cron Run Log'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWindowDays(d as 7 | 30 | 90)}
                className={`px-2.5 h-9 text-xs ${
                  windowDays === d
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {d}{isRTL ? 'ي' : 'd'}
              </button>
            ))}
          </div>
          <Input
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            placeholder={isRTL ? 'تصفية باسم المهمة' : 'Filter by job name'}
            className="h-9 w-56"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              healthQuery.refetch();
            }}
            disabled={isFetching || healthQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''} me-2`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Card
        className={`mb-4 border ${hasIssues ? 'border-destructive/40 bg-destructive/5' : 'border-success/30 bg-success/5'}`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {isRTL ? 'صحة المهام المجدولة' : 'Cron Health'}
            <span className="text-xs text-muted-foreground font-normal">
              {isRTL ? `(آخر ${windowDays} يوم)` : `(last ${windowDays} days)`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthQuery.isError ? (
            <p className="text-sm text-destructive">
              {isRTL ? 'تعذر تحميل ملخص الصحة.' : 'Failed to load health summary.'}
            </p>
          ) : healthQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
            </div>
          ) : health.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'لا توجد بيانات كافية للفترة المحددة.' : 'Not enough data for the selected period.'}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge
                variant="outline"
                className={
                  hasIssues
                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : 'bg-success/10 text-success border-success/30'
                }
              >
                {health.successRate}% {isRTL ? 'نجاح' : 'success'}
              </Badge>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {health.succeeded} {isRTL ? 'ناجحة' : 'succeeded'}
              </span>
              <span
                className={`inline-flex items-center gap-1 ${hasIssues ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                <XCircle className="h-3.5 w-3.5" />
                {health.failed} {isRTL ? 'فاشلة' : 'failed'}
              </span>
              <span className="text-muted-foreground">
                {isRTL ? 'إجمالي' : 'Total'}: {health.total}
              </span>
              <span className="text-muted-foreground">
                {isRTL ? 'مهام مرصودة' : 'Jobs observed'}: {health.jobsObserved}
              </span>
              {health.lastRun ? (
                <span className="text-muted-foreground">
                  {isRTL ? 'آخر تشغيل' : 'Last run'}: {formatDate(health.lastRun, isRTL)}
                </span>
              ) : null}
              {health.latestFailedJob ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {isRTL ? 'آخر مهمة فاشلة' : 'Latest failed job'}:
                  <span className="font-mono">{health.latestFailedJob}</span>
                </span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isRTL ? 'صحة المهام حسب الوظيفة' : 'Job health'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthQuery.isError ? (
            <p className="text-sm text-destructive">
              {isRTL ? 'تعذر تحميل صحة المهام.' : 'Failed to load job health.'}
            </p>
          ) : healthQuery.isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : healthRows.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">
              {isRTL ? 'لا توجد بيانات كافية للفترة المحددة.' : 'Not enough data for the selected period.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'المهمة' : 'Job'}</TableHead>
                    <TableHead>{isRTL ? 'النجاح' : 'Success'}</TableHead>
                    <TableHead>{isRTL ? 'إجمالي' : 'Total'}</TableHead>
                    <TableHead>{isRTL ? 'فشل' : 'Failed'}</TableHead>
                    <TableHead>{isRTL ? 'متوسط المدة (مللي)' : 'Avg (ms)'}</TableHead>
                    <TableHead>{isRTL ? 'آخر تشغيل' : 'Last run'}</TableHead>
                    <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthRows.map((r) => {
                    const rate = Number(r.success_rate ?? 0);
                    const failed = Number(r.failed_runs ?? 0);
                    return (
                      <TableRow key={r.job_name}>
                        <TableCell className="text-xs font-mono">{r.job_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={successBadgeClass(rate, failed)}
                          >
                            {Math.round(rate)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">{Number(r.total_runs)}</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          <span className={failed > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                            {failed}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {r.avg_duration_ms != null ? Math.round(Number(r.avg_duration_ms)) : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {r.last_run_at ? formatDate(r.last_run_at, isRTL) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.latest_status ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRTL ? 'أحدث 50 تشغيل' : 'Latest 50 runs'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <p className="text-sm">
                {isRTL ? 'تعذر تحميل السجلات.' : 'Failed to load logs.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">
              {isRTL ? 'لا توجد تشغيلات مسجلة بعد.' : 'No cron runs recorded yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'بدأ في' : 'Started at'}</TableHead>
                    <TableHead>{isRTL ? 'المهمة' : 'Job'}</TableHead>
                    <TableHead>{isRTL ? 'الدالة' : 'Function'}</TableHead>
                    <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{isRTL ? 'النتيجة' : 'OK'}</TableHead>
                    <TableHead>{isRTL ? 'المدة (مللي)' : 'Duration (ms)'}</TableHead>
                    <TableHead>{isRTL ? 'الملخص' : 'Summary'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(r.started_at, isRTL)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{r.job_name}</TableCell>
                      <TableCell className="text-xs font-mono">{r.function_name}</TableCell>
                      <TableCell className="text-xs">{r.status ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.ok === true
                              ? 'bg-success/10 text-success border-success/30'
                              : r.ok === false
                                ? 'bg-destructive/10 text-destructive border-destructive/30'
                                : ''
                          }
                        >
                          {r.ok === true ? 'OK' : r.ok === false ? 'FAIL' : '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {r.duration_ms ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {r.summary && typeof r.summary === 'object'
                            ? Object.entries(r.summary).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px]"
                                >
                                  <span className="text-muted-foreground">{k}:</span>
                                  <span className="font-mono">
                                    {typeof v === 'object' ? '…' : String(v)}
                                  </span>
                                </span>
                              ))
                            : null}
                          {r.error_code ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                              {r.error_code}
                            </span>
                          ) : null}
                          {r.error_message ? (
                            <span className="block w-full text-[11px] text-destructive/80">
                              {truncate(r.error_message, 200)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCronRuns;