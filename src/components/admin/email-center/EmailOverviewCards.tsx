import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { Mail, CheckCircle2, XCircle, Inbox, ShieldAlert, Activity, Clock, Send } from 'lucide-react';
import { dedupeByMessageId, type EmailLogRow } from '@/lib/email-center/email-log-utils';
import { format } from 'date-fns';

interface OverviewMetrics {
  sentToday: number;
  sent7d: number;
  sent30d: number;
  failed: number;
  dlq: number;
  pending: number;
  suppressed: number;
  unsubscribed: number;
  lastSent: string | null;
  lastFailed: string | null;
  topTemplates: Array<{ name: string; count: number }>;
  topFailing: Array<{ name: string; count: number }>;
}

const fetchOverview = async (): Promise<OverviewMetrics> => {
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sinceToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: logs }, { count: suppressedCount }, { count: unsubCount }] = await Promise.all([
    supabase
      .from('email_send_log')
      .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
      .gte('created_at', since30d)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('suppressed_emails').select('*', { count: 'exact', head: true }),
    supabase.from('email_unsubscribe_tokens').select('*', { count: 'exact', head: true }).not('used_at', 'is', null),
  ]);

  const rows = dedupeByMessageId((logs ?? []) as EmailLogRow[]);
  const sentRows = rows.filter((r) => r.status === 'sent');
  const failedRows = rows.filter((r) => r.status === 'failed' || r.status === 'dlq');

  const sentToday = sentRows.filter((r) => r.created_at >= sinceToday).length;
  const sent7d = sentRows.filter((r) => r.created_at >= since7d).length;
  const sent30d = sentRows.length;
  const dlq = rows.filter((r) => r.status === 'dlq').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const failed = rows.filter((r) => r.status === 'failed').length;

  const tally = (arr: EmailLogRow[]) => {
    const map = new Map<string, number>();
    for (const r of arr) {
      const key = r.template_name ?? 'unknown';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  return {
    sentToday,
    sent7d,
    sent30d,
    failed,
    dlq,
    pending,
    suppressed: suppressedCount ?? 0,
    unsubscribed: unsubCount ?? 0,
    lastSent: sentRows[0]?.created_at ?? null,
    lastFailed: failedRows[0]?.created_at ?? null,
    topTemplates: tally(sentRows),
    topFailing: tally(failedRows),
  };
};

const Stat: React.FC<{ icon: React.ElementType; label: string; value: string | number; tone?: string }> = ({
  icon: Icon, label, value, tone = 'text-foreground',
}) => (
  <Card className="hover-lift">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`size-10 rounded-xl bg-muted/40 grid place-items-center ${tone}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-lg font-bold tech-content ${tone}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

export const EmailOverviewCards: React.FC = () => {
  const { isRTL } = useLanguage();
  const { data, isLoading } = useQuery({ queryKey: ['email-center-overview'], queryFn: fetchOverview, staleTime: 30_000 });

  const fmt = (iso: string | null) => (iso ? format(new Date(iso), 'yyyy-MM-dd HH:mm') : '—');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1"><Mail className="size-3" /> noreply@qitaat.com</Badge>
        <Badge variant="secondary">Resend</Badge>
        <Badge variant="outline" className="gap-1">
          <Activity className="size-3" /> {isRTL ? 'الإرسال المباشر صحي' : 'Direct send healthy'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Send} label={isRTL ? 'مُرسل اليوم' : 'Sent today'} value={isLoading ? '…' : data!.sentToday} tone="text-success" />
        <Stat icon={Send} label={isRTL ? 'مُرسل 7 أيام' : 'Sent 7d'} value={isLoading ? '…' : data!.sent7d} tone="text-success" />
        <Stat icon={Send} label={isRTL ? 'مُرسل 30 يوم' : 'Sent 30d'} value={isLoading ? '…' : data!.sent30d} tone="text-success" />
        <Stat icon={XCircle} label={isRTL ? 'فشل' : 'Failed'} value={isLoading ? '…' : data!.failed} tone="text-destructive" />
        <Stat icon={ShieldAlert} label={isRTL ? 'DLQ' : 'DLQ'} value={isLoading ? '…' : data!.dlq} tone="text-destructive" />
        <Stat icon={Clock} label={isRTL ? 'قيد الانتظار' : 'Pending'} value={isLoading ? '…' : data!.pending} tone="text-info" />
        <Stat icon={Inbox} label={isRTL ? 'محظور' : 'Suppressed'} value={isLoading ? '…' : data!.suppressed} tone="text-warning" />
        <Stat icon={Inbox} label={isRTL ? 'إلغاء اشتراك' : 'Unsubscribed'} value={isLoading ? '…' : data!.unsubscribed} tone="text-warning" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'آخر إرسال ناجح' : 'Last successful send'}</CardTitle></CardHeader>
          <CardContent className="text-sm tech-content text-success flex items-center gap-2"><CheckCircle2 className="size-4" />{fmt(data?.lastSent ?? null)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'آخر إرسال فاشل' : 'Last failed send'}</CardTitle></CardHeader>
          <CardContent className="text-sm tech-content text-destructive flex items-center gap-2"><XCircle className="size-4" />{fmt(data?.lastFailed ?? null)}</CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'أكثر القوالب استخداماً' : 'Most used templates'}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(data?.topTemplates ?? []).length === 0 ? (
              <p className="text-muted-foreground">—</p>
            ) : (
              data!.topTemplates.map((t) => (
                <div key={t.name} className="flex justify-between"><span className="truncate">{t.name}</span><span className="tech-content text-muted-foreground">{t.count}</span></div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'الأكثر فشلاً' : 'Most failing templates'}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(data?.topFailing ?? []).length === 0 ? (
              <p className="text-muted-foreground">—</p>
            ) : (
              data!.topFailing.map((t) => (
                <div key={t.name} className="flex justify-between"><span className="truncate">{t.name}</span><span className="tech-content text-destructive">{t.count}</span></div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};