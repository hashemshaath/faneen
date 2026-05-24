import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmMembershipPayment } from '@/modules/memberships/services/payments/edge';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';

/**
 * R4F-9E: Membership payment return page.
 * Reached after the Moyasar hosted checkout redirects the user back.
 * NEVER trusts the `status` query param — it only triggers a server-side
 * confirm call which fetches authoritative status from the provider.
 */
type UiState = 'loading' | 'succeeded' | 'pending' | 'failed' | 'cancelled' | 'error';

export default function MembershipPaymentReturn() {
  const [params] = useSearchParams();
  const { isRTL } = useLanguage();
  const [state, setState] = useState<UiState>('loading');
  const intentId = params.get('intent') ?? '';
  useNoIndex();

  useEffect(() => {
    let cancelled = false;
    if (!intentId) { setState('error'); return; }
    (async () => {
      try {
        const { data, error } = await confirmMembershipPayment({
          intentId,
          provider: 'moyasar',
        } as never);
        if (cancelled) return;
        if (error || !data?.ok) { setState('error'); return; }
        const status = String(data.status ?? '').toLowerCase();
        if (status === 'succeeded') setState('succeeded');
        else if (status === 'failed') setState('failed');
        else if (status === 'cancelled') setState('cancelled');
        else setState('pending');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [intentId]);

  const copy = {
    loading: { ar: 'جارٍ التحقق من حالة الدفع…', en: 'Verifying payment status…' },
    succeeded: { ar: 'تم تأكيد الدفع وتفعيل اشتراكك.', en: 'Payment confirmed. Your membership is active.' },
    pending: { ar: 'تم استلام طلب الدفع وسيتم تأكيده قريباً.', en: 'Payment received — confirmation pending.' },
    failed: { ar: 'تعذّر إتمام عملية الدفع.', en: 'Payment failed.' },
    cancelled: { ar: 'تم إلغاء عملية الدفع.', en: 'Payment was cancelled.' },
    error: { ar: 'تعذّر التحقق من حالة الدفع.', en: 'Could not verify payment status.' },
  } as const;

  const Icon = state === 'succeeded'
    ? CheckCircle2
    : state === 'loading' || state === 'pending'
      ? Clock
      : AlertCircle;

  return (
    <main className="container max-w-xl mx-auto py-16 px-4">
      <Card>
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {state === 'loading'
            ? <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            : <Icon className={`h-10 w-10 mx-auto ${state === 'succeeded' ? 'text-emerald-600' : 'text-muted-foreground'}`} />}
          <h1 className="text-xl font-semibold">{isRTL ? copy[state].ar : copy[state].en}</h1>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild>
              <Link to="/membership">{isRTL ? 'العودة إلى صفحة الاشتراك' : 'Back to membership'}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">{isRTL ? 'لوحة التحكم' : 'Dashboard'}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}