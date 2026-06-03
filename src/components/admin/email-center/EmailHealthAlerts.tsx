import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Clock, Activity, Inbox,
} from 'lucide-react';
import {
  dedupeByMessageId, classifyDlqRow, CURRENT_SENDER_DOMAIN,
  type EmailLogRow,
} from '@/lib/email-center/email-log-utils';

type Severity = 'ok' | 'info' | 'warning' | 'critical';

interface AlertItem {
  id: string;
  severity: Severity;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
  icon: React.ElementType;
}

const TONE: Record<Severity, string> = {
  ok: 'border-success/30 bg-success/5 text-success',
  info: 'border-info/30 bg-info/5 text-info',
  warning: 'border-warning/40 bg-warning/5 text-warning',
  critical: 'border-destructive/40 bg-destructive/5 text-destructive',
};

const PENDING_AGE_WARN_MIN = 10;
const PENDING_AGE_CRIT_MIN = 30;
const DLQ_RATE_WARN = 5;
const DLQ_RATE_CRIT = 15;
const NO_SEND_WARN_HOURS = 6;
const SUPPRESSION_SPIKE = 10;
const TEMPLATE_FAIL_SPIKE = 5;

export const EmailHealthAlerts: React.FC = () => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['email-center-alerts'],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [{ data: logs }, { count: suppressionSpikeCount }] = await Promise.all([
        supabase
          .from('email_send_log')
          .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
          .gte('created_at', since24h)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('suppressed_emails')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', since24h),
      ]);
      return {
        rows: dedupeByMessageId((logs ?? []) as EmailLogRow[]),
        suppressionSpikeCount: suppressionSpikeCount ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const alerts: AlertItem[] = React.useMemo(() => {
    const out: AlertItem[] = [];
    if (!data) return out;
    const rows = data.rows;
    const now = Date.now();
    const sentRows = rows.filter((r) => r.status === 'sent');
    const pendingRows = rows.filter((r) => r.status === 'pending');
    const dlqRows = rows.filter((r) => r.status === 'dlq');
    const total = rows.length || 1;
    const dlqRate = (dlqRows.length / total) * 100;

    // 1. High DLQ rate
    if (dlqRate >= DLQ_RATE_CRIT) {
      out.push({
        id: 'dlq-rate-crit', severity: 'critical', icon: ShieldAlert,
        titleAr: 'معدل DLQ مرتفع جداً', titleEn: 'Very high DLQ rate',
        detailAr: `${dlqRate.toFixed(1)}% خلال 24 ساعة — راجع تبويب DLQ.`,
        detailEn: `${dlqRate.toFixed(1)}% over 24h — inspect DLQ tab.`,
      });
    } else if (dlqRate >= DLQ_RATE_WARN) {
      out.push({
        id: 'dlq-rate-warn', severity: 'warning', icon: ShieldAlert,
        titleAr: 'ارتفاع في معدل DLQ', titleEn: 'Elevated DLQ rate',
        detailAr: `${dlqRate.toFixed(1)}% خلال 24 ساعة.`,
        detailEn: `${dlqRate.toFixed(1)}% over 24h.`,
      });
    }

    // 2. Pending stuck
    const oldestPending = pendingRows.reduce<number>((min, r) => {
      const t = new Date(r.created_at).getTime();
      return t < min ? t : min;
    }, now);
    const oldestPendingMin = pendingRows.length
      ? Math.round((now - oldestPending) / 60_000)
      : 0;
    if (oldestPendingMin >= PENDING_AGE_CRIT_MIN) {
      out.push({
        id: 'pending-stuck-crit', severity: 'critical', icon: Clock,
        titleAr: 'رسائل قيد الإرسال عالقة', titleEn: 'Pending sends appear stuck',
        detailAr: `أقدم رسالة قيد الانتظار منذ ${oldestPendingMin} دقيقة.`,
        detailEn: `Oldest pending message is ${oldestPendingMin} min old.`,
      });
    } else if (oldestPendingMin >= PENDING_AGE_WARN_MIN) {
      out.push({
        id: 'pending-stuck-warn', severity: 'warning', icon: Clock,
        titleAr: 'تأخر في الإرسال', titleEn: 'Send processing delay',
        detailAr: `أقدم رسالة قيد الانتظار منذ ${oldestPendingMin} دقيقة.`,
        detailEn: `Oldest pending message is ${oldestPendingMin} min old.`,
      });
    }

    // 3. FRESH no_matching_sender (last 48h) — distinct from historical archive rows
    const nmsFresh = dlqRows.filter((r) => classifyDlqRow(r).isFreshNoMatchingSender);
    if (nmsFresh.length > 0) {
      out.push({
        id: 'no-matching-sender', severity: 'critical', icon: AlertTriangle,
        titleAr: 'no_matching_sender نشط (آخر 48 ساعة)',
        titleEn: 'Fresh no_matching_sender (last 48h)',
        detailAr: `${nmsFresh.length} رسالة فشلت رغم تفعيل ${CURRENT_SENDER_DOMAIN}. إذا تكرّر، تحقق من Resend وأعد نشر دوال البريد.`,
        detailEn: `${nmsFresh.length} message(s) failed despite ${CURRENT_SENDER_DOMAIN} being verified. If recurring, verify Resend and redeploy the email functions.`,
      });
    }

    // 4. Template failure spike
    const failByTpl = new Map<string, number>();
    for (const r of rows) {
      if (r.status === 'failed' || r.status === 'dlq') {
        const k = r.template_name ?? 'unknown';
        failByTpl.set(k, (failByTpl.get(k) ?? 0) + 1);
      }
    }
    const spike = [...failByTpl.entries()]
      .filter(([, n]) => n >= TEMPLATE_FAIL_SPIKE)
      .sort((a, b) => b[1] - a[1])[0];
    if (spike) {
      out.push({
        id: 'template-fail-spike', severity: 'warning', icon: AlertTriangle,
        titleAr: 'ارتفاع فشل قالب', titleEn: 'Template failure spike',
        detailAr: `${spike[0]} سجّل ${spike[1]} حالات فشل خلال 24 ساعة.`,
        detailEn: `${spike[0]} recorded ${spike[1]} failures in 24h.`,
      });
    }

    // 5. Suppression spike
    if (data.suppressionSpikeCount >= SUPPRESSION_SPIKE) {
      out.push({
        id: 'suppression-spike', severity: 'warning', icon: Inbox,
        titleAr: 'ارتفاع في حالات المنع',
        titleEn: 'Suppression spike',
        detailAr: `${data.suppressionSpikeCount} حالة منع جديدة خلال 24 ساعة.`,
        detailEn: `${data.suppressionSpikeCount} new suppressions in 24h.`,
      });
    }

    // 6. No successful email in last X hours
    const lastSent = sentRows[0]?.created_at;
    const lastSentHours = lastSent
      ? (now - new Date(lastSent).getTime()) / 3600_000
      : Infinity;
    if (rows.length > 0 && lastSentHours >= NO_SEND_WARN_HOURS) {
      out.push({
        id: 'no-recent-send', severity: 'warning', icon: Activity,
        titleAr: 'لا يوجد إرسال ناجح حديث',
        titleEn: 'No recent successful sends',
        detailAr: `لم يتم إرسال رسالة ناجحة منذ ${Math.round(lastSentHours)} ساعة.`,
        detailEn: `No successful send for ${Math.round(lastSentHours)} hours.`,
      });
    }

    return out;
  }, [data]);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '—';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="size-3.5" />
          <span>{isRTL ? 'آخر تحديث' : 'Last refresh'}: {lastUpdated}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ['email-center-alerts'] })}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card className={`border ${TONE.ok}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-success" />
            <div className="text-sm">
              <p className="font-medium">{isRTL ? 'كل المؤشرات صحية' : 'All systems healthy'}</p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'لا توجد تنبيهات نشطة خلال آخر 24 ساعة.' : 'No active alerts in the last 24 hours.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <Card key={a.id} className={`border ${TONE[a.severity]}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="size-4" />
                    {isRTL ? a.titleAr : a.titleEn}
                    <Badge variant="outline" className="ms-auto text-[10px] uppercase tech-content">
                      {a.severity}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-foreground/80">
                  {isRTL ? a.detailAr : a.detailEn}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {isRTL
          ? 'التنبيهات للعرض فقط — لا يتم إرسال إشعارات تلقائية. تستند إلى email_send_log كمصدر آمن للبيانات.'
          : 'Alerts are read-only — no automatic notifications are sent. Derived from email_send_log as a safe data source.'}
      </p>
    </div>
  );
};