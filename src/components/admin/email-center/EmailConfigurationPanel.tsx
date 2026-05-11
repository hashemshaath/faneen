import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { Mail, Shield, Send, CheckCircle2 } from 'lucide-react';

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="text-sm tech-content">{value}</div>
  </div>
);

export const EmailConfigurationPanel: React.FC = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="size-4" />{isRTL ? 'مزود الخدمة' : 'Provider'}</CardTitle></CardHeader>
        <CardContent>
          <Row label={isRTL ? 'مزود البريد' : 'Provider'} value={<Badge variant="outline">Lovable Cloud Email</Badge>} />
          <Row label={isRTL ? 'النطاق الموثّق' : 'Verified sender domain'} value={<Badge variant="outline" className="text-success border-success/30 bg-success/10"><CheckCircle2 className="size-3 me-1" />e.qitaat.com</Badge>} />
          <Row label="FROM_DOMAIN" value="qitaat.com" />
          <Row label={isRTL ? 'النطاق الجذر' : 'Root domain'} value="qitaat.com" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="size-4" />{isRTL ? 'النطاقات حسب الدالة' : 'Sender domains by function'}</CardTitle></CardHeader>
        <CardContent>
          <Row label="send-transactional-email" value="e.qitaat.com" />
          <Row label="auth-email-hook" value="e.qitaat.com" />
          <Row label="process-email-queue" value={<span className="text-muted-foreground">payload.sender_domain</span>} />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="size-4" />{isRTL ? 'الدوال المنشورة' : 'Deployed edge functions'}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            'send-transactional-email',
            'auth-email-hook',
            'process-email-queue',
            'preview-transactional-email',
            'handle-email-suppression',
            'handle-email-unsubscribe',
            'email-track-open',
            'email-track-click',
          ].map((fn) => (
            <div key={fn} className="flex items-center gap-2 border rounded-lg p-2">
              <CheckCircle2 className="size-4 text-success shrink-0" />
              <span className="tech-content truncate">{fn}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="md:col-span-2 text-xs text-muted-foreground">{isRTL ? 'العرض للقراءة فقط في هذا الإصدار. أي تغيير على النطاق يجب أن يتم عبر إعداد بريد Lovable Cloud.' : 'Read-only in this release. Domain changes go through Lovable Cloud Email setup.'}</p>
    </div>
  );
};