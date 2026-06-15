import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, ShieldAlert, Loader2, RefreshCw, ListChecks,
} from 'lucide-react';
import { format } from 'date-fns';

interface OtpFailureRow {
  id: string;
  event_action: string;
  status: string | null;
  reason: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const REASON_LABEL: Record<string, { ar: string; en: string }> = {
  otp_create_failed: { ar: 'فشل إنشاء OTP في قاعدة البيانات', en: 'OTP insert failed in the database' },
  sms_delivery_failed: { ar: 'فشل تسليم الرسالة النصية', en: 'SMS delivery failed' },
  rate_limited: { ar: 'تجاوز حد المحاولات', en: 'Rate-limited' },
  no_account: { ar: 'لا يوجد حساب بهذا الرقم', en: 'No account for that number' },
  invalid_phone: { ar: 'رقم غير صالح', en: 'Invalid phone' },
  invalid_country_code: { ar: 'كود دولة غير صالح', en: 'Invalid country code' },
  missing_fields: { ar: 'حقول ناقصة', en: 'Missing fields' },
};

/** Repeat-alert threshold: same reason >= N hits inside the lookback window. */
const REPEAT_THRESHOLD = 5;

const AdminOtpFailures = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [hours, setHours] = useState<24 | 72 | 168>(24);

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: ['admin-otp-failures', hours],
    queryFn: async (): Promise<OtpFailureRow[]> => {
      const sinceIso = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id, event_action, status, reason, user_id, created_at, metadata')
        .eq('event_type', 'login_otp_send')
        .in('status', ['error', 'warn'])
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OtpFailureRow[];
    },
    refetchInterval: 30_000,
  });

  const reasonStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.reason || 'unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  // Repeat-alert: any reason that exceeds the threshold in the window.
  const repeatAlerts = useMemo(
    () => reasonStats.filter((s) => s.count >= REPEAT_THRESHOLD),
    [reasonStats],
  );

  const total = rows.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            {isRTL ? 'سجل فشل OTP (داخلي)' : 'OTP failure log (internal)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'يعرض كل محاولات إرسال OTP التي انتهت بحالة error أو warn من security_audit_log، مع تنبيه عند تكرار نفس السبب.'
              : 'Shows every OTP send attempt that ended in error or warn from security_audit_log, with a repeat-alert when the same reason recurs.'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {([24, 72, 168] as const).map((h) => (
              <Button
                key={h}
                size="sm"
                variant={hours === h ? 'default' : 'outline'}
                className="h-8 rounded-lg"
                onClick={() => setHours(h)}
              >
                {h === 24 ? (isRTL ? '٢٤ ساعة' : '24h') : h === 72 ? (isRTL ? '٣ أيام' : '3d') : (isRTL ? '٧ أيام' : '7d')}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 ms-auto"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>

          {repeatAlerts.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-destructive">
                  {isRTL ? 'تنبيه: تكرار خطأ OTP' : 'Alert: repeated OTP failures'}
                </div>
                <ul className="text-xs text-destructive/90 space-y-0.5">
                  {repeatAlerts.map((a) => (
                    <li key={a.reason} className="tech-content">
                      {a.reason} — {a.count} {isRTL ? 'حالة' : 'hits'} / {hours}h
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">{isRTL ? 'إجمالي المحاولات الفاشلة' : 'Failed attempts'}</div>
              <div className="text-2xl font-semibold tech-content">{total}</div>
            </div>
            {reasonStats.slice(0, 3).map((s) => (
              <div key={s.reason} className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground truncate" title={s.reason}>
                  {REASON_LABEL[s.reason] ? (isRTL ? REASON_LABEL[s.reason].ar : REASON_LABEL[s.reason].en) : s.reason}
                </div>
                <div className="text-2xl font-semibold tech-content">{s.count}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-start p-2">{isRTL ? 'الوقت' : 'Time'}</th>
                  <th className="text-start p-2">{isRTL ? 'الإجراء' : 'Action'}</th>
                  <th className="text-start p-2">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="text-start p-2">{isRTL ? 'السبب' : 'Reason'}</th>
                  <th className="text-start p-2">{isRTL ? 'المستخدم' : 'User'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground p-6 text-sm">
                      {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          {isRTL ? 'لا توجد محاولات فاشلة في هذه الفترة' : 'No failed attempts in this window'}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 tech-content text-xs whitespace-nowrap">
                      {format(new Date(r.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="p-2 tech-content text-xs">{r.event_action}</td>
                    <td className="p-2">
                      <Badge variant={r.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {r.status ?? '—'}
                      </Badge>
                    </td>
                    <td className="p-2 tech-content text-xs">
                      {r.reason ? (
                        <span title={REASON_LABEL[r.reason] ? (isRTL ? REASON_LABEL[r.reason].ar : REASON_LABEL[r.reason].en) : r.reason}>
                          {r.reason}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 tech-content text-[11px] truncate max-w-[180px]" title={r.user_id ?? undefined}>
                      {r.user_id ? `${r.user_id.slice(0, 8)}…` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            {isRTL
              ? `يتم تحديث السجل تلقائيًا كل 30 ثانية. حد التنبيه: ${REPEAT_THRESHOLD} حالات لنفس السبب خلال نافذة العرض.`
              : `Log auto-refreshes every 30s. Alert threshold: ${REPEAT_THRESHOLD} hits per reason inside the window.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOtpFailures;