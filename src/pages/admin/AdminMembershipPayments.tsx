import { pickBi } from '@/components/common/Bilingual';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
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
import {
  MembershipPaymentIntentsSection,
  MembershipWebhookEventsSection,
  PaymentManualForm,
  PaymentRefundForm,
  type IntentHealth,
  type WebhookEventFilter,
  type WebhookEventRowView,
  type WebhookEventSummary,
} from '@/components/admin/memberships/payments';

interface IntentRow {
  id: string;
  ref_id: string | null;
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

function extractSafePayloadSummary(payload: unknown): WebhookEventSummary {
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

function eventStatusLabel(row: WebhookEventRowView): 'pending' | 'processed' | 'error' {
  if (row.processing_error) return 'error';
  if (row.processed_at) return 'processed';
  return 'pending';
}

const PAID_STATUSES = new Set(['succeeded', 'refunded']);
const REFUNDED_STATUSES = new Set(['refunded']);

// R4F-9F: pending intents older than this are flagged as "Needs follow-up".
const STALE_PENDING_MS = 30 * 60 * 1000; // 30 minutes

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
    case 'succeeded': return pickBi(isRTL, 'مكتمل', 'Succeeded');
    case 'failed': return pickBi(isRTL, 'فشل', 'Failed');
    case 'refunded': return pickBi(isRTL, 'مسترد', 'Refunded');
    case 'requires_action': return pickBi(isRTL, 'يتطلب إجراء', 'Requires action');
    case 'waiting_webhook': return pickBi(isRTL, 'بانتظار التأكيد', 'Waiting for webhook');
    case 'reconcile_needed': return pickBi(isRTL, 'بحاجة إلى متابعة', 'Needs follow-up');
    case 'cancelled': return pickBi(isRTL, 'ملغاة', 'Cancelled');
  }
}

const AdminMembershipPayments = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  usePageMeta({ title: pickBi(isRTL, 'مدفوعات العضويات', 'Membership Payments') });
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
  const [eventFilter, setEventFilter] = useState<WebhookEventFilter>('all');

  const SELECT_COLS =
    'id, ref_id, subscription_id, user_id, business_id, provider, status, amount, currency, provider_intent_id, invoice_id, confirmed_at, created_at, updated_at';

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
        toast.error(pickBi(isRTL, 'تعذر مزامنة الحالة', 'Failed to reconcile status'));
        return;
      }
      const result = (data ?? null) as { ok?: boolean; code?: string; status?: string } | null;
      if (!result || !result.ok) {
        const code = result?.code;
        const msg =
          code === 'missing_payment_config'
            ? pickBi(isRTL, 'إعدادات بوابة الدفع غير مكتملة', 'Payment provider not configured')
          : code === 'provider_error'
            ? pickBi(isRTL, 'خطأ من بوابة الدفع', 'Payment provider error')
          : code === 'not_found'
            ? pickBi(isRTL, 'لم يتم العثور على نية الدفع لدى المزود', 'Payment intent not found at provider')
          : code === 'unauthorized'
            ? pickBi(isRTL, 'غير مصرح', 'Unauthorized')
          : code === 'status_not_final'
            ? pickBi(isRTL, 'الحالة غير نهائية بعد لدى المزود', 'Provider status is not final yet')
          : pickBi(isRTL, 'تعذر مزامنة الحالة', 'Failed to reconcile status');
        toast.error(msg);
        return;
      }
      toast.success(
        (pickBi(isRTL, 'تمت المزامنة. الحالة: ', 'Reconciled. Status: ')) + (result.status ?? '—'),
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
        toast.error(pickBi(isRTL, 'تعذر تأكيد الدفع', 'Failed to mark as paid'));
        return;
      }
      const result = data as MarkMembershipPaidManuallyResult | null;
      if (!result || !result.ok) {
        const code = result?.code;
        const msg =
          code === 'payment_intent_not_found'
            ? pickBi(isRTL, 'لم يتم العثور على نية الدفع', 'Payment intent not found')
            : code === 'duplicate_payment_reference'
            ? pickBi(isRTL, 'مرجع دفع مكرر', 'Duplicate payment reference')
            : pickBi(isRTL, 'تعذر تأكيد الدفع', 'Failed to mark as paid');
        toast.error(msg);
        return;
      }
      if (result.idempotent) {
        toast.info(pickBi(isRTL, 'تم تأكيد الدفع مسبقاً', 'Already marked as paid'));
      } else {
        toast.success(pickBi(isRTL, 'تم تأكيد الدفع', 'Payment marked as paid'));
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
        toast.error(pickBi(isRTL, 'تعذر تسجيل الاسترداد', 'Failed to mark as refunded'));
        return;
      }
      const result = data as MarkMembershipRefundedManuallyResult | null;
      if (!result || !result.ok) {
        const code = result?.code;
        const msg =
          code === 'payment_intent_not_found'
            ? pickBi(isRTL, 'لم يتم العثور على نية الدفع', 'Payment intent not found')
            : code === 'payment_not_paid'
            ? pickBi(isRTL, 'لا يمكن استرداد دفعة غير مكتملة', 'Cannot refund a non-paid intent')
            : pickBi(isRTL, 'تعذر تسجيل الاسترداد', 'Failed to mark as refunded');
        toast.error(msg);
        return;
      }
      if (result.idempotent) {
        toast.info(pickBi(isRTL, 'تم تسجيل الاسترداد مسبقاً', 'Already marked as refunded'));
      } else {
        toast.success(pickBi(isRTL, 'تم تسجيل الاسترداد يدويًا', 'Marked as refunded manually'));
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
    <DashboardLayout>
    <div className="container px-4 py-6 max-w-6xl space-y-6">
      <MembershipPaymentIntentsSection
        isRTL={isRTL}
        isLoading={isLoading}
        rows={filtered}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        highlightedIntentId={highlightedIntentId}
        reconcilingId={reconcilingId}
        canAct={!!user}
        getHealth={intentHealth}
        getHealthLabel={(h) => healthLabel(h, isRTL)}
        getHealthTone={(h) => HEALTH_TONE[h]}
        isPaid={(r) => PAID_STATUSES.has(r.status)}
        isRefunded={(r) => REFUNDED_STATUSES.has(r.status)}
        showReconcile={(r) =>
          !PAID_STATUSES.has(r.status) && !REFUNDED_STATUSES.has(r.status) && r.status !== 'cancelled'
        }
        onReconcile={(r) => handleReconcile(r as IntentRow)}
        onMarkPaidClick={(r) => {
          setActiveIntent(r as IntentRow);
          setExternalPaymentId(r.provider_intent_id || '');
          setInvoiceId(r.invoice_id || '');
          setPaidAt('');
          setNotes('');
        }}
        onMarkRefundedClick={(r) => {
          setActiveRefundIntent(r as IntentRow);
          setRefundReference('');
          setRefundedAt('');
          setRefundNotes('');
        }}
        titleIcon={<CreditCard className="w-5 h-5" />}
      />

      {activeIntent && (
        <PaymentManualForm
          isRTL={isRTL}
          intentId={activeIntent.id}
          externalPaymentId={externalPaymentId}
          invoiceId={invoiceId}
          paidAt={paidAt}
          notes={notes}
          submitting={submitting}
          canSubmit={!!user}
          onExternalPaymentIdChange={setExternalPaymentId}
          onInvoiceIdChange={setInvoiceId}
          onPaidAtChange={setPaidAt}
          onNotesChange={setNotes}
          onCancel={resetForm}
          onSubmit={handleSubmit}
        />
      )}

      {activeRefundIntent && (
        <PaymentRefundForm
          isRTL={isRTL}
          intentId={activeRefundIntent.id}
          refundReference={refundReference}
          refundedAt={refundedAt}
          refundNotes={refundNotes}
          submitting={refundSubmitting}
          canSubmit={!!user}
          onRefundReferenceChange={setRefundReference}
          onRefundedAtChange={setRefundedAt}
          onRefundNotesChange={setRefundNotes}
          onCancel={resetRefundForm}
          onSubmit={handleRefundSubmit}
        />
      )}

      <MembershipWebhookEventsSection
        isRTL={isRTL}
        isLoading={eventsLoading}
        rows={filteredEvents}
        filter={eventFilter}
        onFilterChange={setEventFilter}
        getEventStatusLabel={eventStatusLabel}
        getSummary={extractSafePayloadSummary}
      />
    </div>
    </DashboardLayout>
  );
};

export default AdminMembershipPayments;
