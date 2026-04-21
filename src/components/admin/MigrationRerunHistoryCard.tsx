import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { History, RefreshCw, Users, CheckCircle2, AlertCircle, User as UserIcon, Clock } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RerunHistoryRow {
  rerun_at: string;
  triggered_by: string | null;
  triggered_by_name: string | null;
  triggered_by_email: string | null;
  new_epoch: number | null;
  reason: string | null;
  cooldown_minutes: number | null;
  window_until: string | null;
  total_events: number;
  success_events: number;
  failed_events: number;
  unique_users: number;
}

const ROW_LIMIT = 20;

export function MigrationRerunHistoryCard() {
  const { isRTL } = useLanguage();
  const locale = isRTL ? ar : enUS;

  const {
    data: rows,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['migration-rerun-history', ROW_LIMIT],
    queryFn: async () => {
      // RPC is not in generated types yet; cast loosely.
      const { data, error } = await (supabase.rpc as any)('get_migration_rerun_history', {
        _limit: ROW_LIMIT,
      });
      if (error) throw error;
      return (data ?? []) as RerunHistoryRow[];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'} className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-primary" />
              {isRTL ? 'سجل عمليات إعادة بثّ الترحيل' : 'Migration re-run history'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isRTL
                ? 'كل عملية بثّ تظهر مع عدد الأجهزة التي أعادت تنفيذ الترحيل خلال نافذتها (حتى البثّ التالي).'
                : 'Each broadcast shows how many devices re-ran the migration during its window (until the next broadcast).'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-3.5 w-3.5 me-1.5', isFetching && 'animate-spin')} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {isRTL ? 'تعذّر تحميل السجل: ' : 'Failed to load history: '}
            {(error as Error).message}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {isRTL
              ? 'لا توجد عمليات إعادة بثّ مسجّلة حتى الآن.'
              : 'No re-run broadcasts have been recorded yet.'}
          </div>
        ) : (
          <ol className="relative space-y-3 ps-4 before:absolute before:inset-y-1 before:start-1.5 before:w-px before:bg-border">
            {rows.map((row, idx) => {
              const ts = new Date(row.rerun_at);
              const isLatest = idx === 0;
              const successRate = row.total_events > 0
                ? Math.round((row.success_events / row.total_events) * 1000) / 10
                : 0;
              const triggeredByLabel =
                row.triggered_by_name?.trim() ||
                row.triggered_by_email?.trim() ||
                (row.triggered_by ? row.triggered_by.slice(0, 8) : (isRTL ? 'غير معروف' : 'unknown'));

              return (
                <li
                  key={`${row.rerun_at}-${row.new_epoch ?? idx}`}
                  className="relative rounded-lg border bg-background p-3"
                >
                  <span
                    className={cn(
                      'absolute -start-[6px] top-4 h-3 w-3 rounded-full border-2 border-background',
                      isLatest ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isLatest ? 'default' : 'secondary'} className="font-mono">
                      #{row.new_epoch ?? '?'}
                    </Badge>
                    {isLatest && (
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {isRTL ? 'النشط الآن' : 'Active now'}
                      </Badge>
                    )}
                    <span
                      className="ms-auto text-xs text-muted-foreground tabular-nums"
                      dir="ltr"
                      title={ts.toISOString()}
                    >
                      {format(ts, 'yyyy-MM-dd HH:mm')} ·{' '}
                      {formatDistanceToNow(ts, { addSuffix: true, locale })}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <Metric
                      icon={<Users className="h-3.5 w-3.5" />}
                      label={isRTL ? 'أجهزة فريدة' : 'Unique devices'}
                      value={row.unique_users.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                      tone="primary"
                    />
                    <Metric
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      label={isRTL ? 'إجمالي الأحداث' : 'Total events'}
                      value={row.total_events.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                    />
                    <Metric
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      label={isRTL ? 'ناجحة' : 'Succeeded'}
                      value={`${row.success_events.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}${
                        row.total_events > 0 ? ` (${successRate}%)` : ''
                      }`}
                      tone="success"
                    />
                    <Metric
                      icon={<AlertCircle className="h-3.5 w-3.5" />}
                      label={isRTL ? 'فاشلة' : 'Failed'}
                      value={row.failed_events.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                      tone={row.failed_events > 0 ? 'danger' : undefined}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {isRTL ? 'بواسطة: ' : 'By: '}
                      <span className="font-medium text-foreground">{triggeredByLabel}</span>
                    </span>
                    {row.cooldown_minutes != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isRTL ? `تهدئة ${row.cooldown_minutes}د` : `${row.cooldown_minutes}m cooldown`}
                      </span>
                    )}
                    {row.window_until && (
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        {isRTL ? 'النافذة حتى: ' : 'Window until: '}
                        {format(new Date(row.window_until), 'yyyy-MM-dd HH:mm')}
                      </span>
                    )}
                    {!row.window_until && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        {isRTL ? 'النافذة مفتوحة (حتى الآن)' : 'Window open (until now)'}
                      </span>
                    )}
                  </div>

                  {row.reason && (
                    <div className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs italic text-muted-foreground">
                      {isRTL ? 'السبب: ' : 'Reason: '}“{row.reason}”
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'danger'
        ? 'text-destructive'
        : tone === 'primary'
          ? 'text-primary'
          : 'text-foreground';
  return (
    <div className="rounded-md border bg-card px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-0.5 text-sm font-semibold tabular-nums', toneClass)}>{value}</div>
    </div>
  );
}
