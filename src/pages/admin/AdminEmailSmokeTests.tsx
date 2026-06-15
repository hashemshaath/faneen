import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminEmailSmokeTest } from '@/modules/admin';
import { authService } from '@/services/auth/authService';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Activity, CheckCircle2, XCircle, Loader2, PlayCircle, MailCheck,
  ShieldCheck, RefreshCw, Clock, Phone,
} from 'lucide-react';
import { format } from 'date-fns';

type SmokeStep = 'signup' | 'recovery' | 'transactional';

interface SmokeStepResult {
  step: SmokeStep;
  ok: boolean;
  variant?: string;
  idempotency_key?: string;
  error?: string;
}

interface SmokeRunResponse {
  run_id: string;
  started_at: string;
  recipient_masked: string;
  results: SmokeStepResult[];
}

interface LogRow {
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const STEP_LABEL: Record<SmokeStep, { ar: string; en: string }> = {
  signup: { ar: '١. تحقق التسجيل', en: '1. Signup verification' },
  recovery: { ar: '٢. استعادة كلمة المرور', en: '2. Password recovery' },
  transactional: { ar: '٣. بريد transactional', en: '3. Transactional email' },
};

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

const AdminEmailSmokeTests = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const [testEmail, setTestEmail] = useState('');
  const [lastRun, setLastRun] = useState<SmokeRunResponse | null>(null);

  // ---- OTP smoke test state (independent of email run) ----
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCountryCode, setOtpCountryCode] = useState('+966');
  const [otpResult, setOtpResult] = useState<{
    ok: boolean;
    error?: string;
    message?: string;
    sms_sent?: boolean;
    test_mode?: boolean;
  } | null>(null);

  const otpMutation = useMutation({
    mutationFn: async (): Promise<{ ok: boolean; error?: string; message?: string; sms_sent?: boolean; test_mode?: boolean }> => {
      const cleanPhone = otpPhone.replace(/\D/g, '');
      let payload: { success?: boolean; error?: string; message?: string; sms_sent?: boolean; test_mode?: boolean };
      try {
        const data = await authService.sendLoginOtp(cleanPhone, otpCountryCode);
        payload = (data ?? {}) as typeof payload;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: 'invoke_error', message };
      }
      return {
        ok: !!payload.success,
        error: payload.error,
        message: payload.message,
        sms_sent: payload.sms_sent,
        test_mode: payload.test_mode,
      };
    },
    onSuccess: (r) => {
      setOtpResult(r);
      if (r.ok) {
        toast.success(isRTL ? 'تم تنفيذ مسار OTP بنجاح' : 'OTP path completed successfully');
      } else {
        toast.error(
          isRTL
            ? `فشل OTP: ${r.error ?? r.message ?? 'unknown'}`
            : `OTP failed: ${r.error ?? r.message ?? 'unknown'}`,
        );
      }
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setOtpResult({ ok: false, error: 'invoke_error', message: msg });
      toast.error(isRTL ? `خطأ في التشغيل: ${msg}` : `Invocation error: ${msg}`);
    },
  });

  const otpPhoneValid = otpPhone.replace(/\D/g, '').length >= 7 && /^\+\d{1,4}$/.test(otpCountryCode);

  const runMutation = useMutation({
    mutationFn: async (email: string): Promise<SmokeRunResponse> => {
      const { data, error } = await adminEmailSmokeTest<SmokeRunResponse>({ testEmail: email });
      if (error) throw new Error(error.message);
      if (!data || typeof data !== 'object') throw new Error('Empty response');
      return data as SmokeRunResponse;
    },
    onSuccess: (data) => {
      setLastRun(data);
      const allOk = data.results.every((r) => r.ok);
      toast[allOk ? 'success' : 'warning'](
        isRTL ? `Run ${data.run_id.slice(0, 8)} — ${allOk ? 'نجح' : 'مع تحذيرات'}` : `Run ${data.run_id.slice(0, 8)} — ${allOk ? 'OK' : 'with warnings'}`,
      );
      qc.invalidateQueries({ queryKey: ['email-smoke-logs'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(isRTL ? `فشل التشغيل: ${msg}` : `Run failed: ${msg}`);
    },
  });

  const { data: logRows = [], isFetching, refetch } = useQuery({
    queryKey: ['email-smoke-logs', lastRun?.run_id, lastRun?.started_at, testEmail],
    queryFn: async (): Promise<LogRow[]> => {
      if (!lastRun) return [];
      const since = new Date(new Date(lastRun.started_at).getTime() - 30 * 1000).toISOString();
      const { data, error } = await supabase
        .from('email_send_log')
        .select('message_id, template_name, recipient_email, status, error_message, created_at, metadata')
        .eq('recipient_email', testEmail.toLowerCase())
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    enabled: !!lastRun && !!testEmail,
    refetchInterval: lastRun ? 5000 : false,
  });

  // Deduplicate by message_id → latest status only.
  const dedupedRows = useMemo(() => {
    const map = new Map<string, LogRow>();
    for (const row of logRows) {
      const existing = map.get(row.message_id);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
        map.set(row.message_id, row);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [logRows]);

  const summary = useMemo(() => {
    const total = dedupedRows.length;
    const sent = dedupedRows.filter((r) => r.status === 'sent').length;
    const pending = dedupedRows.filter((r) => r.status === 'pending').length;
    const failed = dedupedRows.filter((r) => ['failed', 'dlq', 'bounced'].includes(r.status)).length;
    const suppressed = dedupedRows.filter((r) => r.status === 'suppressed').length;
    const resendCount = dedupedRows.filter(
      (r) => (r.metadata as { provider?: string } | null)?.provider === 'resend',
    ).length;
    return { total, sent, pending, failed, suppressed, resendCount };
  }, [dedupedRows]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {isRTL ? 'اختبار سريع للبريد (Phase 15F-Deploy)' : 'Email smoke tests (Phase 15F-Deploy)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'يُنفِّذ ثلاث مسارات بريد فعلية على بريد اختبار حقيقي: تحقق التسجيل، استعادة كلمة المرور، ورسالة transactional. يستخدم نفس Edge Functions و Resend في الإنتاج، ويعرض النتائج بعد قراءتها من email_send_log.'
              : 'Runs three real email paths against a test recipient: signup verification, password recovery, and a transactional welcome. Uses the same Edge Functions and Resend pipeline as production and reads results from email_send_log.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              dir="ltr"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="tech-content h-12 rounded-xl flex-1"
              autoComplete="off"
            />
            <Button
              size="lg"
              className="h-12 rounded-xl gap-2"
              disabled={!emailValid || runMutation.isPending}
              onClick={() => runMutation.mutate(testEmail.trim().toLowerCase())}
            >
              {runMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isRTL ? 'تشغيل الاختبارات الثلاثة' : 'Run all 3 tests'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isRTL
              ? 'لا يتم كشف أي tokens أو روابط magic-link أو API keys في النتائج.'
              : 'No tokens, magic links, or API keys are exposed in the results.'}
          </p>
        </CardContent>
      </Card>

      {lastRun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailCheck className="h-5 w-5 text-emerald-600" />
              <span className="tech-content">Run {lastRun.run_id.slice(0, 8)}</span>
              <span className="text-xs text-muted-foreground font-normal">
                · {lastRun.recipient_masked} · {format(new Date(lastRun.started_at), 'HH:mm:ss')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lastRun.results.map((r) => (
                <div
                  key={r.step}
                  className="rounded-xl border p-3 flex items-start gap-2"
                >
                  {r.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {isRTL ? STEP_LABEL[r.step].ar : STEP_LABEL[r.step].en}
                    </div>
                    {r.variant && (
                      <div className="text-xs text-muted-foreground tech-content">
                        variant: {r.variant}
                      </div>
                    )}
                    {r.error && (
                      <div className="text-xs text-destructive mt-1 break-words">
                        {r.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {summary.total} {isRTL ? 'صف' : 'rows'}
              </Badge>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                sent: {summary.sent}
              </Badge>
              {summary.pending > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  pending: {summary.pending}
                </Badge>
              )}
              {summary.failed > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  failed: {summary.failed}
                </Badge>
              )}
              {summary.suppressed > 0 && (
                <Badge variant="secondary" className="gap-1">
                  suppressed: {summary.suppressed}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 tech-content">
                provider=resend: {summary.resendCount}/{summary.total}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="ms-auto h-8 gap-1"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs">
                    <th className="text-start p-2">{isRTL ? 'القالب' : 'Template'}</th>
                    <th className="text-start p-2">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="text-start p-2">Provider</th>
                    <th className="text-start p-2 tech-content">Provider ID</th>
                    <th className="text-start p-2">{isRTL ? 'الوقت' : 'Time'}</th>
                  </tr>
                </thead>
                <tbody>
                  {dedupedRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground p-6 text-sm">
                        {isFetching ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : isRTL ? (
                          'في انتظار ظهور رسائل البريد في السجل…'
                        ) : (
                          'Waiting for emails to appear in the log…'
                        )}
                      </td>
                    </tr>
                  )}
                  {dedupedRows.map((row) => {
                    const meta = (row.metadata ?? {}) as { provider?: string; provider_id?: string };
                    return (
                      <tr key={row.message_id} className="border-t">
                        <td className="p-2 tech-content text-xs">{row.template_name}</td>
                        <td className="p-2">
                          <Badge
                            className={
                              row.status === 'sent'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : row.status === 'pending'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : row.status === 'suppressed'
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-destructive hover:bg-destructive/90'
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-2 tech-content text-xs">{meta.provider ?? '—'}</td>
                        <td className="p-2 tech-content text-xs truncate max-w-[180px]" title={meta.provider_id}>
                          {meta.provider_id ? `${meta.provider_id.slice(0, 12)}…` : '—'}
                        </td>
                        <td className="p-2 tech-content text-xs whitespace-nowrap">
                          {format(new Date(row.created_at), 'HH:mm:ss')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {isRTL
                ? `المستلم في الجدول: ${maskEmail(testEmail)}. يُحدَّث كل 5 ثوان.`
                : `Recipient (masked): ${maskEmail(testEmail)}. Auto-refresh every 5s.`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            {isRTL ? 'اختبار سريع لمسار OTP' : 'OTP path smoke test'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'يستدعي send-login-otp فعليًا في الإنتاج. استخدم رقم اختبار مُدرَج في OTP_BYPASS_PHONES لتفادي إرسال SMS حقيقي. النتيجة تعكس ما يراه المستخدم: success / no_account / sms_delivery_failed / otp_create_failed / rate_limited.'
              : 'Invokes send-login-otp directly in production. Use a phone listed in OTP_BYPASS_PHONES to avoid sending real SMS. The result mirrors what end users see: success / no_account / sms_delivery_failed / otp_create_failed / rate_limited.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              dir="ltr"
              placeholder="+966"
              value={otpCountryCode}
              onChange={(e) => setOtpCountryCode(e.target.value.trim())}
              className="tech-content h-12 rounded-xl w-full sm:w-32"
            />
            <Input
              dir="ltr"
              inputMode="numeric"
              placeholder="5XXXXXXXX"
              value={otpPhone}
              onChange={(e) => setOtpPhone(e.target.value)}
              className="tech-content h-12 rounded-xl flex-1"
            />
            <Button
              size="lg"
              className="h-12 rounded-xl gap-2"
              disabled={!otpPhoneValid || otpMutation.isPending}
              onClick={() => otpMutation.mutate()}
            >
              {otpMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isRTL ? 'اختبار OTP' : 'Run OTP test'}
            </Button>
          </div>

          {otpResult && (
            <div className="rounded-xl border p-3 flex items-start gap-2">
              {otpResult.ok ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-medium">
                  {otpResult.ok
                    ? (isRTL ? 'نجح مسار OTP' : 'OTP path succeeded')
                    : (isRTL ? 'فشل مسار OTP' : 'OTP path failed')}
                </div>
                <div className="text-xs text-muted-foreground tech-content break-words">
                  {otpResult.error && <>error: {otpResult.error} · </>}
                  {otpResult.message && <>message: {otpResult.message} · </>}
                  {typeof otpResult.sms_sent === 'boolean' && <>sms_sent: {String(otpResult.sms_sent)} · </>}
                  {typeof otpResult.test_mode === 'boolean' && <>test_mode: {String(otpResult.test_mode)}</>}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isRTL
              ? 'لا يتم كشف رمز OTP أو أي بيانات سرية. أسباب الفشل تظهر أيضًا في تبويب "فشل OTP".'
              : 'No OTP code or secret data is exposed. Failure reasons also appear in the "OTP failures" tab.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailSmokeTests;