import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sendTransactionalEmail } from '@/modules/notifications';
import { toast } from 'sonner';
import { Send, Smartphone, Monitor, AlertTriangle, X, RefreshCw, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_LABELS, RECIPIENT_LABELS, type EmailTemplateMeta } from '@/lib/email-center/email-template-catalog';
import { maskRecipient } from '@/lib/email-center/email-log-utils';

interface Props {
  template: EmailTemplateMeta;
  onClose: () => void;
}

interface PreviewResponse {
  templateName: string;
  displayName: string;
  subject: string;
  html: string;
  sampleData: Record<string, unknown>;
  status: 'ready' | 'render_failed';
  message?: string;
}

interface LogRow {
  id: string;
  status: string;
  template_name: string | null;
  recipient_email: string | null;
  error_message: string | null;
  created_at: string;
}

export const EmailTemplatePreview: React.FC<Props> = ({ template, onClose }) => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState(user?.email ?? '');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSendId, setLastSendId] = useState<string | null>(null);

  const isAuth = template.kind === 'auth';

  const preview = useQuery({
    queryKey: ['admin-preview-email', template.name],
    enabled: !isAuth,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<PreviewResponse> => {
      const { data, error } = await supabase.functions.invoke<PreviewResponse>(
        'admin-preview-email',
        { body: { templateName: template.name } },
      );
      if (error) throw error;
      if (!data) throw new Error('empty_response');
      return data;
    },
  });

  const lastLog = useQuery({
    queryKey: ['admin-preview-email-log', lastSendId],
    enabled: !!lastSendId,
    refetchInterval: lastSendId ? 3000 : false,
    queryFn: async (): Promise<LogRow[]> => {
      if (!lastSendId) return [];
      const { data } = await supabase
        .from('email_send_log')
        .select('id, status, template_name, recipient_email, error_message, created_at')
        .eq('message_id', lastSendId)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as LogRow[];
    },
  });

  const handleTestSend = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error(isRTL ? 'بريد غير صالح' : 'Invalid email');
      return;
    }
    setSending(true);
    try {
      const idempotencyKey = `email-center-test-${template.name}-${Date.now()}`;
      const { error } = await sendTransactionalEmail({
        templateName: template.name,
        recipientEmail: testEmail,
        idempotencyKey,
        templateData: {
          ...(preview.data?.sampleData ?? {}),
          __test_send: true,
          __prefix: '[اختبار قِطاعات]',
        },
      });
      if (error) throw error;
      setLastSendId(idempotencyKey);
      toast.success(isRTL ? 'تم وضع اختبار الإرسال في الطابور' : 'Test send queued');
      setConfirming(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل الإرسال' : 'Send failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">{isRTL ? template.displayNameAr : template.displayNameEn}</CardTitle>
          <p className="text-xs text-muted-foreground tech-content mt-1">{template.name}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{isRTL ? CATEGORY_LABELS[template.category].ar : CATEGORY_LABELS[template.category].en}</Badge>
          <Badge variant="outline">{isRTL ? RECIPIENT_LABELS[template.recipient].ar : RECIPIENT_LABELS[template.recipient].en}</Badge>
          <Badge variant="outline" className="capitalize">{template.kind}</Badge>
          <Badge variant={template.active ? 'default' : 'secondary'}>
            {template.active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'الوصف' : 'Description'}</p>
            <p>{isRTL ? template.descriptionAr : template.descriptionEn}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'مصدر التحفيز' : 'Trigger source'}</p>
            <p className="tech-content">{template.trigger}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">{isRTL ? 'المتغيرات المطلوبة' : 'Required variables'}</p>
          <div className="flex flex-wrap gap-1">
            {template.variables.length === 0
              ? <span className="text-xs text-muted-foreground">—</span>
              : template.variables.map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs tech-content">{`{{${v}}}`}</Badge>
                ))}
          </div>
        </div>

        {!isAuth && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground min-w-0 truncate">
                {isRTL ? 'الموضوع' : 'Subject'}:{' '}
                <span className="text-foreground font-medium">
                  {preview.isLoading ? '…' : preview.data?.subject ?? '—'}
                </span>
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant={device === 'desktop' ? 'default' : 'ghost'} onClick={() => setDevice('desktop')} className="gap-1 h-8">
                  <Monitor className="size-3.5" />
                </Button>
                <Button size="sm" variant={device === 'mobile' ? 'default' : 'ghost'} onClick={() => setDevice('mobile')} className="gap-1 h-8">
                  <Smartphone className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => preview.refetch()} disabled={preview.isFetching} className="h-8">
                  {preview.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-2 overflow-auto">
              {preview.isLoading ? (
                <div className="h-64 grid place-items-center text-muted-foreground text-sm">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : preview.isError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">
                    {isRTL
                      ? 'تعذّر تحميل المعاينة. تأكد من صلاحيات المشرف ومن نشر دالة admin-preview-email.'
                      : 'Failed to load preview. Check admin role and that admin-preview-email is deployed.'}
                  </AlertDescription>
                </Alert>
              ) : preview.data?.status === 'render_failed' ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs tech-content" dir="ltr">
                    {preview.data.message ?? 'Render failed'}
                  </AlertDescription>
                </Alert>
              ) : (
                <iframe
                  title={`preview-${template.name}`}
                  srcDoc={preview.data?.html ?? ''}
                  sandbox=""
                  className={`bg-white rounded-lg w-full transition-all ${device === 'mobile' ? 'max-w-[390px] mx-auto h-[640px]' : 'h-[560px]'}`}
                />
              )}
            </div>

            {preview.data?.sampleData && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {isRTL ? 'بيانات العينة (آمنة)' : 'Sample payload (safe)'}
                </summary>
                <pre dir="ltr" className="mt-2 text-[11px] bg-muted/40 rounded-lg p-3 overflow-auto max-h-40 tech-content">
                  {JSON.stringify(preview.data.sampleData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {isAuth && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              {isRTL
                ? 'قوالب المصادقة (auth) تُولَّد عبر Supabase Auth — المعاينة المرئية والإرسال الاختباري غير متاحَيْن من هذه الواجهة.'
                : 'Auth templates are rendered by Supabase Auth — visual preview and test send are not available here.'}
            </AlertDescription>
          </Alert>
        )}

        {!isAuth && (
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm">{isRTL ? 'إرسال اختبار آمن' : 'Safe test send'}</Label>
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {isRTL
                  ? 'سيتم إرسال بريد اختباري فقط، ولن يتم إرساله إلى العملاء أو المزودين.'
                  : 'A test email will be sent only — never to real customers or providers.'}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input dir="ltr" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="admin@qitaat.com" className="h-11 tech-content" />
              {!confirming ? (
                <Button onClick={() => setConfirming(true)} disabled={!testEmail} className="gap-2">
                  <Send className="size-4" /> {isRTL ? 'إرسال اختبار' : 'Send test'}
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="destructive" onClick={handleTestSend} disabled={sending}>
                    {sending ? <Loader2 className="size-4 animate-spin" /> : (isRTL ? 'تأكيد' : 'Confirm')}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)} disabled={sending}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              )}
            </div>

            {lastSendId && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{isRTL ? 'آخر إرسال اختباري' : 'Last test send'}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => lastLog.refetch()}>
                    <RefreshCw className="size-3" />
                  </Button>
                </div>
                <p className="tech-content text-[11px] text-muted-foreground" dir="ltr">{lastSendId}</p>
                {(lastLog.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground">{isRTL ? 'بانتظار ظهور السجل…' : 'Waiting for log row…'}</p>
                ) : (
                  <ul className="space-y-1">
                    {(lastLog.data ?? []).map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-2">
                        <Badge variant={row.status === 'sent' ? 'default' : row.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">
                          {row.status}
                        </Badge>
                        <span className="tech-content text-[11px] text-muted-foreground" dir="ltr">
                          {maskRecipient(row.recipient_email, false)}
                        </span>
                        <span className="tech-content text-[11px] text-muted-foreground" dir="ltr">
                          {new Date(row.created_at).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
