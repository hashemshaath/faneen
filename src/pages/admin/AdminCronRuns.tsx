import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Activity, AlertCircle, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import { listCronRunLogs } from '@/modules/system/services/cronRuns';

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
          <Input
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            placeholder={isRTL ? 'تصفية باسم المهمة' : 'Filter by job name'}
            className="h-9 w-56"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''} ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

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