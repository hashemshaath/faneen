import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, RotateCcw, Receipt } from 'lucide-react';
import { getLatestMembershipPaymentIntentForSubscription } from '@/modules/memberships';
import { MembershipCheckoutButton } from '@/components/membership/MembershipCheckoutButton';

/**
 * R4F-8I: User-facing read-only membership payment status panel.
 *
 * Surfaces the latest membership_payment_intent for the caller's
 * subscription via the canonical service wrapper. No direct table access,
 * no admin-only fields, no raw payload/webhook data, no refund action.
 *
 * If no intent exists, the panel renders nothing so existing
 * manual / beta activation copy stays unchanged.
 */

type Status = 'created' | 'requires_action' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';

interface PaymentIntentSafeRow {
  id: string;
  status: Status;
  amount: number | string | null;
  currency: string | null;
  invoice_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

interface Props {
  subscriptionId: string | null | undefined;
  isRTL: boolean;
}

const SAFE_SELECT =
  'id, status, amount, currency, invoice_id, confirmed_at, created_at, updated_at, metadata';

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '');

export const MembershipPaymentStatus: React.FC<Props> = ({ subscriptionId, isRTL }) => {
  const { data: intent, isLoading } = useQuery({
    queryKey: ['membership-latest-payment-intent', subscriptionId],
    enabled: !!subscriptionId,
    queryFn: async () => {
      const { data, error } = await getLatestMembershipPaymentIntentForSubscription<PaymentIntentSafeRow>({
        subscriptionId: subscriptionId as string,
        select: SAFE_SELECT,
      });
      if (error) throw error;
      return data;
    },
  });

  if (!subscriptionId || isLoading || !intent) return null;

  const status = intent.status;
  const refundedAt = readRefundedAt(intent.metadata);

  const { label, tone, icon: StatusIcon } = describeStatus(status, isRTL);

  return (
    <Card className="max-w-2xl mx-auto mb-8 border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <StatusIcon className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-sm">
                {isRTL ? 'حالة الدفع الأخيرة' : 'Latest payment status'}
              </h3>
              <Badge className={tone}>{label}</Badge>
            </div>

            {status === 'succeeded' && (
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {intent.confirmed_at && (
                  <p>
                    {isRTL ? 'تم التأكيد في: ' : 'Confirmed on: '}
                    <span className="tech-content text-foreground">{fmtDate(intent.confirmed_at)}</span>
                  </p>
                )}
                {intent.invoice_id && (
                  <p className="flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    {isRTL ? 'رقم الفاتورة: ' : 'Invoice: '}
                    <span className="tech-content text-foreground">{intent.invoice_id}</span>
                  </p>
                )}
              </div>
            )}

            {status === 'refunded' && (
              <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3 text-warning" />
                  {isRTL ? 'تم تسجيل الاسترداد يدويًا' : 'Refund marked manually'}
                </p>
                {refundedAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isRTL ? 'تاريخ التسجيل: ' : 'Recorded on: '}
                    <span className="tech-content text-foreground">{fmtDate(refundedAt)}</span>
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {isRTL
                    ? 'قد تتم معالجة الاسترداد الفعلي خارج المنصة حسب طريقة الدفع.'
                    : 'The actual refund may be processed outside the platform depending on the payment method.'}
                </p>
              </div>
            )}

            {(status === 'failed' || status === 'cancelled') && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {isRTL
                  ? 'لم تكتمل عملية الدفع الأخيرة. يمكنك المحاولة مجددًا أو التواصل مع الدعم.'
                  : 'The latest payment attempt did not complete. You can retry or contact support.'}
              </p>
            )}

            {(status === 'created' || status === 'requires_action') && (
              <>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {isRTL
                    ? 'عملية الدفع قيد الانتظار. أكمل الدفع عبر البوابة الآمنة للتفعيل.'
                    : 'Your payment is pending. Complete it via the secure checkout to activate.'}
                </p>
                <div className="mt-3">
                  <MembershipCheckoutButton
                    subscriptionId={subscriptionId as string}
                    isRTL={isRTL}
                    className="h-9 rounded-xl"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function describeStatus(status: Status, isRTL: boolean) {
  switch (status) {
    case 'succeeded':
      return {
        label: isRTL ? 'مدفوع' : 'Paid',
        tone: 'bg-success/10 text-success border border-success/30',
        icon: CheckCircle2,
      };
    case 'refunded':
      return {
        label: isRTL ? 'مسترد' : 'Refunded',
        tone: 'bg-warning/10 text-warning border border-warning/30',
        icon: RotateCcw,
      };
    case 'failed':
    case 'cancelled':
      return {
        label: isRTL ? 'فشل' : 'Failed',
        tone: 'bg-destructive/10 text-destructive border border-destructive/30',
        icon: AlertTriangle,
      };
    case 'created':
    case 'requires_action':
    default:
      return {
        label: isRTL ? 'قيد الانتظار' : 'Pending',
        tone: 'bg-muted text-foreground border border-border',
        icon: Clock,
      };
  }
}

/**
 * Safely read a refund timestamp from the intent metadata. Only a
 * whitelisted, user-safe sub-key is read; raw metadata is never rendered.
 */
function readRefundedAt(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const refund = (metadata as { manual_refund?: unknown }).manual_refund;
  if (!refund || typeof refund !== 'object') return null;
  const at = (refund as { refunded_at?: unknown }).refunded_at;
  return typeof at === 'string' ? at : null;
}

export default MembershipPaymentStatus;