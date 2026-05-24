import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, CreditCard, Check, History } from 'lucide-react';
import {
  listMembershipPaymentIntents,
  listMembershipPaymentWebhookEvents,
  markMembershipPaidManually,
  type MarkMembershipPaidManuallyResult,
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

const STATUS_TONE: Record<string, string> = {
  succeeded: 'bg-success/10 text-success border-success/30',
  created: 'bg-info/10 text-info border-info/30',
  requires_action: 'bg-warning/10 text-warning border-warning/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  refunded: 'bg-muted text-muted-foreground border-border',
};

const PAID_STATUSES = new Set(['succeeded', 'refunded']);

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
                        {isPaid ? (
                          <Badge variant="outline" className="gap-1">
                            <Check className="w-3 h-3" />
                            {isRTL ? 'مدفوع' : 'Paid'}
                          </Badge>
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
    </div>
  );
};

export default AdminMembershipPayments;