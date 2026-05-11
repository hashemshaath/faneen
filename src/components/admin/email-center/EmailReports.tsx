import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { dedupeByMessageId, recipientDomain, classifyError, type EmailLogRow } from '@/lib/email-center/email-log-utils';
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

  const { data } = useQuery({
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
    let auth = 0, trans = 0;

    for (const r of rows) {
      const tpl = r.template_name ?? 'unknown';
      totalByTpl.set(tpl, (totalByTpl.get(tpl) ?? 0) + 1);
      if (tpl === 'auth_emails') auth++; else trans++;
      if (r.status === 'sent') {
        sentByTpl.set(tpl, (sentByTpl.get(tpl) ?? 0) + 1);
        const day = format(new Date(r.created_at), 'MM-dd');
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
        byDomain.set(recipientDomain(r.recipient_email), (byDomain.get(recipientDomain(r.recipient_email)) ?? 0) + 1);
      } else if (r.status === 'failed' || r.status === 'dlq') {
        failByTpl.set(tpl, (failByTpl.get(tpl) ?? 0) + 1);
        if (r.status === 'dlq') {
          const k = classifyError(r.error_message);
          dlqByReason.set(k, (dlqByReason.get(k) ?? 0) + 1);
        }
      }
    }

    const sentBars: Bar[] = [...sentByTpl.entries()].map(([l, v]) => ({ label: l, value: v, tone: 'bg-success' })).sort((a, b) => b.value - a.value);
    const failureRate: Bar[] = [...totalByTpl.entries()]
      .map(([l, v]) => ({ label: l, value: Math.round(((failByTpl.get(l) ?? 0) / Math.max(1, v)) * 100), tone: 'bg-destructive' }))
      .filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
    const dayBars: Bar[] = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([l, v]) => ({ label: l, value: v, tone: 'bg-info' }));
    const dlqBars: Bar[] = [...dlqByReason.entries()].map(([l, v]) => ({ label: l, value: v, tone: 'bg-destructive' })).sort((a, b) => b.value - a.value);
    const domainBars: Bar[] = [...byDomain.entries()].map(([l, v]) => ({ label: l, value: v, tone: 'bg-primary' })).sort((a, b) => b.value - a.value);

    return { sentBars, failureRate, dayBars, dlqBars, domainBars, auth, trans };
  }, [data]);

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'مُرسل حسب القالب' : 'Sent by template'}</CardTitle></CardHeader><CardContent><BarList items={reports.sentBars} max={8} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'نسبة الفشل %' : 'Failure rate %'}</CardTitle></CardHeader><CardContent><BarList items={reports.failureRate} max={8} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'الإرسال يومياً' : 'Sent per day'}</CardTitle></CardHeader><CardContent><BarList items={reports.dayBars} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'DLQ حسب السبب' : 'DLQ by reason'}</CardTitle></CardHeader><CardContent><BarList items={reports.dlqBars} /></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'أعلى نطاقات المستلمين' : 'Top recipient domains'}</CardTitle></CardHeader><CardContent><BarList items={reports.domainBars} max={8} /></CardContent></Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'مصادقة مقابل معاملات' : 'Auth vs transactional'}</CardTitle></CardHeader>
        <CardContent>
          <BarList items={[
            { label: isRTL ? 'مصادقة' : 'Auth', value: reports.auth, tone: 'bg-secondary' },
            { label: isRTL ? 'معاملات' : 'Transactional', value: reports.trans, tone: 'bg-primary' },
          ]} />
        </CardContent>
      </Card>
    </div>
  );
};