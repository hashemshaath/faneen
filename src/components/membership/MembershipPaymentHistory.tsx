import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, RotateCcw, Receipt, History, FileText, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listMembershipPaymentIntentsForSubscription } from '@/modules/memberships';

/**
 * R4F-8J: User-facing read-only membership payment history list.
 *
 * Surfaces payment intents for the caller's subscription via the
 * canonical service wrapper. No direct table access, no admin-only
 * fields, no raw payload/webhook data, no payment/refund action.
 */

type Status = 'created' | 'requires_action' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';

interface PaymentIntentSafeRow {
  id: string;
  ref_id: string | null;
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
  'id, ref_id, status, amount, currency, invoice_id, confirmed_at, created_at, updated_at, metadata';

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const MembershipPaymentHistory: React.FC<Props> = ({ subscriptionId, isRTL }) => {
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [limit, setLimit] = useState<number>(10);
  const { data: intents, isLoading } = useQuery({
    queryKey: ['membership-payment-history', subscriptionId, limit],
    enabled: !!subscriptionId,
    queryFn: async () => {
      const { data, error } = await listMembershipPaymentIntentsForSubscription<PaymentIntentSafeRow>({
        subscriptionId: subscriptionId as string,
        select: SAFE_SELECT,
        limit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!subscriptionId || isLoading) return null;

  const rows = intents ?? [];
  const filteredRows = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const title = isRTL ? 'سجل المدفوعات' : 'Payment history';
  const emptyText = isRTL ? 'لا يوجد سجل مدفوعات بعد.' : 'No payment history yet.';

  const filterOptions: { v: 'all' | Status; ar: string; en: string }[] = [
    { v: 'all', ar: 'الكل', en: 'All' },
    { v: 'succeeded', ar: 'مدفوعة', en: 'Paid' },
    { v: 'refunded', ar: 'مستردة', en: 'Refunded' },
    { v: 'failed', ar: 'فاشلة', en: 'Failed' },
    { v: 'created', ar: 'قيد الانتظار', en: 'Pending' },
  ];

  const exportCsv = () => {
    const header = ['Reference', 'Status', 'Amount', 'Currency', 'Invoice ID', 'Created at', 'Confirmed at'];
    const lines = [header.join(',')];
    filteredRows.forEach((r) => {
      lines.push([
        r.ref_id ?? '',
        r.status,
        r.amount ?? '',
        r.currency ?? '',
        r.invoice_id ?? '',
        r.created_at,
        r.confirmed_at ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qitaat-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="max-w-2xl mx-auto mb-8 border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <History className="w-4 h-4 text-foreground" />
            </div>
            <h3 className="font-heading font-bold text-sm">{title}</h3>
            <Badge variant="outline" className="text-[10px] h-5 tech-content">
              {filteredRows.length}
            </Badge>
          </div>
          {rows.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={exportCsv}
              aria-label={isRTL ? 'تصدير CSV' : 'Export CSV'}
            >
              <Download className="w-3 h-3" />
              CSV
            </Button>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {filterOptions.map((o) => {
              const count = o.v === 'all' ? rows.length : rows.filter((r) => r.status === o.v).length;
              const active = filter === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setFilter(o.v)}
                  className={
                    'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ' +
                    (active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60 bg-background hover:bg-muted text-foreground/80')
                  }
                >
                  {isRTL ? o.ar : o.en}
                  <span className="ms-1 tech-content opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'لا توجد عمليات مطابقة للتصفية.' : 'No payments match this filter.'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((intent) => {
              const status = intent.status;
              const refundedAt = readRefundedAt(intent.metadata);
              const { label, tone } = describeStatus(status, isRTL);

              return (
                <div
                  key={intent.id}
                  className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={tone}>{label}</Badge>
                        {status === 'succeeded' && intent.confirmed_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDateTime(intent.confirmed_at)}
                          </span>
                        )}
                        {status === 'refunded' && refundedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDateTime(refundedAt)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        {intent.ref_id && (
                          <span>
                            {isRTL ? 'المرجع: ' : 'Reference: '}
                            <span className="tech-content text-foreground font-mono">{intent.ref_id}</span>
                          </span>
                        )}
                        <span>
                          {isRTL ? 'المبلغ: ' : 'Amount: '}
                          <span className="tech-content text-foreground font-semibold">
                            {intent.amount ?? '—'} {intent.currency ?? ''}
                          </span>
                        </span>
                        {intent.invoice_id && (
                          <span className="flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            {isRTL ? 'الفاتورة: ' : 'Invoice: '}
                            <span className="tech-content text-foreground">
                              {intent.invoice_id}
                            </span>
                          </span>
                        )}
                        <span>
                          {isRTL ? 'التاريخ: ' : 'Date: '}
                          <span className="tech-content text-foreground">
                            {fmtDate(intent.created_at)}
                          </span>
                        </span>
                      </div>

                      {(status === 'succeeded' || status === 'refunded') && (
                        <div className="mt-2">
                          <Link
                            to={`/membership/payments/${encodeURIComponent(intent.id)}/invoice`}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            {status === 'refunded'
                              ? isRTL ? 'عرض الإشعار الدائن' : 'View credit note'
                              : isRTL ? 'عرض الفاتورة' : 'View invoice'}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rows.length >= limit && (
          <div className="mt-4 text-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => setLimit((n) => n + 10)}
            >
              {isRTL ? 'عرض المزيد' : 'Load more'}
            </Button>
          </div>
        )}
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

function readRefundedAt(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const refund = (metadata as { manual_refund?: unknown }).manual_refund;
  if (!refund || typeof refund !== 'object') return null;
  const at = (refund as { refunded_at?: unknown }).refunded_at;
  return typeof at === 'string' ? at : null;
}

export default MembershipPaymentHistory;
