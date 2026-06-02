import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Mail, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink,
  Send, Loader2, ShieldCheck, Globe2, KeyRound,
} from 'lucide-react';

interface ResendDomain {
  id: string;
  name: string;
  status: string;
  region?: string;
}
interface ResendStatus {
  configured: boolean;
  connected: boolean;
  restricted?: boolean;
  note?: string;
  error?: string;
  domains?: ResendDomain[];
  checkedAt: string;
  keyMasked?: string;
  testSend?: { ok: boolean; status: number; response: unknown };
}

/**
 * Hero card for the Resend email-provider integration on the Admin API
 * Settings page. Shows live connection status, verified domains, masked
 * key preview, and a one-click test-send.
 */
export function ResendIntegrationCard() {
  const { isRTL } = useLanguage();
  const [testEmail, setTestEmail] = useState('');

  const statusQuery = useQuery({
    queryKey: ['resend-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ResendStatus>(
        'resend-status',
        { body: {} },
      );
      if (error) throw error;
      return data as ResendStatus;
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const testMutation = useMutation({
    mutationFn: async (to: string) => {
      const { data, error } = await supabase.functions.invoke<ResendStatus>(
        'resend-status',
        { body: { action: 'test', to } },
      );
      if (error) throw error;
      return data as ResendStatus;
    },
    onSuccess: (d) => {
      if (d?.testSend?.ok) toast.success(isRTL ? 'تم إرسال البريد الاختباري بنجاح' : 'Test email sent successfully');
      else toast.error(isRTL ? 'فشل إرسال البريد الاختباري' : 'Test email failed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = statusQuery.data;
  const loading = statusQuery.isLoading;

  const state: 'connected' | 'error' | 'missing' | 'loading' =
    loading ? 'loading'
    : !s?.configured ? 'missing'
    : s.connected ? 'connected'
    : 'error';

  const stateStyles = {
    connected: { bg: 'from-success/15 to-success/5', ring: 'ring-success/30', icon: CheckCircle2, iconCls: 'text-success' },
    error:     { bg: 'from-destructive/15 to-destructive/5', ring: 'ring-destructive/30', icon: XCircle, iconCls: 'text-destructive' },
    missing:   { bg: 'from-warning/15 to-warning/5', ring: 'ring-warning/30', icon: AlertTriangle, iconCls: 'text-warning' },
    loading:   { bg: 'from-muted/30 to-muted/10', ring: 'ring-border/30', icon: Loader2, iconCls: 'text-muted-foreground animate-spin' },
  }[state];

  const StateIcon = stateStyles.icon;

  return (
    <Card className={`border-border/40 overflow-hidden ring-1 ${stateStyles.ring}`}>
      <div className={`bg-gradient-to-br ${stateStyles.bg} px-5 py-4 border-b border-border/30`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-background/70 backdrop-blur-sm flex items-center justify-center shadow-sm shrink-0">
              <Mail className="w-6 h-6 text-foreground/80" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-base">
                  {isRTL ? 'مزود البريد — Resend' : 'Email Provider — Resend'}
                </h3>
                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-[18px]">
                  <ShieldCheck className="w-2.5 h-2.5" />{isRTL ? 'ترانزكشنال' : 'Transactional'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
                {isRTL
                  ? 'إرسال بريد المعاملات (تأكيدات، فواتير، عروض) عبر Resend مع توقيع نطاقك. المفتاح يُخزَّن بأمان كسر منصة.'
                  : 'Send transactional email (confirmations, invoices, quotes) through Resend with your domain. Key is stored securely as a platform secret.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`gap-1 border-0 ${
              state === 'connected' ? 'bg-success/15 text-success'
              : state === 'error' ? 'bg-destructive/15 text-destructive'
              : state === 'missing' ? 'bg-warning/15 text-warning'
              : 'bg-muted text-muted-foreground'
            }`}>
              <StateIcon className={`w-3 h-3 ${state === 'loading' ? 'animate-spin' : ''}`} />
              {state === 'connected' && (isRTL ? 'متصل' : 'Connected')}
              {state === 'error' && (isRTL ? 'خطأ في الاتصال' : 'Connection error')}
              {state === 'missing' && (isRTL ? 'لم يُضبط' : 'Not configured')}
              {state === 'loading' && (isRTL ? 'جارٍ الفحص...' : 'Checking...')}
            </Badge>
            <Button
              variant="outline" size="sm" className="h-8 rounded-lg gap-1.5"
              onClick={() => statusQuery.refetch()}
              disabled={statusQuery.isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statusQuery.isFetching ? 'animate-spin' : ''}`} />
              <span className="text-xs">{isRTL ? 'تحديث' : 'Recheck'}</span>
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Key + docs row */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/40 p-3 bg-muted/[0.04]">
            <div className="flex items-center gap-2 mb-1.5">
              <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'مفتاح API' : 'API Key'}
              </span>
            </div>
            <code className="block text-xs font-mono" dir="ltr">
              {s?.keyMasked ?? (isRTL ? 'غير مضبوط' : 'not set')}
            </code>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-relaxed">
              {isRTL
                ? 'لإضافة/تحديث المفتاح: اطلب من Lovable حفظ السر RESEND_API_KEY.'
                : 'To add/update: ask Lovable to save the RESEND_API_KEY secret.'}
            </p>
          </div>

          <div className="rounded-xl border border-border/40 p-3 bg-muted/[0.04]">
            <div className="flex items-center gap-2 mb-1.5">
              <Globe2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'النطاقات المُتحقَّقة' : 'Verified domains'}
              </span>
            </div>
            {s?.domains && s.domains.length > 0 ? (
              <ul className="space-y-1">
                {s.domains.slice(0, 4).map(d => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                    <code dir="ltr" className="font-mono truncate">{d.name}</code>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 h-[14px] ${
                        d.status === 'verified' ? 'border-success/40 text-success' : 'border-warning/40 text-warning'
                      }`}
                    >
                      {d.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : s?.restricted ? (
              <p className="text-xs text-muted-foreground/70">
                {isRTL
                  ? 'مفتاح مُقيَّد للإرسال فقط — لا يمكنه إدراج النطاقات.'
                  : 'Send-only restricted key — domain listing unavailable.'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                {isRTL ? 'لا توجد نطاقات. أضف واحدًا من لوحة Resend.' : 'No domains yet. Add one from the Resend dashboard.'}
              </p>
            )}
          </div>
        </div>

        {/* Error banner */}
        {state === 'error' && s?.error && (
          <div className="rounded-lg bg-destructive/[0.06] border border-destructive/20 p-3 text-xs text-destructive">
            <div className="font-semibold mb-1">{isRTL ? 'تفاصيل الخطأ' : 'Error details'}</div>
            <code className="block font-mono break-all" dir="ltr">{s.error}</code>
          </div>
        )}

        {/* Missing key setup banner */}
        {state === 'missing' && (
          <div className="rounded-lg bg-warning/[0.06] border border-warning/20 p-3 text-xs leading-relaxed">
            <div className="font-semibold mb-1.5 text-warning">
              {isRTL ? 'خطوات تفعيل Resend' : 'Activate Resend'}
            </div>
            <ol className="space-y-1 text-foreground/80 list-decimal ps-5">
              <li>
                {isRTL ? 'افتح ' : 'Go to '}
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener" className="underline text-primary">
                  resend.com/api-keys
                </a>
                {isRTL ? ' وأنشئ مفتاح API.' : ' and create an API key.'}
              </li>
              <li>{isRTL ? 'انسخ المفتاح (يبدأ بـ re_).' : 'Copy the key (starts with re_).'}</li>
              <li>
                {isRTL
                  ? 'اطلب من Lovable: «أضف سر RESEND_API_KEY». ستظهر نافذة آمنة لإدخال المفتاح.'
                  : 'Ask Lovable: "add secret RESEND_API_KEY". A secure dialog will appear.'}
              </li>
              <li>{isRTL ? 'اضغط «تحديث» أعلاه للتحقق من الاتصال.' : 'Click Recheck above to verify the connection.'}</li>
            </ol>
          </div>
        )}

        {/* Test send */}
        {state === 'connected' && (
          <div className="rounded-xl border border-border/40 p-3 bg-muted/[0.03]">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {isRTL ? 'اختبر الإرسال' : 'Test send'}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email" dir="ltr"
                placeholder="you@example.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="h-9 rounded-lg text-xs font-mono flex-1"
              />
              <Button
                size="sm" className="h-9 rounded-lg gap-1.5"
                disabled={!testEmail || testMutation.isPending}
                onClick={() => testMutation.mutate(testEmail)}
              >
                {testMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                <span className="text-xs">{isRTL ? 'إرسال' : 'Send'}</span>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
              {isRTL
                ? 'يُرسل من onboarding@resend.dev للاختبار. لإرسال من نطاقك، تحقق منه في Resend.'
                : 'Sends from onboarding@resend.dev for testing. Verify your own domain in Resend to send from it.'}
            </p>
          </div>
        )}

        {/* Footer links */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground">
            {s?.checkedAt && (isRTL ? 'آخر فحص: ' : 'Last checked: ') + new Date(s.checkedAt).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
          </p>
          <div className="flex items-center gap-1">
            <a href="https://resend.com/api-keys" target="_blank" rel="noopener" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />{isRTL ? 'مفاتيح API' : 'API Keys'}
            </a>
            <span className="text-muted-foreground/30">•</span>
            <a href="https://resend.com/domains" target="_blank" rel="noopener" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />{isRTL ? 'النطاقات' : 'Domains'}
            </a>
            <span className="text-muted-foreground/30">•</span>
            <a href="https://resend.com/docs" target="_blank" rel="noopener" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />{isRTL ? 'التوثيق' : 'Docs'}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}