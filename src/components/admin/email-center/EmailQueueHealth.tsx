import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/i18n/LanguageContext';
import { Activity, Clock } from 'lucide-react';
import { dedupeByMessageId, type EmailLogRow } from '@/lib/email-center/email-log-utils';

export const EmailQueueHealth: React.FC = () => {
  const { isRTL } = useLanguage();

  const { data } = useQuery({
    queryKey: ['email-center-queue-health'],
    queryFn: async () => {
      const sinceHour = new Date(Date.now() - 3600_000).toISOString();
      const { data: rows } = await supabase
        .from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
        .gte('created_at', sinceHour)
        .order('created_at', { ascending: false })
        .limit(2000);
      const dedup = dedupeByMessageId((rows ?? []) as EmailLogRow[]);
      const auth = dedup.filter((r) => r.template_name === 'auth_emails');
      const trans = dedup.filter((r) => r.template_name !== 'auth_emails');
      const pendingAuth = auth.filter((r) => r.status === 'pending').length;
      const pendingTrans = trans.filter((r) => r.status === 'pending').length;
      const lastSent = dedup.find((r) => r.status === 'sent')?.created_at ?? null;
      const failed = dedup.filter((r) => r.status === 'failed' || r.status === 'dlq').length;
      return { pendingAuth, pendingTrans, lastSent, failed, total: dedup.length };
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'طابور المصادقة (انتظار)' : 'Auth queue pending'}</p><p className="text-2xl font-bold tech-content">{data?.pendingAuth ?? '…'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'طابور المعاملات (انتظار)' : 'Transactional pending'}</p><p className="text-2xl font-bold tech-content">{data?.pendingTrans ?? '…'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'فشل آخر ساعة' : 'Failed (1h)'}</p><p className="text-2xl font-bold tech-content text-destructive">{data?.failed ?? '…'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي آخر ساعة' : 'Total (1h)'}</p><p className="text-2xl font-bold tech-content">{data?.total ?? '…'}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="size-4" />{isRTL ? 'مُعالج الطابور' : 'Queue processor'}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? 'الجدولة' : 'Schedule'}</span><Badge variant="outline" className="tech-content">pg_cron · every 5s</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? 'آخر إرسال ناجح' : 'Last successful send'}</span><span className="tech-content flex items-center gap-1"><Clock className="size-3" />{data?.lastSent ? new Date(data.lastSent).toISOString().replace('T', ' ').slice(0, 16) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? 'الدالة' : 'Function'}</span><Badge variant="outline" className="tech-content">process-email-queue</Badge></div>
        </CardContent>
      </Card>
      <Alert>
        <AlertDescription className="text-xs">
          {isRTL
            ? 'مقاييس عمق pgmq المباشرة (queue depth الدقيق وزمن المعالجة) غير معروضة هنا — المعروض مأخوذ من email_send_log كبديل آمن.'
            : 'Direct pgmq depth/processing-time metrics are not exposed here — shown numbers come from email_send_log as a safe proxy.'}
        </AlertDescription>
      </Alert>
    </div>
  );
};