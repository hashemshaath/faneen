import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminRetryDlqEmail } from '@/modules/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/i18n/LanguageContext';
import { ShieldAlert, RefreshCw, Loader2, History, AlertTriangle, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  dedupeByMessageId, maskRecipient, classifyError, classifyDlqRow,
  DLQ_RECOMMENDATIONS, CURRENT_SENDER_DOMAIN,
  type EmailLogRow,
} from '@/lib/email-center/email-log-utils';

export const EmailDlqMonitor: React.FC = () => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
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

  const { byError, byTemplate, historical, active, freshNms, rows } = useMemo(() => {
    const list = data ?? [];
    const errorMap = new Map<string, number>();
    const tplMap = new Map<string, number>();
    let activeCount = 0;
    let historicalCount = 0;
    let freshNmsCount = 0;
    for (const r of list) {
      const k = classifyError(r.error_message);
      errorMap.set(k, (errorMap.get(k) ?? 0) + 1);
      const tk = r.template_name ?? 'unknown';
      tplMap.set(tk, (tplMap.get(tk) ?? 0) + 1);
      const cls = classifyDlqRow(r);
      if (cls.isHistorical) historicalCount++; else activeCount++;
      if (cls.isFreshNoMatchingSender) freshNmsCount++;
    }
    return {
      byError: [...errorMap.entries()].sort((a, b) => b[1] - a[1]),
      byTemplate: [...tplMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      historical: historicalCount,
      active: activeCount,
      freshNms: freshNmsCount,
      rows: list,
    };
  }, [data]);

  const handleRetry = async (logId: string) => {
    setRetryingId(logId);
    try {
      const { data: res, error } = await adminRetryDlqEmail<{ ok?: boolean; error?: string; reason?: string }>({ logId });
      if (error) throw error;
      if (res?.error) throw new Error(`${res.error}${res.reason ? ` (${res.reason})` : ''}`);
      toast.success(isRTL ? 'تم إعادة وضع الرسالة في الطابور' : 'Retry queued');
      setConfirmId(null);
      await qc.invalidateQueries({ queryKey: ['email-center-dlq'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل إعادة المحاولة' : 'Retry failed'));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {freshNms > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            {isRTL
              ? `رُصد ${freshNms} خطأ no_matching_sender حديث (آخر 48 ساعة). إذا تكرّر، أعد نشر send-transactional-email و auth-email-hook وتأكّد أن SENDER_DOMAIN=${CURRENT_SENDER_DOMAIN}.`
              : `${freshNms} fresh no_matching_sender error(s) detected in the last 48h. If this recurs, redeploy send-transactional-email and auth-email-hook and verify SENDER_DOMAIN=${CURRENT_SENDER_DOMAIN}.`}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي DLQ' : 'Total DLQ'}</p><p className="text-2xl font-bold tech-content">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'مشكلة نشطة' : 'Active issue'}</p><p className="text-2xl font-bold tech-content text-destructive">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{isRTL ? 'تاريخي (أرشيف)' : 'Historical (archive)'}</p><p className="text-2xl font-bold tech-content text-muted-foreground">{historical}</p></CardContent></Card>
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            {isRTL ? 'سجلات DLQ التفصيلية' : 'DLQ entries'}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-1">
            {isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span className="text-xs">{isRTL ? 'تحديث' : 'Refresh'}</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">{isRTL ? 'جارٍ التحميل…' : 'Loading…'}</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد رسائل في DLQ.' : 'No DLQ entries.'}</p>
          ) : rows.slice(0, 50).map((r) => {
            const cls = classifyDlqRow(r);
            const isConfirming = confirmId === r.id;
            const isRetrying = retryingId === r.id;
            return (
              <div key={r.id} className={`border rounded-lg p-3 space-y-2 ${cls.isHistorical ? 'bg-muted/30 border-muted' : 'border-destructive/30'}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {cls.isHistorical ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]"><History className="size-3" />{isRTL ? 'تاريخي' : 'Historical'}</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="size-3" />{isRTL ? 'نشط' : 'Active issue'}</Badge>
                  )}
                  {cls.retryable ? (
                    <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/15 text-[10px]">{isRTL ? 'قابل للإعادة' : 'Retryable'}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">{isRTL ? 'غير قابل للإعادة' : 'Not retryable'}</Badge>
                  )}
                  <Badge variant="outline" className="tech-content text-[10px]">{cls.errorKind}</Badge>
                  <Badge variant="outline" className="tech-content text-[10px]">{r.template_name ?? 'unknown'}</Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] tech-content">
                  <div><span className="text-muted-foreground">created_at:</span> <span dir="ltr">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm:ss')}</span></div>
                  <div><span className="text-muted-foreground">recipient:</span> <span dir="ltr">{maskRecipient(r.recipient_email, false)}</span></div>
                  <div className="truncate"><span className="text-muted-foreground">message_id:</span> <span dir="ltr">{r.message_id ?? '—'}</span></div>
                  <div><span className="text-muted-foreground">queue:</span> transactional_emails</div>
                  <div><span className="text-muted-foreground">sender_domain:</span> <span dir="ltr">{CURRENT_SENDER_DOMAIN}</span></div>
                </div>

                <p className="text-[11px] text-destructive whitespace-pre-wrap break-words" dir="ltr">{r.error_message ?? '—'}</p>

                <p className="text-[11px] text-muted-foreground">{isRTL ? cls.reasonAr : cls.reasonEn}</p>

                <div className="flex justify-end">
                  {cls.retryable && (
                    !isConfirming ? (
                      <Button size="sm" variant="outline" onClick={() => setConfirmId(r.id)} className="gap-1 h-8">
                        <RotateCw className="size-3.5" /> {isRTL ? 'إعادة المحاولة' : 'Retry'}
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" onClick={() => handleRetry(r.id)} disabled={isRetrying}>
                          {isRetrying ? <Loader2 className="size-3.5 animate-spin" /> : (isRTL ? 'تأكيد' : 'Confirm')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} disabled={isRetrying}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="text-xs">
          {isRTL
            ? 'لا تُحذف سجلات DLQ. الإعادة المتاحة فردية فقط، ولا تتم بشكل مجمّع. يحفظ كل تنفيذ في سجل النشاط الإداري.'
            : 'DLQ rows are never deleted. Retries are per-row only — no bulk retry. Each retry is recorded in the admin activity log.'}
        </AlertDescription>
      </Alert>
    </div>
  );
};
