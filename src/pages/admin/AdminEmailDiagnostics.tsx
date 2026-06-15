import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, XCircle, Mail, Inbox, Send,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { format } from 'date-fns';

interface AttemptRow {
  message_id: string;
  template_name: string;
  recipient_email: string;
  latest_status: string;
  error_message: string | null;
  provider: string | null;
  provider_id: string | null;
  enqueued_at: string;
  sent_at: string | null;
  delivery_seconds: number | null;
  attempts: number;
}

interface TimingBucket {
  bucket_hour: string;
  enqueued_count: number;
  sent_count: number;
  failed_count: number;
  median_delivery_seconds: number | null;
  p95_delivery_seconds: number | null;
}

interface DelayAlertRow {
  id: string;
  alert_type: string;
  severity: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  acknowledged: boolean;
}

const STATUS_TONE: Record<string, string> = {
  sent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  dlq: 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40',
  suppressed: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  bounced: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
};

const AdminEmailDiagnostics = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [hours, setHours] = useState<number>(24);

  const attemptsQ = useQuery({
    queryKey: ['email-diag-attempts', hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_auth_email_attempts', {
        p_limit: 100, p_hours: hours,
      });
      if (error) throw error;
      return (data ?? []) as AttemptRow[];
    },
    refetchInterval: 30_000,
  });

  const timingQ = useQuery({
    queryKey: ['email-diag-timing', hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_auth_email_timing_report', { p_hours: hours });
      if (error) throw error;
      return (data ?? []) as TimingBucket[];
    },
    refetchInterval: 60_000,
  });

  const alertsQ = useQuery({
    queryKey: ['email-diag-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_deliverability_alerts')
        .select('id, alert_type, severity, message, metadata, created_at, acknowledged')
        .eq('alert_type', 'auth_email_delayed')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as DelayAlertRow[];
    },
    refetchInterval: 30_000,
  });

  const ackAlert = async (id: string) => {
    await supabase
      .from('email_deliverability_alerts')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    alertsQ.refetch();
  };

  const stats = useMemo(() => {
    const rows = attemptsQ.data ?? [];
    const sent = rows.filter(r => r.latest_status === 'sent');
    const failed = rows.filter(r => ['failed', 'dlq'].includes(r.latest_status));
    const pending = rows.filter(r => r.latest_status === 'pending');
    const deliverySecs = sent.map(r => r.delivery_seconds ?? 0).filter(s => s > 0).sort((a, b) => a - b);
    const median = deliverySecs.length ? deliverySecs[Math.floor(deliverySecs.length / 2)] : null;
    return { total: rows.length, sent: sent.length, failed: failed.length, pending: pending.length, median };
  }, [attemptsQ.data]);

  const chartData = useMemo(() =>
    (timingQ.data ?? []).map(b => ({
      hour: format(new Date(b.bucket_hour), 'HH:mm'),
      enqueued: b.enqueued_count,
      sent: b.sent_count,
      failed: b.failed_count,
      p50: b.median_delivery_seconds ? Number(b.median_delivery_seconds) : null,
      p95: b.p95_delivery_seconds ? Number(b.p95_delivery_seconds) : null,
    })),
    [timingQ.data]);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {isRTL ? 'تشخيص بريد المصادقة' : 'Auth Email Diagnostics'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'آخر محاولات signup / recovery مع توقيتات webhook → enqueued → sent.'
              : 'Latest signup / recovery attempts with webhook → enqueued → sent timings.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{isRTL ? 'آخر ساعة' : 'Last 1h'}</SelectItem>
              <SelectItem value="6">{isRTL ? 'آخر 6 ساعات' : 'Last 6h'}</SelectItem>
              <SelectItem value="24">{isRTL ? 'آخر 24 ساعة' : 'Last 24h'}</SelectItem>
              <SelectItem value="72">{isRTL ? 'آخر 3 أيام' : 'Last 3d'}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => {
            attemptsQ.refetch(); timingQ.refetch(); alertsQ.refetch();
          }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delayed alerts */}
      {(alertsQ.data?.length ?? 0) > 0 && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              {isRTL ? `تنبيهات تأخر (${alertsQ.data?.length})` : `Delay alerts (${alertsQ.data?.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertsQ.data!.map(a => {
              const meta = (a.metadata ?? {}) as Record<string, string>;
              return (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={STATUS_TONE[meta.status] ?? ''}>{meta.template_name}</Badge>
                      <span className="font-mono text-xs truncate">{meta.recipient_email}</span>
                    </div>
                    {a.message && <p className="mt-1 text-muted-foreground">{a.message}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(a.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => ackAlert(a.id)}>
                    {isRTL ? 'تأكيد' : 'Ack'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Mail} label={isRTL ? 'الإجمالي' : 'Total'} value={stats.total} />
        <StatCard icon={CheckCircle2} label={isRTL ? 'مُرسل' : 'Sent'} value={stats.sent} tone="emerald" />
        <StatCard icon={Inbox} label={isRTL ? 'قيد الانتظار' : 'Pending'} value={stats.pending} tone="amber" />
        <StatCard icon={XCircle} label={isRTL ? 'فشل' : 'Failed'} value={stats.failed} tone="rose" />
        <StatCard icon={Clock} label={isRTL ? 'وسيط التسليم (ث)' : 'Median delivery (s)'} value={stats.median ?? '—'} />
      </div>

      {/* Timing chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{isRTL ? 'مخطط زمني — webhook → sent' : 'Timeline — webhook → sent'}</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {timingQ.isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hour" fontSize={11} />
                <YAxis yAxisId="count" fontSize={11} />
                <YAxis yAxisId="time" orientation="right" fontSize={11} unit="s" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="count" dataKey="enqueued" name={isRTL ? 'انتظر' : 'Enqueued'} fill="hsl(var(--primary) / 0.5)" />
                <Bar yAxisId="count" dataKey="sent" name={isRTL ? 'مُرسل' : 'Sent'} fill="hsl(142 70% 45%)" />
                <Bar yAxisId="count" dataKey="failed" name={isRTL ? 'فشل' : 'Failed'} fill="hsl(0 70% 55%)" />
                <Line yAxisId="time" type="monotone" dataKey="p50" name="p50 s" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
                <Line yAxisId="time" type="monotone" dataKey="p95" name="p95 s" stroke="hsl(280 70% 60%)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Attempts table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            {isRTL ? 'آخر المحاولات' : 'Latest attempts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attemptsQ.isLoading ? (
            <div className="p-6 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (attemptsQ.data?.length ?? 0) === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              {isRTL ? 'لا توجد محاولات في النطاق الزمني المحدد.' : 'No attempts in the selected window.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr className="[&_th]:px-3 [&_th]:py-2 text-start">
                    <th>{isRTL ? 'النوع' : 'Type'}</th>
                    <th>{isRTL ? 'المستلم' : 'Recipient'}</th>
                    <th>{isRTL ? 'الحالة' : 'Status'}</th>
                    <th>{isRTL ? 'المزود' : 'Provider'}</th>
                    <th>{isRTL ? 'enqueue' : 'Enqueued'}</th>
                    <th>{isRTL ? 'التسليم' : 'Delivery'}</th>
                    <th>{isRTL ? 'السبب' : 'Reason'}</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-3 [&_td]:py-2 [&_tr]:border-b">
                  {attemptsQ.data!.map(r => (
                    <tr key={r.message_id} className="hover:bg-muted/40">
                      <td><Badge variant="outline">{r.template_name}</Badge></td>
                      <td className="font-mono text-xs">{r.recipient_email}</td>
                      <td>
                        <Badge variant="outline" className={STATUS_TONE[r.latest_status] ?? ''}>
                          {r.latest_status}
                        </Badge>
                      </td>
                      <td className="text-xs">
                        {r.provider ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {r.provider}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="text-xs text-muted-foreground">{format(new Date(r.enqueued_at), 'HH:mm:ss')}</td>
                      <td className="text-xs">
                        {r.delivery_seconds != null ? `${r.delivery_seconds}s` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="text-xs text-rose-600 dark:text-rose-400 max-w-[280px] truncate">
                        {r.error_message ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        {isRTL ? 'صفحة المساعدة للمستخدمين: ' : 'User help page: '}
        <Link to="/help/email-not-arriving" className="underline text-primary">/help/email-not-arriving</Link>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: 'emerald' | 'rose' | 'amber';
}) => {
  const toneCls = tone === 'emerald' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />{label}
        </div>
        <p className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

export default AdminEmailDiagnostics;