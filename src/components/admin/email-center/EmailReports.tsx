import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  dedupeByMessageId, recipientDomainBucket, classifyError,
  DLQ_RECOMMENDATIONS, type EmailLogRow,
} from '@/lib/email-center/email-log-utils';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Bar { label: string; value: number; tone?: string }

const BarList: React.FC<{ items: Bar[]; max?: number }> = ({ items, max }) => {
  const top = max ? items.slice(0, max) : items;
  const peak = Math.max(1, ...top.map((i) => i.value));
  return (
    <div className="space-y-1.5">
      {top.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
      {top.map((i) => (
        <div key={i.label} className="text-xs">
          <div className="flex justify-between mb-0.5"><span className="truncate me-2">{i.label}</span><span className="tech-content text-muted-foreground">{i.value}</span></div>
          <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div className={`h-full ${i.tone ?? 'bg-primary'}`} style={{ width: `${(i.value / peak) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EmailReports: React.FC = () => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['email-center-reports'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data: rows } = await supabase
        .from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      return dedupeByMessageId((rows ?? []) as EmailLogRow[]);
    },
    staleTime: 60_000,
  });

  const reports = useMemo(() => {
    const rows = data ?? [];
    const sentByTpl = new Map<string, number>();
    const totalByTpl = new Map<string, number>();
    const failByTpl = new Map<string, number>();
    const byDay = new Map<string, number>();
    const byDomain = new Map<string, number>();
    const dlqByReason = new Map<string, number>();
    const errorByKind = new Map<string, number>();
    let auth = 0, app = 0;
    let pendingCount = 0;
    let oldestPendingMs = 0;
    const now = Date.now();
    let totalDelayMs = 0;
    let delaySamples = 0;

    for (const r of rows) {
      const tpl = r.template_name ?? 'unknown';
      totalByTpl.set(tpl, (totalByTpl.get(tpl) ?? 0) + 1);
      if (['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'reauthentication'].includes(tpl)) auth++; else app++;
      if (r.status === 'sent') {
        sentByTpl.set(tpl, (sentByTpl.get(tpl) ?? 0) + 1);
        const day = format(new Date(r.created_at), 'MM-dd');
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
        const bucket = recipientDomainBucket(r.recipient_email);
        byDomain.set(bucket, (byDomain.get(bucket) ?? 0) + 1);
        // Crude queue-delay proxy from metadata.enqueued_at if present.
        const meta = r.metadata as Record<string, unknown> | null;
        const enq = meta?.enqueued_at ?? meta?.enqueuedAt;
        if (typeof enq === 'string') {
          const dt = new Date(r.created_at).getTime() - new Date(enq).getTime();
          if (Number.isFinite(dt) && dt >= 0 && dt < 3600_000) {
            totalDelayMs += dt;
            delaySamples++;
          }
        }
      } else if (r.status === 'failed' || r.status === 'dlq') {
        failByTpl.set(tpl, (failByTpl.get(tpl) ?? 0) + 1);
        const k = classifyError(r.error_message);
        errorByKind.set(k, (errorByKind.get(k) ?? 0) + 1);
        if (r.status === 'dlq') {
          dlqByReason.set(k, (dlqByReason.get(k) ?? 0) + 1);
        }
      } else if (r.status === 'pending') {
        pendingCount++;
        const age = now - new Date(r.created_at).getTime();
        if (age > oldestPendingMs) oldestPendingMs = age;
      }
    }

    const sentBars: Bar[] = [...sentByTpl.entries()].map(([l, v]) => ({ label: l, value: v, tone: 'bg-success' })).sort((a, b) => b.value - a.value);
    const failureRate: Bar[] = [...totalByTpl.entries()]
      .map(([l, v]) => ({ label: l, value: Math.round(((failByTpl.get(l) ?? 0) / Math.max(1, v)) * 100), tone: 'bg-destructive' }))
      .filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
    const dayBars: Bar[] = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([l, v]) => ({ label: l, value: v, tone: 'bg-info' }));
    const dlqBars: Bar[] = [...dlqByReason.entries()].map(([l, v]) => ({ label: l, value: v, tone: 'bg-destructive' })).sort((a, b) => b.value - a.value);
    const domainBars: Bar[] = [...byDomain.entries()].map(([l, v]) => ({ label: l, value: v, tone: 'bg-primary' })).sort((a, b) => b.value - a.value);
    const errorInsights = [...errorByKind.entries()]
      .map(([k, v]) => ({ kind: k, count: v }))
      .sort((a, b) => b.count - a.count);
    const avgDelaySec = delaySamples > 0 ? Math.round(totalDelayMs / delaySamples / 1000) : null;
    const oldestPendingMin = pendingCount > 0 ? Math.round(oldestPendingMs / 60_000) : 0;

    return {
      sentBars, failureRate, dayBars, dlqBars, domainBars, auth, app,
      errorInsights, avgDelaySec, oldestPendingMin, pendingCount,
    };
  }, [data]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {isRTL ? 'آخر 30 يوم · آخر تحديث' : 'Last 30 days · updated'}: {lastUpdated}
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ['email-center-reports'] })}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'متوسط زمن الإرسال' : 'Avg send delay'}</p><p className="text-lg font-bold tech-content">{reports.avgDelaySec === null ? '—' : `${reports.avgDelaySec}s`}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'أقدم انتظار' : 'Oldest pending'}</p><p className={`text-lg font-bold tech-content ${reports.oldestPendingMin >= 30 ? 'text-destructive' : reports.oldestPendingMin >= 10 ? 'text-warning' : ''}`}>{reports.pendingCount === 0 ? '—' : `${reports.oldestPendingMin}m`}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'قيد الانتظار' : 'Pending'}</p><p className="text-lg font-bold tech-content">{reports.pendingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'عنوان المرسل' : 'Sender address'}</p><p className="text-sm font-bold tech-content text-success">noreply@qitaat.com</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'مُرسل حسب القالب' : 'Sent by template'}</CardTitle></CardHeader><CardContent><BarList items={reports.sentBars} max={8} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'نسبة الفشل %' : 'Failure rate %'}</CardTitle></CardHeader><CardContent><BarList items={reports.failureRate} max={8} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'الإرسال يومياً' : 'Sent per day'}</CardTitle></CardHeader><CardContent><BarList items={reports.dayBars} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'DLQ حسب السبب' : 'DLQ by reason'}</CardTitle></CardHeader><CardContent><BarList items={reports.dlqBars} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'فئات نطاقات المستلمين' : 'Recipient domain buckets'}</CardTitle></CardHeader><CardContent><BarList items={reports.domainBars} max={8} /></CardContent></Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'مصادقة مقابل رسائل التطبيق' : 'Auth vs app emails'}</CardTitle></CardHeader>
        <CardContent>
          <BarList items={[
            { label: isRTL ? 'مصادقة' : 'Auth', value: reports.auth, tone: 'bg-secondary' },
            { label: isRTL ? 'رسائل التطبيق' : 'App emails', value: reports.app, tone: 'bg-primary' },
          ]} />
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'تحليل الأخطاء والتوصيات' : 'Error insights & recommendations'}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reports.errorInsights.length === 0 ? (
            <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد أخطاء خلال آخر 30 يوم.' : 'No errors in the last 30 days.'}</p>
          ) : (
            reports.errorInsights.map((e) => {
              const rec = (DLQ_RECOMMENDATIONS as Record<string, { ar: string; en: string } | undefined>)[e.kind];
              return (
                <div key={e.kind} className="text-xs border rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium tech-content">{e.kind}</span>
                    <span className="text-muted-foreground tech-content">{e.count}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {rec ? (isRTL ? rec.ar : rec.en) : (isRTL ? 'لا توصية محددة — راجع تفاصيل الخطأ.' : 'No specific recommendation — inspect error detail.')}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        {isRTL
          ? 'الفئات تستند إلى تجميع نطاقات المستلمين دون كشف العناوين الكاملة. لا يتم إرسال أي بيانات إلى GA4/GTM.'
          : 'Buckets aggregate recipient domains without exposing full addresses. No data is sent to GA4/GTM.'}
      </p>
    </div>
  );
};