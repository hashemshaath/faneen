import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, CreditCard, Check, History, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  listMembershipPaymentIntents,
  listMembershipPaymentWebhookEvents,
  markMembershipPaidManually,
  markMembershipRefundedManually,
  reconcileMembershipPaymentStatus,
  type MarkMembershipPaidManuallyResult,
  type MarkMembershipRefundedManuallyResult,
  type MembershipPaymentProvider,
} from '@/modules/memberships';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface IntentRow {
  id: string;
  subscription_id: string | null;
  user_id: string | null;
  business_id: string | null;
  provider: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  provider_intent_id: string | null;
  invoice_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface WebhookEventRow {
  id: string;
  event_id: string;
  event_type: string;
  provider: string;
  received_at: string;
  created_at: string;
  processed_at: string | null;
  processing_error: string | null;
  payload: unknown;
}

function extractSafePayloadSummary(payload: unknown): { paymentIntentId?: string; lines: string[] } {
  if (!payload || typeof payload !== 'object') return { lines: [] };
  const p = payload as Record<string, unknown>;
  const safeKeys = ['status', 'amount', 'currency', 'invoice_id', 'customer_id', 'subscription_id', 'object', 'type'];
  const lines: string[] = [];
  for (const key of safeKeys) {
    if (p[key] != null) {
      const value = String(p[key]);
      lines.push(`${key}: ${value.length > 40 ? value.slice(0, 40) + '…' : value}`);
    }
  }
  const paymentIntentId = p.payment_intent_id != null ? String(p.payment_intent_id) : undefined;
  return { paymentIntentId, lines };
}

function eventStatusLabel(row: WebhookEventRow): string {
  if (row.processing_error) return 'error';
  if (row.processed_at) return 'processed';
  return 'pending';
}

const EVENT_STATUS_TONE: Record<string, string> = {
  processed: 'bg-success/10 text-success border-success/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-muted text-muted-foreground border-border',
};

const STATUS_TONE: Record<string, string> = {
  succeeded: 'bg-success/10 text-success border-success/30',
  created: 'bg-info/10 text-info border-info/30',
  requires_action: 'bg-warning/10 text-warning border-warning/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  refunded: 'bg-muted text-muted-foreground border-border',
};

const PAID_STATUSES = new Set(['succeeded', 'refunded']);
const REFUNDED_STATUSES = new Set(['refunded']);

// R4F-9F: pending intents older than this are flagged as "Needs follow-up".
const STALE_PENDING_MS = 30 * 60 * 1000; // 30 minutes

type IntentHealth =
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'requires_action'
  | 'waiting_webhook'
  | 'reconcile_needed'
  | 'cancelled';

function intentHealth(row: { status: string; created_at: string; confirmed_at: string | null }): IntentHealth {
  if (row.status === 'succeeded') return 'succeeded';
  if (row.status === 'failed') return 'failed';
  if (row.status === 'refunded') return 'refunded';
  if (row.status === 'cancelled') return 'cancelled';
  if (row.status === 'requires_action') return 'requires_action';
  // created
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs > STALE_PENDING_MS) return 'reconcile_needed';
  return 'waiting_webhook';
}

const HEALTH_TONE: Record<IntentHealth, string> = {
  succeeded: 'bg-success/10 text-success border-success/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  refunded: 'bg-muted text-muted-foreground border-border',
  requires_action: 'bg-warning/10 text-warning border-warning/30',
  waiting_webhook: 'bg-info/10 text-info border-info/30',
  reconcile_needed: 'bg-warning/10 text-warning border-warning/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

function healthLabel(h: IntentHealth, isRTL: boolean): string {
  switch (h) {
    case 'succeeded': return isRTL ? 'مكتمل' : 'Succeeded';
    case 'failed': return isRTL ? 'فشل' : 'Failed';
    case 'refunded': return isRTL ? 'مسترد' : 'Refunded';
    case 'requires_action': return isRTL ? 'يتطلب إجراء' : 'Requires action';
    case 'waiting_webhook': return isRTL ? 'بانتظار التأكيد' : 'Waiting for webhook';
    case 'reconcile_needed': return isRTL ? 'بحاجة إلى متابعة' : 'Needs follow-up';
    case 'cancelled': return isRTL ? 'ملغاة' : 'Cancelled';
  }
}

const AdminMembershipPayments = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  usePageMeta({ title: isRTL ? 'مدفوعات العضويات' : 'Membership Payments' });
  useNoIndex();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchParams] = useSearchParams();
  const highlightedIntentId = searchParams.get('intent');
  const [activeIntent, setActiveIntent] = useState<IntentRow | null>(null);
  const [externalPaymentId, setExternalPaymentId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeRefundIntent, setActiveRefundIntent] = useState<IntentRow | null>(null);
  const [refundReference, setRefundReference] = useState('');
  const [refundedAt, setRefundedAt] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // R4F-9F: per-intent reconcile in-flight tracking.
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  // R4F-9F: webhook events processing filter.
  const [eventFilter, setEventFilter] = useState<'all' | 'pending' | 'processed' | 'error'>('all');

  const SELECT_COLS =
    'id, subscription_id, user_id, business_id, provider, status, amount, currency, provider_intent_id, invoice_id, confirmed_at, created_at, updated_at';

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-membership-payments', statusFilter],
    queryFn: async () => {
      const { data, error } = await listMembershipPaymentIntents<IntentRow>({
        select: SELECT_COLS,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 500,
      });
      if (error) throw error;
      return (data ?? []) as IntentRow[];
    },
  });

  const EVENT_SELECT =
    'id,event_id,event_type,provider,received_at,created_at,processed_at,processing_error,payload';

  const { data: eventRows = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-membership-payment-events'],
    queryFn: async () => {
      const { data, error } = await listMembershipPaymentWebhookEvents<WebhookEventRow>({
        select: EVENT_SELECT,
        limit: 50,
        order: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return (data ?? []) as WebhookEventRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!highlightedIntentId) return rows;
    // Read-only filter: pin matching row to top, do not auto-submit.
    const match = rows.find((r) => r.id === highlightedIntentId);
    if (!match) return rows;
    return [match, ...rows.filter((r) => r.id !== highlightedIntentId)];
  }, [rows, highlightedIntentId]);

  const resetForm = () => {
    setActiveIntent(null);
    setExternalPaymentId('');
    setInvoiceId('');
    setPaidAt('');
    setNotes('');
  };

  const resetRefundForm = () => {
    setActiveRefundIntent(null);
    setRefundReference('');
    setRefundedAt('');
    setRefundNotes('');
  };

  const handleReconcile = async (row: IntentRow) => {
    setReconcilingId(row.id);
    try {
      const { data, error } = await reconcileMembershipPaymentStatus({
        intentId: row.id,
        provider: (row.provider || 'moyasar') as MembershipPaymentProvider,
        providerIntentId: row.provider_intent_id || undefined,
      });
      if (error) {
        toast.error(isRTL ? 'تعذر مزامنة الحالة' : 'Failed to reconcile status');
        return;
      }
      const result = (data ?? null) as { ok?: boolean; code?: string; status?: string } | null;
      if (!result || !result.ok) {
        const code = result?.code;
        const msg =
          code === 'missing_payment_config'
            ? isRTL ? 'إعدادات بوابة الدفع غير مكتملة' : 'Payment provider not configured'
          : code === 'provider_error'
            ? isRTL ? 'خطأ من بوابة الدفع' : 'Payment provider error'
          : code === 'not_found'
            ? isRTL ? 'لم يتم العثور على نية الدفع لدى المزود' : 'Payment intent not found at provider'
          : code === 'unauthorized'
            ? isRTL ? 'غير مصرح' : 'Unauthorized'
          : code === 'status_not_final'
            ? isRTL ? 'الحالة غير نهائية بعد لدى المزود' : 'Provider status is not final yet'
          : isRTL ? 'تعذر مزامنة الحالة' : 'Failed to reconcile status';
        toast.error(msg);
        return;
      }
      toast.success(
        (isRTL ? 'تمت المزامنة. الحالة: ' : 'Reconciled. Status: ') + (result.status ?? '—'),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-membership-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-membership-payment-events'] }),
      ]);
    } finally {
      setReconcilingId(null);
    }
  };

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return eventRows;
    return eventRows.filter((e) => {
      const status = eventStatusLabel(e);
      return status === eventFilter;
    });
  }, [eventRows, eventFilter]);

  const handleSubmit = async () => {
    if (!activeIntent || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await markMembershipPaidManually({
        paymentIntentId: activeIntent.id,
        adminUserId: user.id,
        externalPaymentId: externalPaymentId.trim() || null,
        invoiceId: invoiceId.trim() || null,
        paidAt: paidAt ? new Date(paidAt).toISOString() : null,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(isRTL ? 'تعذر تأكيد الدفع' : 'Failed to mark as paid');
        return;
      }
      const result = data as MarkMembershipPaidManuallyResult | null;
      if (!result || !result.ok) {
        const code = result?.code;
        const msg =
          code === 'payment_intent_not_found'
            ? isRTL ? 'لم يتم العثور على نية الدفع' : 'Payment intent not found'
            : code === 'duplicate_payment_reference'
            ? isRTL ? 'مرجع دفع مكرر' : 'Duplicate payment reference'
            : isRTL ? 'تعذر تأكيد الدفع' : 'Failed to mark as paid';
        toast.error(msg);
        return;
      }
      if (result.idempotent) {
        toast.info(isRTL ? 'تم تأكيد الدفع مسبقاً' : 'Already marked as paid');
      } else {
        toast.success(isRTL ? 'تم تأكيد الدفع' : 'Payment marked as paid');
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin-membership-payments'] });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!activeRefundIntent || !user) return;
    setRefundSubmitting(true);
    try {
      const { data, error } = await markMembershipRefundedManually({
        paymentIntentId: activeRefundIntent.id,
        adminUserId: user.id,
        refundReference: refundReference.trim() || null,
        refundedAt: refundedAt ? new Date(refundedAt).toISOString() : null,
        notes: refundNotes.trim() || null,
      });
      if (error) {
        toast.error(isRTL ? 'تعذر تسجيل الاسترداد' : 'Failed to mark as refunded');
        return;
      }
      const result = data as MarkMembershipRefundedManuallyResult | null;
      if (!result || !result.ok) {
        const code = result?.code;
        const msg =
          code === 'payment_intent_not_found'
            ? isRTL ? 'لم يتم العثور على نية الدفع' : 'Payment intent not found'
            : code === 'payment_not_paid'
            ? isRTL ? 'لا يمكن استرداد دفعة غير مكتملة' : 'Cannot refund a non-paid intent'
            : isRTL ? 'تعذر تسجيل الاسترداد' : 'Failed to mark as refunded';
        toast.error(msg);
        return;
      }
      if (result.idempotent) {
        toast.info(isRTL ? 'تم تسجيل الاسترداد مسبقاً' : 'Already marked as refunded');
      } else {
        toast.success(isRTL ? 'تم تسجيل الاسترداد يدويًا' : 'Marked as refunded manually');
      }
      resetRefundForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-membership-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-membership-payment-events'] }),
      ]);
    } finally {
      setRefundSubmitting(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-6xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            {isRTL ? 'مدفوعات العضويات' : 'Membership Payments'}
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
              <SelectItem value="created">created</SelectItem>
              <SelectItem value="requires_action">requires_action</SelectItem>
              <SelectItem value="succeeded">succeeded</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
              <SelectItem value="cancelled">cancelled</SelectItem>
              <SelectItem value="refunded">refunded</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? 'التاريخ' : 'Created'}</TableHead>
                  <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isRTL ? 'المزود' : 'Provider'}</TableHead>
                  <TableHead>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{isRTL ? 'معرف المزود' : 'Provider Intent'}</TableHead>
                  <TableHead>{isRTL ? 'الفاتورة' : 'Invoice'}</TableHead>
                  <TableHead>{isRTL ? 'تأكيد' : 'Confirmed'}</TableHead>
                  <TableHead className="text-end"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const isPaid = PAID_STATUSES.has(r.status);
                  const isRefunded = REFUNDED_STATUSES.has(r.status);
                  const isHighlighted = highlightedIntentId === r.id;
                  return (
                    <TableRow key={r.id} className={isHighlighted ? 'bg-primary/5' : ''}>
                      <TableCell className="tech-content text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_TONE[r.status] || ''}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="tech-content text-xs">{r.provider || '—'}</TableCell>
                      <TableCell className="tech-content text-xs">
                        {r.amount != null ? `${r.amount} ${r.currency || ''}` : '—'}
                      </TableCell>
                      <TableCell className="tech-content text-[10px] font-mono">{r.provider_intent_id || '—'}</TableCell>
                      <TableCell className="tech-content text-[10px] font-mono">{r.invoice_id || '—'}</TableCell>
                      <TableCell className="tech-content text-xs">
                        {r.confirmed_at ? new Date(r.confirmed_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-end">
                        {isRefunded ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="outline" className="gap-1">
                              {isRTL ? 'مسترد' : 'Refunded'}
                            </Badge>
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/membership/payments/${encodeURIComponent(r.id)}/invoice`}>
                                <FileText className="w-3 h-3 me-1" />
                                {isRTL ? 'عرض الإشعار الدائن' : 'View credit note'}
                              </Link>
                            </Button>
                          </div>
                        ) : isPaid ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Check className="w-3 h-3" />
                              {isRTL ? 'مدفوع' : 'Paid'}
                            </Badge>
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/membership/payments/${encodeURIComponent(r.id)}/invoice`}>
                                <FileText className="w-3 h-3 me-1" />
                                {isRTL ? 'عرض الفاتورة' : 'View invoice'}
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!user}
                              onClick={() => {
                                setActiveRefundIntent(r);
                                setRefundReference('');
                                setRefundedAt('');
                                setRefundNotes('');
                              }}
                            >
                              {isRTL ? 'تسجيل استرداد' : 'Mark refunded'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!user}
                            onClick={() => {
                              setActiveIntent(r);
                              setExternalPaymentId(r.provider_intent_id || '');
                              setInvoiceId(r.invoice_id || '');
                              setPaidAt('');
                              setNotes('');
                            }}
                          >
                            {isRTL ? 'تأكيد الدفع' : 'Mark paid'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      {isRTL ? 'لا توجد مدفوعات' : 'No payment intents'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {activeIntent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isRTL ? 'تأكيد دفع نية الدفع' : 'Confirm payment intent'}
              <span className="ms-2 text-xs font-mono text-muted-foreground">{activeIntent.id.slice(0, 8)}…</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ext-pay-id">{isRTL ? 'معرف الدفع الخارجي' : 'External payment ID'}</Label>
                <Input
                  id="ext-pay-id"
                  dir="auto"
                  value={externalPaymentId}
                  onChange={(e) => setExternalPaymentId(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-id">{isRTL ? 'رقم الفاتورة' : 'Invoice ID'}</Label>
                <Input
                  id="invoice-id"
                  dir="auto"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid-at">{isRTL ? 'تاريخ الدفع' : 'Paid at'}</Label>
                <Input
                  id="paid-at"
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                <Textarea
                  id="notes"
                  dir="auto"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={resetForm} disabled={submitting}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !user}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isRTL ? 'تأكيد الدفع' : 'Confirm paid'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeRefundIntent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isRTL ? 'تسجيل استرداد يدوي' : 'Mark refunded manually'}
              <span className="ms-2 text-xs font-mono text-muted-foreground">{activeRefundIntent.id.slice(0, 8)}…</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'يسجل هذا الإجراء استرداداً يدوياً أو إشعار دائن للدفعة. لا يتم استدعاء بوابة الدفع.'
                : 'This records a manual refund or credit-note for the payment. No payment gateway is contacted.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refund-ref">{isRTL ? 'مرجع الاسترداد' : 'Refund reference'}</Label>
                <Input
                  id="refund-ref"
                  dir="auto"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refunded-at">{isRTL ? 'تاريخ الاسترداد' : 'Refunded at'}</Label>
                <Input
                  id="refunded-at"
                  type="datetime-local"
                  value={refundedAt}
                  onChange={(e) => setRefundedAt(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="refund-notes">{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                <Textarea
                  id="refund-notes"
                  dir="auto"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={resetRefundForm} disabled={refundSubmitting}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleRefundSubmit} disabled={refundSubmitting || !user}>
                {refundSubmitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                {isRTL ? 'تسجيل الاسترداد' : 'Mark refunded'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            {isRTL ? 'أحداث الدفع الأخيرة' : 'Recent payment events'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? 'التاريخ' : 'Received'}</TableHead>
                  <TableHead>{isRTL ? 'المزود' : 'Provider'}</TableHead>
                  <TableHead>{isRTL ? 'نوع الحدث' : 'Event type'}</TableHead>
                  <TableHead>{isRTL ? 'معرف الحدث' : 'Event ID'}</TableHead>
                  <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isRTL ? 'الملخص' : 'Summary'}</TableHead>
                  <TableHead className="text-end"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventRows.map((e) => {
                  const summary = extractSafePayloadSummary(e.payload);
                  const status = eventStatusLabel(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="tech-content text-xs">{new Date(e.received_at).toLocaleString()}</TableCell>
                      <TableCell className="tech-content text-xs">{e.provider}</TableCell>
                      <TableCell className="tech-content text-xs">{e.event_type}</TableCell>
                      <TableCell className="tech-content text-[10px] font-mono">{e.event_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={EVENT_STATUS_TONE[status] || ''}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {summary.lines.length > 0 ? (
                          <ul className="space-y-0.5">
                            {summary.lines.map((line, i) => (
                              <li key={i} className="text-muted-foreground">{line}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {summary.paymentIntentId ? (
                          <Button size="sm" variant="ghost" asChild>
                            <Link
                              to={`/admin/membership-payments?intent=${encodeURIComponent(summary.paymentIntentId)}`}
                            >
                              {isRTL ? 'فتح نية الدفع' : 'Open payment intent'}
                            </Link>
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {eventRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      {isRTL ? 'لا توجد أحداث دفع بعد.' : 'No payment events yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMembershipPayments;