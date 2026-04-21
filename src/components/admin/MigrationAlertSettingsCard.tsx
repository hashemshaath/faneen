import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BellRing, Mail, AlertTriangle, Save, Send, History, RefreshCw, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AlertConfig {
  enabled: boolean;
  failure_rate_threshold: number;
  min_sample_size: number;
  cooldown_hours: number;
  evaluation_window_hours: number;
  rerun_cooldown_minutes: number;
  notify_emails: string[];
}

interface SentAlert {
  id: string;
  sent_at: string;
  failure_rate: number;
  total_events: number;
  failed_events: number;
  threshold: number;
  recipients: string[];
}

interface RerunStatus {
  migration_epoch: number;
  last_rerun_at: string | null;
  last_rerun_reason: string | null;
  rerun_cooldown_minutes: number;
}

export function MigrationAlertSettingsCard() {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<AlertConfig | null>(null);
  const [emailsText, setEmailsText] = useState('');
  const [rerunReason, setRerunReason] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['migration-alert-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_alert_config')
        .select(
          'enabled, failure_rate_threshold, min_sample_size, cooldown_hours, evaluation_window_hours, rerun_cooldown_minutes, notify_emails',
        )
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data as AlertConfig | null;
    },
  });

  const { data: history } = useQuery({
    queryKey: ['migration-alerts-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_alerts_sent')
        .select('id, sent_at, failure_rate, total_events, failed_events, threshold, recipients')
        .order('sent_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as SentAlert[];
    },
    refetchInterval: 60_000,
  });

  const { data: rerunStatus } = useQuery({
    queryKey: ['migration-rerun-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_alert_config')
        .select('migration_epoch, last_rerun_at, last_rerun_reason, rerun_cooldown_minutes')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data as RerunStatus | null;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (config && !form) {
      setForm(config);
      setEmailsText((config.notify_emails || []).join(', '));
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (payload: AlertConfig) => {
      const emails = emailsText
        .split(/[,\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      const { error } = await supabase
        .from('migration_alert_config')
        .update({ ...payload, notify_emails: emails, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      return emails;
    },
    onSuccess: (emails) => {
      toast({
        title: isRTL ? 'تم حفظ الإعدادات' : 'Settings saved',
        description: isRTL
          ? `سيتم تنبيه ${emails.length || 'جميع المشرفين'} عند تجاوز العتبة`
          : `${emails.length || 'All admins'} will be notified on threshold breach`,
      });
      qc.invalidateQueries({ queryKey: ['migration-alert-config'] });
    },
    onError: (err: any) => {
      toast({
        title: isRTL ? 'فشل الحفظ' : 'Save failed',
        description: err?.message || String(err),
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-migration-alerts', {
        body: { manual: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: isRTL ? 'تم تنفيذ الفحص' : 'Check executed',
        description: data?.alerted
          ? isRTL ? `تم إرسال تنبيه بنسبة فشل ${data.failureRate}%` : `Alert sent (failure ${data.failureRate}%)`
          : data?.skipped
            ? isRTL ? `تم التخطي: ${data.skipped}` : `Skipped: ${data.skipped}`
            : isRTL ? 'لا يوجد ما يستوجب التنبيه' : 'Nothing to alert',
      });
      qc.invalidateQueries({ queryKey: ['migration-alerts-history'] });
    },
    onError: (err: any) => {
      toast({
        title: isRTL ? 'فشل التنفيذ' : 'Run failed',
        description: err?.message || String(err),
        variant: 'destructive',
      });
    },
  });

  const rerunMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Client-side guard mirrors the server check so admins get instant feedback.
      const trimmed = reason.trim();
      if (trimmed.length < 5) {
        throw new Error(
          isRTL
            ? 'يجب إدخال سبب لا يقل عن 5 أحرف لإعادة بثّ الترحيل.'
            : 'A reason of at least 5 characters is required to broadcast a migration re-run.',
        );
      }
      const { data, error } = await supabase.rpc('bump_migration_epoch', {
        _reason: trimmed,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (newEpoch) => {
      toast({
        title: isRTL ? 'تم بثّ إعادة الترحيل' : 'Migration re-run broadcast',
        description: isRTL
          ? `النسخة الجديدة #${newEpoch} — ستُنفَّذ على كل جهاز عند تحميله القادم وسيُسجَّل حدث جديد.`
          : `New epoch #${newEpoch} — every device will re-run on next load and log a fresh event.`,
      });
      setRerunReason('');
      qc.invalidateQueries({ queryKey: ['migration-rerun-status'] });
    },
    onError: (err: any) => {
      // Server enforces a configurable cooldown; surface that explicitly so
      // admins understand they cannot bypass it.
      const msg = String(err?.message || err || '');
      const isCooldown = /cooldown/i.test(msg);
      const isReasonMissing =
        /reason/i.test(msg) && /(required|at least)/i.test(msg);
      toast({
        title: isCooldown
          ? isRTL ? 'البثّ مقفل مؤقتاً' : 'Broadcast on cooldown'
          : isReasonMissing
            ? isRTL ? 'السبب مطلوب' : 'Reason required'
          : isRTL ? 'فشل البثّ' : 'Broadcast failed',
        description: msg,
        variant: 'destructive',
      });
      // Refresh status so the UI countdown reflects server reality.
      qc.invalidateQueries({ queryKey: ['migration-rerun-status'] });
    },
  });

  // Compute cooldown gating purely from server state.
  const cooldownInfo = useMemo(() => {
    if (!rerunStatus?.last_rerun_at) {
      return { onCooldown: false, nextAllowedAt: null as Date | null, minutesRemaining: 0 };
    }
    const cooldownMin = Number(rerunStatus.rerun_cooldown_minutes ?? 60);
    const lastAt = new Date(rerunStatus.last_rerun_at).getTime();
    const nextAt = new Date(lastAt + cooldownMin * 60_000);
    const remainingMs = nextAt.getTime() - Date.now();
    return {
      onCooldown: remainingMs > 0,
      nextAllowedAt: nextAt,
      minutesRemaining: Math.max(0, Math.ceil(remainingMs / 60_000)),
    };
  }, [rerunStatus]);

  // Reason is mandatory. Mirror the server rule (≥ 5 chars after trim).
  const trimmedReasonLen = rerunReason.trim().length;
  const reasonValid = trimmedReasonLen >= 5;

  if (isLoading || !form) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <Card className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-5 w-5 text-amber-600" />
          {isRTL ? 'تنبيهات فشل ترحيل البيانات' : 'Migration failure alerts'}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side={isRTL ? 'left' : 'right'} className="max-w-xs">
              <p className="text-xs">
                {isRTL
                  ? 'يُراقب النظام نسبة فشل ترحيل البيانات من التخزين المحلي. عند تجاوز العتبة، يُرسل إشعار للمشرفين.'
                  : 'System monitors localStorage migration failure rates. When threshold is exceeded, admins are notified.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>
          {isRTL
            ? `يتم فحص نسبة الفشل تلقائياً كل ساعة. عند تجاوز العتبة خلال آخر ${form?.evaluation_window_hours ?? 6} ساعة يصلك بريد فوري.`
            : `Failure rate is checked hourly. When the ${form?.evaluation_window_hours ?? 6}h threshold is breached, an email alert is sent.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div>
            <Label className="text-sm font-medium">{isRTL ? 'تفعيل التنبيهات' : 'Enable alerts'}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'إيقاف هذا يوقف كل التنبيهات' : 'Disabling stops all alerts'}
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? 'عتبة الفشل (%)' : 'Failure threshold (%)'}</Label>
            <Input
              type="number" min={1} max={100} step={1}
              value={form.failure_rate_threshold}
              onChange={(e) => setForm({ ...form, failure_rate_threshold: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isRTL ? 'نافذة التقييم (ساعة)' : 'Evaluation window (hours)'}
            </Label>
            <Input
              type="number" min={1} max={168} step={1}
              value={form.evaluation_window_hours}
              onChange={(e) =>
                setForm({ ...form, evaluation_window_hours: Number(e.target.value) })
              }
            />
            <p className="text-[11px] text-muted-foreground">
              {isRTL
                ? 'حساب النسبة عبر آخر N ساعة. الافتراضي: 6.'
                : 'Computes failure rate over the last N hours. Default: 6.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? 'الحد الأدنى للسجلات' : 'Min sample size'}</Label>
            <Input
              type="number" min={1} max={10000} step={1}
              value={form.min_sample_size}
              onChange={(e) => setForm({ ...form, min_sample_size: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? 'فترة التهدئة (ساعة)' : 'Cooldown (hours)'}</Label>
            <Input
              type="number" min={1} max={168} step={1}
              value={form.cooldown_hours}
              onChange={(e) => setForm({ ...form, cooldown_hours: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isRTL ? 'تهدئة إعادة البثّ (دقيقة)' : 'Re-run cooldown (min)'}
            </Label>
            <Input
              type="number" min={1} max={10080} step={1}
              value={form.rerun_cooldown_minutes}
              onChange={(e) =>
                setForm({ ...form, rerun_cooldown_minutes: Number(e.target.value) })
              }
            />
            <p className="text-[11px] text-muted-foreground">
              {isRTL
                ? 'أقل فاصل بين أي بثّين متتاليين. الافتراضي: 60.'
                : 'Minimum gap between two broadcasts. Default: 60.'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {isRTL ? 'بريد المستلمين (افصل بفواصل، اتركه فارغاً لكل المشرفين)' : 'Recipient emails (comma-separated, leave empty for all admins)'}
          </Label>
          <Input
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            placeholder="admin@qitaat.com, ops@qitaat.com"
            dir="ltr"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 me-2" />
            {isRTL ? 'حفظ الإعدادات' : 'Save settings'}
          </Button>
          <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
            <Send className="h-4 w-4 me-2" />
            {isRTL ? 'تشغيل الفحص الآن' : 'Run check now'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={rerunMutation.isPending || cooldownInfo.onCooldown}
                    title={
                      cooldownInfo.onCooldown && cooldownInfo.nextAllowedAt
                        ? (isRTL
                            ? `متاح بعد ${cooldownInfo.minutesRemaining} دقيقة`
                            : `Available in ${cooldownInfo.minutesRemaining} min`)
                        : undefined
                    }
                  >
                    <RefreshCw className={`h-4 w-4 me-2 ${rerunMutation.isPending ? 'animate-spin' : ''}`} />
                    {cooldownInfo.onCooldown
                      ? isRTL
                        ? `بثّ مقفل (${cooldownInfo.minutesRemaining}د)`
                        : `Locked (${cooldownInfo.minutesRemaining}m)`
                      : isRTL ? 'إعادة بث الترحيل' : 'Re-run migration'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="text-xs font-medium">{isRTL ? 'ما هو إعادة البثّ؟' : 'What is re-run broadcast?'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isRTL
                        ? 'ترفع رقم النسخة (Epoch) لجميع المستخدمين، فيُعيد كل جهاز ترحيل بياناته تلقائياً. يُستخدم لتنظيف البيانات القديمة أو إصلاح مشاكل بعد تحديث.'
                        : 'Bumps the version number (Epoch) for all users, causing every device to re-migrate its data automatically. Used to clean stale data or fix issues after updates.'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </AlertDialogTrigger>
            <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isRTL ? 'إعادة تشغيل ترحيل localStorage على كل المستخدمين؟' : 'Re-run localStorage migration for all users?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isRTL
                    ? 'سيتم رفع رقم نسخة الترحيل، وعند تحميل أي جهاز للموقع التالي سيُعيد تنفيذ منطق الترحيل ويُسجَّل حدث جديد في تقرير الترحيل لهذا الجهاز. لا يُفقد أي بيانات للمستخدم.'
                    : 'This bumps the migration epoch. Every device will re-execute the migration on its next page load and log a fresh telemetry event. No user data is lost.'}
                  {rerunStatus?.last_rerun_at && (
                    <div className="mt-2 text-xs">
                      {isRTL ? 'النسخة الحالية: ' : 'Current epoch: '}
                      <strong>#{rerunStatus.migration_epoch}</strong> · {isRTL ? 'آخر بثّ: ' : 'Last broadcast: '}
                      {format(new Date(rerunStatus.last_rerun_at), 'yyyy-MM-dd HH:mm')}
                    </div>
                  )}
                  {cooldownInfo.onCooldown && cooldownInfo.nextAllowedAt && (
                    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      {isRTL
                        ? `⏳ البثّ مقفل بسبب فترة التهدئة (${rerunStatus?.rerun_cooldown_minutes ?? 60} دقيقة). متاح مجدداً في ${format(cooldownInfo.nextAllowedAt, 'yyyy-MM-dd HH:mm')} (~${cooldownInfo.minutesRemaining} دقيقة).`
                        : `⏳ Broadcast is locked by the cooldown window (${rerunStatus?.rerun_cooldown_minutes ?? 60} min). Next allowed at ${format(cooldownInfo.nextAllowedAt, 'yyyy-MM-dd HH:mm')} (~${cooldownInfo.minutesRemaining} min).`}
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {isRTL ? 'سبب إعادة التشغيل ' : 'Reason '}
                  <span className="text-destructive">*</span>
                  <span className="ms-1 text-muted-foreground font-normal">
                    ({isRTL ? 'إلزامي' : 'required'})
                  </span>
                </Label>
                <Textarea
                  rows={2}
                  value={rerunReason}
                  onChange={(e) => setRerunReason(e.target.value.slice(0, 500))}
                  placeholder={isRTL ? 'مثال: تنظيف بقايا قديمة بعد تحديث' : 'e.g. clean stale residue after release'}
                  aria-invalid={!reasonValid}
                  className={!reasonValid && trimmedReasonLen > 0 ? 'border-destructive focus-visible:ring-destructive' : undefined}
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span className={!reasonValid ? 'text-destructive' : 'text-muted-foreground'}>
                    {isRTL
                      ? 'يلزم 5 أحرف على الأقل. سيُحفظ هذا السبب مع حدث كل جهاز يُعيد الترحيل.'
                      : 'At least 5 characters required. This reason will be stamped on every device\'s telemetry event.'}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{trimmedReasonLen}/500</span>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => rerunMutation.mutate(rerunReason)}
                  disabled={cooldownInfo.onCooldown || !reasonValid}
                >
                  {isRTL ? 'تأكيد البثّ' : 'Confirm broadcast'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {history && history.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <History className="h-4 w-4" />
              {isRTL ? 'آخر تنبيهات أُرسلت' : 'Recent alerts sent'}
            </div>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-md border bg-background p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-medium">{Number(h.failure_rate).toFixed(1)}%</span>
                    <span className="text-muted-foreground">
                      ({h.failed_events}/{h.total_events})
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {h.recipients.length} {isRTL ? 'مستلم' : 'recipient(s)'}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground tabular-nums" dir="ltr">
                    {format(new Date(h.sent_at), 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
