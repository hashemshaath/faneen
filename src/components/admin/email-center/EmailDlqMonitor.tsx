import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/i18n/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import {
  dedupeByMessageId, maskRecipient, classifyError, DLQ_RECOMMENDATIONS,
  type EmailLogRow,
} from '@/lib/email-center/email-log-utils';

export const EmailDlqMonitor: React.FC = () => {
  const { isRTL } = useLanguage();

  const { data } = useQuery({
    queryKey: ['email-center-dlq'],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('email_send_log')
        .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
        .eq('status', 'dlq')
        .order('created_at', { ascending: false })
        .limit(500);
      return dedupeByMessageId((rows ?? []) as EmailLogRow[]);
    },
    staleTime: 60_000,
  });

  const { byError, byTemplate, recent, historical, active } = useMemo(() => {
    const rows = data ?? [];
    const cutoff = Date.now() - 7 * 86_400_000;
    const errorMap = new Map<string, number>();
    const tplMap = new Map<string, number>();
    let activeCount = 0;
    let historicalCount = 0;
    for (const r of rows) {
      const k = classifyError(r.error_message);
      errorMap.set(k, (errorMap.get(k) ?? 0) + 1);
      const tk = r.template_name ?? 'unknown';
      tplMap.set(tk, (tplMap.get(tk) ?? 0) + 1);
      if (new Date(r.created_at).getTime() >= cutoff) activeCount++;
      else historicalCount++;
    }
    return {
      byError: [...errorMap.entries()].sort((a, b) => b[1] - a[1]),
      byTemplate: [...tplMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      recent: rows.slice(0, 10),
      historical: historicalCount,
      active: activeCount,
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي DLQ' : 'Total DLQ'}</p><p className="text-2xl font-bold tech-content">{(data ?? []).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'نشط (7 أيام)' : 'Active (7d)'}</p><p className="text-2xl font-bold tech-content text-destructive">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'تاريخي (>7 أيام)' : 'Historical (>7d)'}</p><p className="text-2xl font-bold tech-content text-muted-foreground">{historical}</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'حسب نوع الخطأ' : 'By error type'}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {byError.length === 0 ? <p className="text-muted-foreground">—</p> : byError.map(([key, count]) => {
              const rec = (DLQ_RECOMMENDATIONS as Record<string, { ar: string; en: string } | undefined>)[key];
              return (
                <div key={key} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="tech-content">{key}</Badge>
                    <span className="tech-content font-semibold">{count}</span>
                  </div>
                  {rec && <p className="text-xs text-muted-foreground mt-1">{isRTL ? rec.ar : rec.en}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'حسب القالب' : 'By template'}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byTemplate.length === 0 ? <p className="text-muted-foreground">—</p> : byTemplate.map(([t, c]) => (
              <div key={t} className="flex justify-between"><span className="truncate tech-content">{t}</span><span className="tech-content text-destructive">{c}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="size-4 text-destructive" />{isRTL ? 'أحدث سجلات DLQ' : 'Recent DLQ entries'}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {recent.length === 0 ? <p className="text-muted-foreground">{isRTL ? 'لا يوجد' : 'None'}</p> : recent.map((r) => (
            <div key={r.id} className="border rounded-lg p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="min-w-0">
                <p className="tech-content"><span className="text-muted-foreground">{format(new Date(r.created_at), 'MM-dd HH:mm')}</span> · {r.template_name ?? '—'} · {maskRecipient(r.recipient_email, false)}</p>
                <p className="text-destructive truncate" title={r.error_message ?? ''}>{r.error_message ?? '—'}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="text-xs">
          {isRTL
            ? 'لا تُحذف سجلات DLQ من هذه الشاشة. تظل محفوظة كأرشيف مرجعي.'
            : 'DLQ rows are never deleted from this screen — kept as historical archive.'}
        </AlertDescription>
      </Alert>
    </div>
  );
};