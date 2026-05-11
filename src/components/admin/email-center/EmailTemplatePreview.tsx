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
import { toast } from 'sonner';
import { Send, Smartphone, Monitor, AlertTriangle, X } from 'lucide-react';
import { CATEGORY_LABELS, RECIPIENT_LABELS, type EmailTemplateMeta } from '@/lib/email-center/email-template-catalog';

interface Props {
  template: EmailTemplateMeta;
  onClose: () => void;
}

export const EmailTemplatePreview: React.FC<Props> = ({ template, onClose }) => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState(user?.email ?? '');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const isAuth = template.kind === 'auth';

  const handleTestSend = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error(isRTL ? 'بريد غير صالح' : 'Invalid email');
      return;
    }
    setSending(true);
    try {
      const idempotencyKey = `admin-test-${template.name}-${Date.now()}`;
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: template.name,
          recipientEmail: testEmail,
          idempotencyKey,
          templateData: { __test_send: true, __prefix: '[اختبار قِطاعات]' },
        },
      });
      if (error) throw error;
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

        <div>
          <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'مثال على الحمولة' : 'Sample payload'}</p>
          <pre dir="ltr" className="text-[11px] bg-muted/40 rounded-lg p-3 overflow-auto max-h-40 tech-content">
{JSON.stringify(
  Object.fromEntries(template.variables.map((v) => [v, `<sample ${v}>`])),
  null, 2,
)}
          </pre>
        </div>

        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            {isRTL
              ? 'المعاينة المرئية الكاملة (HTML) غير متاحة في هذه الواجهة لأن دالة المعاينة محمية بمفتاح Lovable Cloud. تظهر هنا البيانات الوصفية والمتغيرات فقط.'
              : 'Full HTML preview is not exposed here because the preview function is gated by the Lovable Cloud key. Showing metadata and variables only.'}
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-end gap-1 opacity-50">
          <Button size="sm" variant={device === 'desktop' ? 'default' : 'ghost'} disabled className="gap-1">
            <Monitor className="size-3.5" /> Desktop
          </Button>
          <Button size="sm" variant={device === 'mobile' ? 'default' : 'ghost'} disabled className="gap-1">
            <Smartphone className="size-3.5" /> Mobile
          </Button>
        </div>

        {!isAuth && (
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm">{isRTL ? 'إرسال اختبار آمن' : 'Safe test send'}</Label>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'يُرسَل بصيغة [اختبار قِطاعات] لعنوانك أو لبريد تدخله يدوياً.' : 'Sent with [اختبار قِطاعات] flag to your email or one you enter manually.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input dir="ltr" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="admin@qitaat.com" className="h-11 tech-content" />
              {!confirming ? (
                <Button onClick={() => setConfirming(true)} className="gap-2"><Send className="size-4" /> {isRTL ? 'إرسال اختبار' : 'Send test'}</Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="destructive" onClick={handleTestSend} disabled={sending}>
                    {sending ? '…' : (isRTL ? 'تأكيد' : 'Confirm')}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)} disabled={sending}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};