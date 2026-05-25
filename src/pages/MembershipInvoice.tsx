import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Printer, ArrowLeft, Receipt } from 'lucide-react';
import { getMembershipPaymentIntentForInvoice } from '@/modules/memberships';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * R4F-8K: Printable, read-only membership invoice / credit-note view.
 *
 * - No live provider integration.
 * - No payment / refund action.
 * - Renders only safe whitelisted fields via the canonical service
 *   wrapper `getMembershipPaymentIntentForInvoice`.
 * - Visibility is enforced by RLS on `membership_payment_intents`.
 */

interface InvoiceIntent {
  id: string;
  ref_id: string | null;
  subscription_id: string | null;
  status: string;
  amount: number | string | null;
  currency: string | null;
  invoice_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
  plan?: {
    name_ar?: string | null;
    name_en?: string | null;
    tier?: string | null;
  } | null;
  subscription?: {
    id?: string | null;
    ref_id?: string | null;
    tier?: string | null;
    starts_at?: string | null;
    expires_at?: string | null;
    business?: {
      id?: string | null;
      name_ar?: string | null;
      name_en?: string | null;
      ref_id?: string | null;
    } | null;
  } | null;
}

const SAFE_SELECT =
  'id, ref_id, subscription_id, status, amount, currency, invoice_id, confirmed_at, created_at, updated_at, metadata, plan:membership_plans(name_ar, name_en, tier), subscription:membership_subscriptions(id, ref_id, tier, starts_at, expires_at, business:businesses(id, name_ar, name_en, ref_id, legacy_ref_id))';

function readRefundedAt(metadata: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const refund = (metadata as { manual_refund?: unknown }).manual_refund;
  if (!refund || typeof refund !== 'object') return null;
  const at = (refund as { refunded_at?: unknown }).refunded_at;
  return typeof at === 'string' ? at : null;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

const MembershipInvoice = () => {
  const { paymentIntentId } = useParams<{ paymentIntentId: string }>();
  const { isRTL } = useLanguage();

  const { data, isLoading, error } = useQuery({
    queryKey: ['membership-invoice', paymentIntentId],
    enabled: !!paymentIntentId,
    queryFn: async () => {
      const { data, error } = await getMembershipPaymentIntentForInvoice<InvoiceIntent>({
        paymentIntentId: paymentIntentId as string,
        select: SAFE_SELECT,
      });
      if (error) throw error;
      return data;
    },
  });

  const isRefunded = data?.status === 'refunded';
  const title = isRefunded
    ? isRTL ? 'إشعار دائن' : 'Credit Note'
    : isRTL ? 'فاتورة عضوية' : 'Membership Invoice';

  usePageMeta({ title });
  useNoIndex();

  if (isLoading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-16 max-w-2xl text-center">
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'لم يتم العثور على الوثيقة.' : 'Document not found.'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/membership">
            <ArrowLeft className="w-4 h-4 me-1" />
            {isRTL ? 'العودة' : 'Back'}
          </Link>
        </Button>
      </div>
    );
  }

  const refundedAt = readRefundedAt(data.metadata);
  const planName = isRTL
    ? data.plan?.name_ar || data.plan?.name_en
    : data.plan?.name_en || data.plan?.name_ar;
  const businessName = isRTL
    ? data.subscription?.business?.name_ar || data.subscription?.business?.name_en
    : data.subscription?.business?.name_en || data.subscription?.business?.name_ar;
  const businessRef = data.subscription?.business?.ref_id ?? null;
  const subRef = data.subscription?.ref_id ?? null;
  const periodStart = data.subscription?.starts_at ?? null;
  const periodEnd = data.subscription?.expires_at ?? null;

  return (
    <div className="container max-w-3xl py-8 print:py-2">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/membership">
            <ArrowLeft className="w-4 h-4 me-1" />
            {isRTL ? 'العودة للعضوية' : 'Back to membership'}
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 me-1" />
          {isRTL ? 'طباعة' : 'Print'}
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 sm:p-10 space-y-8">
          <header className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-2xl">{title}</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'منصة قطاعات' : 'Qitaat Platform'}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isRefunded
                  ? 'bg-warning/10 text-warning border-warning/30'
                  : data.status === 'succeeded'
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-muted text-muted-foreground border-border'
              }
            >
              {data.status}
            </Badge>
          </header>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground mb-1">
                {isRTL ? 'رقم الوثيقة' : 'Document ID'}
              </dt>
              <dd className="tech-content font-mono text-foreground">{data.ref_id ?? data.id}</dd>
            </div>
            {data.invoice_id && (
              <div>
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'رقم الفاتورة' : 'Invoice ID'}
                </dt>
                <dd className="tech-content font-mono text-foreground">{data.invoice_id}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground mb-1">
                {isRTL ? 'تاريخ الإصدار' : 'Issued at'}
              </dt>
              <dd className="tech-content text-foreground">{fmt(data.created_at)}</dd>
            </div>
            {data.confirmed_at && (
              <div>
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'تاريخ الدفع' : 'Paid at'}
                </dt>
                <dd className="tech-content text-foreground">{fmt(data.confirmed_at)}</dd>
              </div>
            )}
            {isRefunded && refundedAt && (
              <div>
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'تاريخ الاسترداد' : 'Refunded at'}
                </dt>
                <dd className="tech-content text-foreground">{fmt(refundedAt)}</dd>
              </div>
            )}
            {data.subscription_id && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'مرجع الاشتراك' : 'Subscription reference'}
                </dt>
                <dd className="tech-content font-mono text-foreground text-xs break-all">
                  {subRef ?? data.subscription_id}
                </dd>
              </div>
            )}
            {planName && (
              <div>
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'الباقة' : 'Plan'}
                </dt>
                <dd className="text-foreground">
                  {planName}
                  {data.plan?.tier && (
                    <span className="tech-content text-xs text-muted-foreground ms-2">
                      ({data.plan.tier})
                    </span>
                  )}
                </dd>
              </div>
            )}
            {businessName && (
              <div>
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'الحساب' : 'Account'}
                </dt>
                <dd className="text-foreground">
                  {businessName}
                  {businessRef && (
                    <span className="tech-content text-xs text-muted-foreground ms-2 font-mono">
                      {businessRef}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {(periodStart || periodEnd) && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'فترة العضوية' : 'Membership period'}
                </dt>
                <dd className="tech-content text-foreground">
                  {fmt(periodStart)} — {fmt(periodEnd)}
                </dd>
              </div>
            )}
          </dl>

          <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold">
                {isRefunded
                  ? isRTL ? 'المبلغ المسترد' : 'Refunded amount'
                  : isRTL ? 'المبلغ المدفوع' : 'Amount paid'}
              </span>
              <span className="tech-content text-xl font-bold text-foreground">
                {data.amount ?? '—'} {data.currency ?? ''}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
            {isRTL
              ? 'هذه وثيقة داخلية صادرة من منصة قطاعات.'
              : 'This is an internal document issued by Qitaat platform.'}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRTL
              ? 'للاستفسارات، يرجى التواصل مع دعم المنصة.'
              : 'For questions, please contact platform support.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipInvoice;