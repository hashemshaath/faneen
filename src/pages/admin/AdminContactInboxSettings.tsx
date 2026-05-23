import React, { useEffect, useState } from 'react';
import { DashboardLayout as RealDashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAdminEmbedded } from '@/contexts/AdminTabsContext';
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const embedded = useAdminEmbedded();
  return embedded ? <>{children}</> : <RealDashboardLayout>{children}</RealDashboardLayout>;
};
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { runWeeklySlaReport, testContactWebhook } from '@/modules/contact';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, Send, Bell, Webhook, Clock, Mail, Plus, X } from 'lucide-react';
import { PlayCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';

type Settings = {
  stale_hours: number;
  target_response_hours: number;
  target_resolution_hours: number;
  notify_email_on_assign: boolean;
  notify_email_on_status_change: boolean;
  notify_email_on_priority_change: boolean;
  notify_webhook_on_assign: boolean;
  notify_webhook_on_status_change: boolean;
  notify_webhook_on_priority_change: boolean;
  webhook_url: string | null;
  webhook_secret: string | null;
  role_subscriptions: Record<string, string[]>;
  weekly_report_recipients: string[];
  max_notification_attempts: number;
  retry_backoff_seconds: number;
  alert_on_max_retries: boolean;
  alert_recipients: string[];
};

const ROLES = ['super_admin', 'admin', 'moderator'] as const;
const EVENT_TYPES = ['assignee_changed', 'status_changed', 'priority_changed', 'ai_triaged'] as const;

const EVENT_LABELS: Record<string, { ar: string; en: string }> = {
  assignee_changed: { ar: 'تغيير المسؤول', en: 'Assignee changed' },
  status_changed:   { ar: 'تغيير الحالة', en: 'Status changed' },
  priority_changed: { ar: 'تغيير الأولوية', en: 'Priority changed' },
  ai_triaged:       { ar: 'فرز ذكي', en: 'AI triaged' },
};

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  super_admin: { ar: 'مدير أعلى', en: 'Super admin' },
  admin:       { ar: 'مشرف', en: 'Admin' },
  moderator:   { ar: 'مشرف فرعي', en: 'Moderator' },
};

export default function AdminContactInboxSettings() {
  useNoIndex();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);
  const [newRecipient, setNewRecipient] = useState('');
  const [newAlertRecipient, setNewAlertRecipient] = useState('');
  const [testResult, setTestResult] = useState<{
    ok: boolean; url?: string; payload?: unknown; http_status?: number | null;
    response_body?: string; error?: string | null; duration_ms?: number;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contact-inbox-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (n: string) => Promise<{ data: Settings | null; error: Error | null }>)('get_contact_inbox_settings');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        alert_recipients: data.alert_recipients ?? [],
        max_notification_attempts: data.max_notification_attempts ?? 5,
        retry_backoff_seconds: data.retry_backoff_seconds ?? 60,
        alert_on_max_retries: data.alert_on_max_retries ?? true,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await (supabase.rpc as unknown as (n: string, a: unknown) => Promise<{ error: Error | null }>)(
        'update_contact_inbox_settings', { _patch: patch },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['contact-inbox-settings'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const sendTestReport = useMutation({
    mutationFn: async () => {
      const { error } = await runWeeklySlaReport();
      if (error) throw error;
    },
    onSuccess: () => toast.success(isRTL ? 'تم إرسال تقرير تجريبي' : 'Test report sent'),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (isLoading || !form) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((p) => (p ? { ...p, [key]: value } : p));

  const toggleRoleEvent = (role: string, evt: string) => {
    const current = form.role_subscriptions[role] ?? [];
    const next = current.includes(evt) ? current.filter((e) => e !== evt) : [...current, evt];
    update('role_subscriptions', { ...form.role_subscriptions, [role]: next });
  };

  const addRecipient = () => {
    const e = newRecipient.trim();
    if (!/\S+@\S+\.\S+/.test(e)) { toast.error(isRTL ? 'بريد غير صالح' : 'Invalid email'); return; }
    if (form.weekly_report_recipients.includes(e)) return;
    update('weekly_report_recipients', [...form.weekly_report_recipients, e]);
    setNewRecipient('');
  };

  const removeRecipient = (e: string) =>
    update('weekly_report_recipients', form.weekly_report_recipients.filter((x) => x !== e));

  const addAlertRecipient = () => {
    const e = newAlertRecipient.trim();
    if (!/\S+@\S+\.\S+/.test(e)) { toast.error(isRTL ? 'بريد غير صالح' : 'Invalid email'); return; }
    if (form.alert_recipients.includes(e)) return;
    update('alert_recipients', [...form.alert_recipients, e]);
    setNewAlertRecipient('');
  };
  const removeAlertRecipient = (e: string) =>
    update('alert_recipients', form.alert_recipients.filter((x) => x !== e));

  const runWebhookTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await testContactWebhook({
        override_url: form.webhook_url,
        override_secret: form.webhook_secret,
      });
      if (error) throw error;
      setTestResult(data as typeof testResult);
      const result = data as { ok: boolean };
      if (result?.ok) toast.success(isRTL ? 'نجح الاختبار' : 'Test succeeded');
      else toast.error(isRTL ? 'فشل الاختبار — راجع التفاصيل' : 'Test failed — see details');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? 'إعدادات صندوق الرسائل' : 'Contact Inbox Settings'}</h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'عتبات SLA والإشعارات والاشتراك حسب الدور' : 'SLA thresholds, notifications, role subscriptions'}
            </p>
          </div>
          <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="h-12 rounded-xl">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
            {isRTL ? 'حفظ كل التغييرات' : 'Save all changes'}
          </Button>
        </div>

        {/* SLA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />
              {isRTL ? 'عتبات SLA' : 'SLA thresholds'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'متأخرة بعد (ساعة)' : 'Stale after (hours)'}</Label>
              <Input type="number" min={1} max={720} className="h-12 rounded-xl tech-content"
                value={form.stale_hours}
                onChange={(e) => update('stale_hours', Number(e.target.value) || 1)} />
              <p className="text-xs text-muted-foreground">{isRTL ? 'تظهر كرسائل متأخرة في التقرير' : 'Marked stale in reports'}</p>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'هدف الرد (ساعة)' : 'Target response (hours)'}</Label>
              <Input type="number" min={1} max={720} className="h-12 rounded-xl tech-content"
                value={form.target_response_hours}
                onChange={(e) => update('target_response_hours', Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'هدف الإغلاق (ساعة)' : 'Target resolution (hours)'}</Label>
              <Input type="number" min={1} max={2160} className="h-12 rounded-xl tech-content"
                value={form.target_resolution_hours}
                onChange={(e) => update('target_resolution_hours', Number(e.target.value) || 1)} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />
              {isRTL ? 'قنوات الإشعارات' : 'Notification channels'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['assign', 'status_change', 'priority_change'] as const).map((evt) => {
              const emailKey = `notify_email_on_${evt}` as keyof Settings;
              const webhookKey = `notify_webhook_on_${evt}` as keyof Settings;
              const labels: Record<string, { ar: string; en: string }> = {
                assign:          { ar: 'عند التعيين', en: 'On assignment' },
                status_change:   { ar: 'عند تغيير الحالة', en: 'On status change' },
                priority_change: { ar: 'عند تغيير الأولوية', en: 'On priority change' },
              };
              return (
                <div key={evt} className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-muted/40">
                  <div className="font-medium">{isRTL ? labels[evt].ar : labels[evt].en}</div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" /> Email
                      <Switch checked={form[emailKey] as boolean}
                        onCheckedChange={(v) => update(emailKey, v as Settings[typeof emailKey])} />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Webhook className="w-4 h-4 text-muted-foreground" /> Webhook
                      <Switch checked={form[webhookKey] as boolean}
                        onCheckedChange={(v) => update(webhookKey, v as Settings[typeof webhookKey])} />
                    </label>
                  </div>
                </div>
              );
            })}

            <Separator />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input className="h-12 rounded-xl tech-content" placeholder="https://hooks.example.com/..."
                  value={form.webhook_url ?? ''}
                  onChange={(e) => update('webhook_url', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret (X-Qitaat-Signature)</Label>
                <Input type="password" className="h-12 rounded-xl tech-content" placeholder="••••••"
                  value={form.webhook_secret ?? ''}
                  onChange={(e) => update('webhook_secret', e.target.value || null)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role subscriptions matrix */}
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? 'الاشتراك حسب الدور' : 'Role subscriptions'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start p-2">{isRTL ? 'الدور' : 'Role'}</th>
                    {EVENT_TYPES.map((e) => (
                      <th key={e} className="p-2 text-center font-normal">
                        {isRTL ? EVENT_LABELS[e].ar : EVENT_LABELS[e].en}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role} className="border-b last:border-0">
                      <td className="p-2 font-medium">{isRTL ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}</td>
                      {EVENT_TYPES.map((evt) => (
                        <td key={evt} className="p-2 text-center">
                          <Switch
                            checked={(form.role_subscriptions[role] ?? []).includes(evt)}
                            onCheckedChange={() => toggleRoleEvent(role, evt)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Weekly report recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{isRTL ? 'مستلمو تقرير SLA الأسبوعي' : 'Weekly SLA report recipients'}</span>
              <Button size="sm" variant="outline" className="rounded-lg"
                onClick={() => sendTestReport.mutate()} disabled={sendTestReport.isPending}>
                {sendTestReport.isPending ? <Loader2 className="w-3 h-3 animate-spin me-2" /> : <Send className="w-3 h-3 me-2" />}
                {isRTL ? 'إرسال تقرير الآن' : 'Send report now'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input dir="auto" placeholder="name@example.com" value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                className="h-12 rounded-xl tech-content" />
              <Button onClick={addRecipient} className="h-12 rounded-xl"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.weekly_report_recipients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'لا يوجد مستلمون — سيُستخدم البريد الافتراضي للإدارة' : 'No recipients — default admin email used'}
                </p>
              )}
              {form.weekly_report_recipients.map((e) => (
                <Badge key={e} variant="secondary" className="rounded-lg gap-1 pe-1">
                  <span className="tech-content">{e}</span>
                  <button onClick={() => removeRecipient(e)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Retry & alerting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" />
              {isRTL ? 'إعادة المحاولة والتنبيهات' : 'Retries & alerting'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'الحد الأقصى للمحاولات' : 'Max attempts'}</Label>
                <Input type="number" min={1} max={20} className="h-12 rounded-xl tech-content"
                  value={form.max_notification_attempts}
                  onChange={(e) => update('max_notification_attempts', Number(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'فاصل إعادة المحاولة (ثانية)' : 'Retry backoff (seconds)'}</Label>
                <Input type="number" min={10} max={3600} className="h-12 rounded-xl tech-content"
                  value={form.retry_backoff_seconds}
                  onChange={(e) => update('retry_backoff_seconds', Number(e.target.value) || 10)} />
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'يتضاعف الفاصل أسياً مع كل محاولة' : 'Doubles exponentially per attempt'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" />
                  {isRTL ? 'تنبيه عند بلوغ الحد' : 'Alert at max retries'}
                </Label>
                <div className="h-12 flex items-center">
                  <Switch checked={form.alert_on_max_retries}
                    onCheckedChange={(v) => update('alert_on_max_retries', v)} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>{isRTL ? 'مستلمو تنبيهات الفشل' : 'Failure alert recipients'}</Label>
              <div className="flex gap-2">
                <Input dir="auto" placeholder="ops@example.com" value={newAlertRecipient}
                  onChange={(e) => setNewAlertRecipient(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAlertRecipient())}
                  className="h-12 rounded-xl tech-content" />
                <Button onClick={addAlertRecipient} className="h-12 rounded-xl"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.alert_recipients.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'لا يوجد مستلمون — سيستخدم البريد الإداري الافتراضي' : 'No recipients — admin email used'}
                  </p>
                )}
                {form.alert_recipients.map((e) => (
                  <Badge key={e} variant="secondary" className="rounded-lg gap-1 pe-1">
                    <span className="tech-content">{e}</span>
                    <button onClick={() => removeAlertRecipient(e)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2"><PlayCircle className="w-5 h-5" />
                {isRTL ? 'اختبار Webhook' : 'Test webhook'}
              </span>
              <Button size="sm" onClick={runWebhookTest} disabled={testing || !form.webhook_url} className="rounded-lg">
                {testing ? <Loader2 className="w-3 h-3 animate-spin me-2" /> : <PlayCircle className="w-3 h-3 me-2" />}
                {isRTL ? 'إرسال إشعار تجريبي' : 'Send test notification'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!form.webhook_url && (
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'أدخل Webhook URL أعلاه أولاً' : 'Set a Webhook URL above first'}
              </p>
            )}
            {testResult && (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl flex items-center gap-3 flex-wrap ${
                  testResult.ok ? 'bg-success text-success' : 'bg-destructive text-destructive'
                }`}>
                  <Badge className={testResult.ok ? 'bg-success' : 'bg-destructive'}>
                    {testResult.ok ? (isRTL ? 'نجح' : 'OK') : (isRTL ? 'فشل' : 'FAILED')}
                  </Badge>
                  {testResult.http_status != null && (
                    <span className="text-sm tech-content">HTTP {testResult.http_status}</span>
                  )}
                  {testResult.duration_ms != null && (
                    <span className="text-xs text-muted-foreground tech-content">{testResult.duration_ms} ms</span>
                  )}
                  {testResult.error && (
                    <span className="text-xs tech-content" dir="ltr">{testResult.error}</span>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium mb-1 text-muted-foreground">Payload sent</div>
                    <pre className="text-[11px] bg-muted/50 p-3 rounded-lg max-h-64 overflow-auto tech-content" dir="ltr">
{JSON.stringify(testResult.payload, null, 2)}</pre>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1 text-muted-foreground">Response body</div>
                    <pre className="text-[11px] bg-muted/50 p-3 rounded-lg max-h-64 overflow-auto tech-content whitespace-pre-wrap break-all" dir="ltr">
{testResult.response_body || (isRTL ? '(فارغ)' : '(empty)')}</pre>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}