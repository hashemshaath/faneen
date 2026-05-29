import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TechnicalText } from '@/components/ui/technical-text';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Loader2, RefreshCw, Activity, AlertCircle, CheckCircle2, XCircle,
  CalendarClock, Search, Timer, Gauge, ListChecks, ChevronDown, Zap, Database,
  Download, Printer, Radio, BarChart3,
} from 'lucide-react';
import {
  listCronRunLogs,
  getCronRunHealth,
  type CronRunHealthRow,
} from '@/modules/system/services/cronRuns';
import { buildCsv, downloadCsv, printCurrentView, tsStamp } from '@/lib/admin/exportUtils';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';
import { BarChart, Bar, XAxis, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';

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

function formatRelative(iso: string | null, isRTL: boolean): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return iso;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return isRTL ? `قبل ${sec} ث` : `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return isRTL ? `قبل ${min} د` : `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return isRTL ? `قبل ${hr} س` : `${hr}h ago`;
  const day = Math.round(hr / 24);
  return isRTL ? `قبل ${day} ي` : `${day}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

type SortKey = 'job' | 'rate' | 'total' | 'failed' | 'avg' | 'last';

const AdminCronRuns = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'سجل تشغيل المهام المجدولة' : 'Cron Run Log' });
  useNoIndex();

  const [jobFilter, setJobFilter] = useState('');
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [sortKey, setSortKey] = useState<SortKey>('last');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'fail'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [live, setLive] = useState(false);

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

  const sortedHealth = useMemo(() => {
    const arr = [...healthRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const v = (() => {
        switch (sortKey) {
          case 'job': return a.job_name.localeCompare(b.job_name);
          case 'rate': return Number(a.success_rate ?? 0) - Number(b.success_rate ?? 0);
          case 'total': return Number(a.total_runs ?? 0) - Number(b.total_runs ?? 0);
          case 'failed': return Number(a.failed_runs ?? 0) - Number(b.failed_runs ?? 0);
          case 'avg': return Number(a.avg_duration_ms ?? 0) - Number(b.avg_duration_ms ?? 0);
          case 'last': {
            const ta = a.last_run_at ? new Date(a.last_run_at).getTime() : 0;
            const tb = b.last_run_at ? new Date(b.last_run_at).getTime() : 0;
            return ta - tb;
          }
        }
      })();
      return v * dir;
    });
    return arr;
  }, [healthRows, sortKey, sortDir]);

  const filteredRuns = useMemo(() => {
    if (statusFilter === 'all') return rows;
    if (statusFilter === 'ok') return rows.filter(r => r.ok === true);
    return rows.filter(r => r.ok === false);
  }, [rows, statusFilter]);

  // ── Realtime: auto-refresh runs + health when new cron rows arrive.
  useRealtimeInvalidate({
    channel: 'admin-cron-runs',
    table: 'cron_run_logs',
    queryKeys: [
      ['admin-cron-runs', jobFilter],
      ['admin-cron-health', windowDays],
    ],
    enabled: live,
  });

  // ── Hourly distribution chart (last 24h, bucketed).
  const hourly = useMemo(() => {
    const buckets: Array<{ hour: string; ok: number; failed: number; total: number }> = [];
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now - i * 60 * 60 * 1000);
      buckets.push({
        hour: `${String(t.getHours()).padStart(2, '0')}:00`,
        ok: 0, failed: 0, total: 0,
      });
    }
    for (const r of rows) {
      const ts = new Date(r.started_at).getTime();
      const hoursAgo = Math.floor((now - ts) / (60 * 60 * 1000));
      if (hoursAgo < 0 || hoursAgo > 23) continue;
      const slot = buckets[23 - hoursAgo];
      if (!slot) continue;
      slot.total += 1;
      if (r.ok === true) slot.ok += 1;
      else if (r.ok === false) slot.failed += 1;
    }
    return buckets;
  }, [rows]);

  // ── Export helpers
  function exportHealthCsv() {
    const headers = ['Job', 'Function', 'Success rate %', 'Total runs', 'OK', 'Failed', 'Avg duration (ms)', 'Last run', 'Last failed'];
    const data = sortedHealth.map((r) => [
      r.job_name,
      r.function_name,
      Number(r.success_rate ?? 0).toFixed(1),
      Number(r.total_runs ?? 0),
      Number(r.ok_runs ?? 0),
      Number(r.failed_runs ?? 0),
      r.avg_duration_ms != null ? Number(r.avg_duration_ms).toFixed(0) : '',
      r.last_run_at ?? '',
      r.last_failed_at ?? '',
    ]);
    downloadCsv(`cron-health-${windowDays}d-${tsStamp()}`, buildCsv(headers, data));
  }

  function exportRunsCsv() {
    const headers = ['Job', 'Function', 'Status', 'OK', 'Started at', 'Finished at', 'Duration (ms)', 'Error code', 'Error message'];
    const data = filteredRuns.map((r) => [
      r.job_name,
      r.function_name,
      r.status ?? '',
      r.ok == null ? '' : r.ok ? 'true' : 'false',
      r.started_at,
      r.finished_at ?? '',
      r.duration_ms ?? '',
      r.error_code ?? '',
      r.error_message ?? '',
    ]);
    downloadCsv(`cron-runs-${tsStamp()}`, buildCsv(headers, data));
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'job' ? 'asc' : 'desc'); }
  }

  const sortIcon = (k: SortKey) =>
    sortKey === k ? (
      <ChevronDown
        className={`ic-xs inline-block ms-1 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
      />
    ) : null;

  return (
    <DashboardLayout>
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/95 via-primary to-primary-hover">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,_white_1px,_transparent_1px)] [background-size:24px_24px]" />
        <div className="container mx-auto px-4 py-8 sm:py-10 max-w-7xl relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {isRTL ? 'سجل تشغيل المهام المجدولة' : 'Scheduled Jobs Run Log'}
                </h1>
                <p className="mt-1.5 text-sm text-white/80 max-w-2xl leading-relaxed">
                  {isRTL
                    ? 'مراقبة لحظية لصحة وأداء مهام النظام المجدولة (Cron) — معدّل النجاح، أزمنة التنفيذ، والأخطاء.'
                    : 'Real-time monitoring for scheduled system jobs — success rate, execution times, and errors.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <div className="inline-flex items-center rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/20 p-1">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWindowDays(d as 7 | 30 | 90)}
                    className={`px-3 h-8 text-xs font-medium rounded-lg transition-colors ${
                      windowDays === d
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-white/85 hover:bg-white/10'
                    }`}
                  >
                    {d}{isRTL ? ' يوم' : 'd'}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/25 hover:bg-white/20 hover:text-white backdrop-blur"
                onClick={() => setLive(v => !v)}
                title={isRTL ? 'تحديث لحظي' : 'Live updates'}
              >
                <Radio className={`h-4 w-4 me-2 ${live ? 'text-success animate-pulse' : ''}`} />
                {live ? (isRTL ? 'مباشر' : 'Live') : (isRTL ? 'متوقف' : 'Paused')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/25 hover:bg-white/20 hover:text-white backdrop-blur"
                onClick={exportHealthCsv}
                disabled={healthRows.length === 0}
                title={isRTL ? 'تصدير صحة المهام CSV' : 'Export health CSV'}
              >
                <Download className="h-4 w-4 me-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/25 hover:bg-white/20 hover:text-white backdrop-blur"
                onClick={printCurrentView}
                title={isRTL ? 'طباعة' : 'Print'}
              >
                <Printer className="h-4 w-4 me-2" />
                {isRTL ? 'طباعة' : 'Print'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/25 hover:bg-white/20 hover:text-white backdrop-blur"
                onClick={() => { refetch(); healthQuery.refetch(); }}
                disabled={isFetching || healthQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching || healthQuery.isFetching ? 'animate-spin' : ''} me-2`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={<Gauge className="h-4 w-4" />}
            label={isRTL ? 'معدّل النجاح' : 'Success rate'}
            value={healthQuery.isLoading ? null : `${health.successRate}%`}
            tone={hasIssues ? (health.successRate < 90 ? 'danger' : 'warning') : 'success'}
            sub={isRTL ? `آخر ${windowDays} يوم` : `Last ${windowDays} days`}
          />
          <KpiCard
            icon={<ListChecks className="h-4 w-4" />}
            label={isRTL ? 'إجمالي التشغيلات' : 'Total runs'}
            value={healthQuery.isLoading ? null : String(health.total)}
            tone="neutral"
            sub={`${health.succeeded} ${isRTL ? 'ناجحة' : 'OK'}`}
          />
          <KpiCard
            icon={<XCircle className="h-4 w-4" />}
            label={isRTL ? 'الإخفاقات' : 'Failures'}
            value={healthQuery.isLoading ? null : String(health.failed)}
            tone={health.failed > 0 ? 'danger' : 'success'}
            sub={health.latestFailedJob ? truncate(health.latestFailedJob, 24) : (isRTL ? 'لا أخطاء' : 'No errors')}
          />
          <KpiCard
            icon={<Timer className="h-4 w-4" />}
            label={isRTL ? 'آخر تشغيل' : 'Last run'}
            value={healthQuery.isLoading ? null : formatRelative(health.lastRun, isRTL)}
            tone="info"
            sub={`${health.jobsObserved} ${isRTL ? 'مهام مرصودة' : 'jobs tracked'}`}
          />
        </div>

        {/* Hourly distribution (24h) */}
        <Card className="overflow-hidden print:hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {isRTL ? 'توزيع التشغيلات — آخر 24 ساعة' : 'Run distribution — last 24h'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {hourly.map((b, i) => (
                      <Cell
                        key={i}
                        fill={
                          b.failed > 0
                            ? 'hsl(var(--destructive))'
                            : b.total > 0
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--muted))'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job health */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                {isRTL
                  ? 'صحة المهام المجدولة — صحة المهام حسب الوظيفة'
                  : 'Cron Health — Job health breakdown'}
              </CardTitle>
              <Badge variant="outline" className="text-[11px]">
                {healthRows.length} {isRTL ? 'مهمة' : 'jobs'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {healthQuery.isError ? (
              <EmptyError
                isRTL={isRTL}
                onRetry={() => healthQuery.refetch()}
                message={isRTL ? 'تعذر تحميل صحة المهام.' : 'Failed to load job health.'}
              />
            ) : healthQuery.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : healthRows.length === 0 ? (
              <EmptyState
                isRTL={isRTL}
                message={isRTL
                  ? 'لا توجد بيانات كافية للفترة المحددة.'
                  : 'Not enough data for the selected period.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <SortableHead label={isRTL ? 'المهمة' : 'Job'} k="job" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label={isRTL ? 'النجاح' : 'Success'} k="rate" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label={isRTL ? 'إجمالي' : 'Total'} k="total" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label={isRTL ? 'فشل' : 'Failed'} k="failed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label={isRTL ? 'متوسط المدة' : 'Avg duration'} k="avg" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label={isRTL ? 'آخر تشغيل' : 'Last run'} k="last" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHealth.map((r) => {
                      const rate = Number(r.success_rate ?? 0);
                      const failed = Number(r.failed_runs ?? 0);
                      const barTone = failed > 0 && rate < 90 ? 'bg-destructive' : failed > 0 ? 'bg-warning' : 'bg-success';
                      return (
                        <TableRow
                          key={r.job_name}
                          className="cursor-pointer"
                          onClick={() => setJobFilter(r.job_name)}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Zap className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <TechnicalText className="text-xs font-semibold text-foreground block truncate max-w-[220px]">
                                  {r.job_name}
                                </TechnicalText>
                                <TechnicalText className="text-[10px] text-muted-foreground block truncate max-w-[220px]">
                                  {r.function_name}
                                </TechnicalText>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                                <div
                                  className={`h-full ${barTone} transition-all`}
                                  style={{ width: `${Math.max(2, Math.min(100, rate))}%` }}
                                />
                              </div>
                              <Badge variant="outline" className={`${successBadgeClass(rate, failed)} text-[10px]`}>
                                {Math.round(rate)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs tabular-nums font-medium">{Number(r.total_runs)}</TableCell>
                          <TableCell className="text-xs tabular-nums">
                            <span className={failed > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                              {failed}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs tabular-nums text-muted-foreground">
                            {formatDuration(r.avg_duration_ms != null ? Number(r.avg_duration_ms) : null)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatRelative(r.last_run_at, isRTL)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Runs timeline */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                {isRTL ? 'سجل التشغيلات الأخيرة' : 'Recent runs'}
                <Badge variant="outline" className="text-[11px] ms-1">
                  {filteredRuns.length}/{rows.length}
                </Badge>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    placeholder={isRTL ? 'بحث باسم المهمة...' : 'Search job name...'}
                    className="h-9 w-56 ps-8 text-xs"
                  />
                </div>
                <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
                  {(['all', 'ok', 'fail'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 h-7 text-[11px] font-medium rounded-md transition-colors ${
                        statusFilter === s
                          ? s === 'ok' ? 'bg-success/15 text-success'
                            : s === 'fail' ? 'bg-destructive/15 text-destructive'
                            : 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {s === 'all' ? (isRTL ? 'الكل' : 'All')
                        : s === 'ok' ? (isRTL ? 'ناجحة' : 'OK')
                        : (isRTL ? 'فاشلة' : 'Failed')}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={exportRunsCsv}
                  disabled={filteredRuns.length === 0}
                >
                  <Download className="h-3.5 w-3.5 me-1" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : isError ? (
              <EmptyError
                isRTL={isRTL}
                onRetry={() => refetch()}
                message={isRTL ? 'تعذر تحميل السجلات.' : 'Failed to load logs.'}
              />
            ) : filteredRuns.length === 0 ? (
              <EmptyState
                isRTL={isRTL}
                message={
                  rows.length === 0
                    ? (isRTL ? 'لا توجد تشغيلات مسجلة بعد.' : 'No cron runs recorded yet.')
                    : (isRTL ? 'لا توجد نتائج مطابقة.' : 'No matching runs.')
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {filteredRuns.map((r) => {
                  const isOpen = expanded === r.id;
                  const okTone = r.ok === true ? 'success' : r.ok === false ? 'danger' : 'neutral';
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="w-full text-start px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
                      >
                        <span
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            okTone === 'success' ? 'bg-success/15 text-success'
                            : okTone === 'danger' ? 'bg-destructive/15 text-destructive'
                            : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {okTone === 'success' ? <CheckCircle2 className="h-4 w-4" />
                            : okTone === 'danger' ? <XCircle className="h-4 w-4" />
                            : <Loader2 className="h-4 w-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <TechnicalText className="text-xs font-semibold text-foreground">
                              {r.job_name}
                            </TechnicalText>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <TechnicalText className="text-[11px] text-muted-foreground">
                              {r.function_name}
                            </TechnicalText>
                            {r.status && (
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                {r.status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {formatRelative(r.started_at, isRTL)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {formatDuration(r.duration_ms)}
                            </span>
                            {r.error_code && (
                              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                <AlertCircle className="h-3 w-3" />
                                {r.error_code}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/40">
                          <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
                            <DetailRow label={isRTL ? 'بدأ في' : 'Started at'} value={formatDate(r.started_at, isRTL)} />
                            <DetailRow label={isRTL ? 'انتهى في' : 'Finished at'} value={r.finished_at ? formatDate(r.finished_at, isRTL) : '—'} />
                            <DetailRow label={isRTL ? 'المدة' : 'Duration'} value={formatDuration(r.duration_ms)} />
                            <DetailRow label={isRTL ? 'الحالة' : 'Status'} value={r.status ?? '—'} />
                          </div>
                          {r.summary && typeof r.summary === 'object' && Object.keys(r.summary).length > 0 && (
                            <div className="mt-3">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">
                                {isRTL ? 'الملخص' : 'Summary'}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(r.summary).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                                  >
                                    <span className="text-muted-foreground">{k}:</span>
                                    <TechnicalText className="font-semibold text-foreground">
                                      {typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v)}
                                    </TechnicalText>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.error_message && (
                            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-[11px] font-semibold text-destructive">
                                  {r.error_code ?? (isRTL ? 'خطأ' : 'Error')}
                                </span>
                              </div>
                              <TechnicalText as="p" mono={false} className="text-[11px] text-destructive/90 leading-relaxed">
                                {truncate(r.error_message, 600)}
                              </TechnicalText>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
};

/* ---------- helper components ---------- */

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';
const toneClasses: Record<Tone, { icon: string; ring: string }> = {
  success: { icon: 'bg-success/15 text-success', ring: 'ring-success/20' },
  danger:  { icon: 'bg-destructive/15 text-destructive', ring: 'ring-destructive/20' },
  warning: { icon: 'bg-warning/15 text-warning', ring: 'ring-warning/20' },
  info:    { icon: 'bg-primary/10 text-primary', ring: 'ring-primary/20' },
  neutral: { icon: 'bg-muted text-muted-foreground', ring: 'ring-border' },
};

const KpiCard = ({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string | null; sub?: string; tone: Tone }) => (
  <Card className={`relative overflow-hidden ring-1 ${toneClasses[tone].ring}`}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground truncate">
            {value == null ? <Skeleton className="h-7 w-20" /> : value}
          </div>
          {sub && <div className="mt-1 text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[tone].icon}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const SortableHead = ({
  label, k, sortKey, sortDir, onSort,
}: { label: string; k: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (k: SortKey) => void }) => (
  <TableHead>
    <button
      type="button"
      onClick={() => onSort(k)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${sortKey === k ? 'text-foreground font-semibold' : ''}`}
    >
      {label}
      <ChevronDown
        className={`h-3 w-3 transition-transform ${sortKey === k ? 'opacity-100' : 'opacity-30'} ${sortKey === k && sortDir === 'asc' ? 'rotate-180' : ''}`}
      />
    </button>
  </TableHead>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-2 rounded-md bg-background border border-border/60 px-2.5 py-1.5">
    <span className="text-muted-foreground">{label}</span>
    <TechnicalText className="font-semibold text-foreground text-[11px] truncate max-w-[60%]">{value}</TechnicalText>
  </div>
);

const EmptyState = ({ isRTL, message }: { isRTL: boolean; message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
      <CalendarClock className="h-5 w-5 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground">
      {message ?? (isRTL ? 'لا توجد بيانات للفترة المحددة.' : 'No data for the selected period.')}
    </p>
  </div>
);

const EmptyError = ({
  isRTL,
  onRetry,
  message,
}: {
  isRTL: boolean;
  onRetry: () => void;
  message?: string;
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
    <div className="h-12 w-12 rounded-2xl bg-destructive/15 flex items-center justify-center">
      <AlertCircle className="h-5 w-5 text-destructive" />
    </div>
    <p className="text-sm text-destructive">
      {message ?? (isRTL ? 'تعذر تحميل البيانات.' : 'Failed to load data.')}
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      {isRTL ? 'إعادة المحاولة' : 'Retry'}
    </Button>
  </div>
);

export default AdminCronRuns;