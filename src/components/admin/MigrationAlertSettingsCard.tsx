import { useEffect, useState } from 'react';
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
import { BellRing, Mail, AlertTriangle, Save, Send, History, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface AlertConfig {
  enabled: boolean;
  failure_rate_threshold: number;
  min_sample_size: number;
  cooldown_hours: number;
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

export function MigrationAlertSettingsCard() {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<AlertConfig | null>(null);
  const [emailsText, setEmailsText] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['migration-alert-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_alert_config')
        .select('enabled, failure_rate_threshold, min_sample_size, cooldown_hours, notify_emails')
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

  if (isLoading || !form) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-5 w-5 text-amber-600" />
          {isRTL ? 'تنبيهات فشل ترحيل البيانات' : 'Migration failure alerts'}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? 'يتم فحص نسبة الفشل تلقائياً كل ساعة. عند تجاوز العتبة خلال آخر 24 ساعة يصلك بريد فوري.'
            : 'Failure rate is checked hourly. When the 24h threshold is breached, an email alert is sent.'}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? 'عتبة الفشل (%)' : 'Failure threshold (%)'}</Label>
            <Input
              type="number" min={1} max={100} step={1}
              value={form.failure_rate_threshold}
              onChange={(e) => setForm({ ...form, failure_rate_threshold: Number(e.target.value) })}
            />
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
  );
}
