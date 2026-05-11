import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, FileText, Info, Clock, XCircle, Ban, PlayCircle, PenLine, AlertTriangle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { AmendmentFinancialPreview } from './AmendmentFinancialPreview';
import { previewAmendmentFinancialImpact, type AmendmentPreviewPayment } from '@/lib/contract-financials';

type Amendment = Database['public']['Tables']['contract_amendments']['Row'];
type AuditRow = Database['public']['Tables']['contract_amendment_audit']['Row'];

interface Props {
  amendments: Amendment[];
  currencyCode: string;
  isRTL: boolean;
  isClient: boolean;
  isProvider: boolean;
  isContractLocked: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  onApprove: (a: Amendment) => void;
  approving: boolean;
  onReject: (amendmentId: string, reason: string) => void;
  rejecting: boolean;
  onCancel: (amendmentId: string) => void;
  cancelling: boolean;
  onApply: (amendmentId: string) => void;
  applying: boolean;
  contract?: {
    total_amount?: number | string | null;
    vat_rate?: number | string | null;
    vat_inclusive?: boolean | null;
    currency_code?: string | null;
    end_date?: string | null;
  } | null;
  installmentPayments?: AmendmentPreviewPayment[] | null;
}

const STATUS_LABEL: Record<string, { ar: string; en: string; cls: string }> = {
  pending:   { ar: 'قيد المراجعة', en: 'Pending',   cls: 'border-warning/40 bg-warning/10 text-warning' },
  approved:  { ar: 'معتمد',         en: 'Approved',  cls: 'border-success/40 bg-success/10 text-success' },
  rejected:  { ar: 'مرفوض',         en: 'Rejected',  cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
  applied:   { ar: 'مطبق',          en: 'Applied',   cls: 'border-primary/40 bg-primary/10 text-primary' },
  cancelled: { ar: 'ملغي',          en: 'Cancelled', cls: 'border-muted bg-muted text-muted-foreground' },
};

const ACTION_META: Record<string, { ar: string; en: string; Icon: typeof CheckCircle2 }> = {
  created:           { ar: 'تم إنشاء الطلب',          en: 'Request created',     Icon: PenLine },
  approved_client:   { ar: 'وافق العميل',              en: 'Client approved',     Icon: CheckCircle2 },
  approved_provider: { ar: 'وافق المزود',              en: 'Provider approved',   Icon: CheckCircle2 },
  rejected:          { ar: 'تم الرفض',                  en: 'Rejected',            Icon: XCircle },
  cancelled:         { ar: 'تم الإلغاء',                en: 'Cancelled',           Icon: Ban },
  applied:           { ar: 'تم التطبيق على العقد',      en: 'Applied to contract', Icon: PlayCircle },
};

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  scope_change:        { ar: 'نطاق العمل',        en: 'Scope' },
  amount_change:       { ar: 'قيمة العقد',         en: 'Amount' },
  date_change:         { ar: 'تاريخ الانتهاء',     en: 'End date' },
  measurement_change:  { ar: 'المقاسات',           en: 'Measurements' },
  financial:           { ar: 'مالي',                en: 'Financial' },
  extension:           { ar: 'تمديد',               en: 'Extension' },
  other:               { ar: 'أخرى',                en: 'Other' },
};

const fmt = (d: string | null | undefined, isRTL: boolean) =>
  d ? new Date(d).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const AmendmentHistoryPanel = ({
  amendments, currencyCode, isRTL, isClient, isProvider, isContractLocked,
  currentUserId, isAdmin,
  onApprove, approving,
  onReject, rejecting,
  onCancel, cancelling,
  onApply, applying,
  contract, installmentPayments,
}: Props) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const ids = amendments.map(a => a.id);

  const { data: auditRows = [] } = useQuery({
    queryKey: ['amendment-audit', ids.join(',')],
    queryFn: async (): Promise<AuditRow[]> => {
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('contract_amendment_audit')
        .select('*')
        .in('amendment_id', ids)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: ids.length > 0,
  });

  const auditByAmendment = new Map<string, AuditRow[]>();
  for (const r of auditRows) {
    const arr = auditByAmendment.get(r.amendment_id) ?? [];
    arr.push(r);
    auditByAmendment.set(r.amendment_id, arr);
  }

  if (amendments.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{isRTL ? 'بعد اعتماد العقد، تتم التعديلات الجوهرية عبر الملاحق فقط.' : 'After contract activation, material changes go through amendments only.'}</span>
        </div>
        <div className="text-center py-8">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-muted-foreground font-body text-sm">
            {isRTL ? 'لا توجد ملاحق أو طلبات تعديل لهذا العقد بعد.' : 'No amendments or change requests for this contract yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{isRTL ? 'بعد اعتماد العقد، تتم التعديلات الجوهرية عبر الملاحق فقط.' : 'After contract activation, material changes go through amendments only.'}</span>
      </div>

      {amendments.map((a, idx) => {
        const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
        const t = TYPE_LABEL[a.amendment_type] ?? { ar: a.amendment_type, en: a.amendment_type };
        const audit = auditByAmendment.get(a.id) ?? [];
        const isRequester = currentUserId != null && a.requested_by === currentUserId;
        // A party can approve only their own side, and never their own request.
        const canApprove =
          a.status === 'pending' && !isRequester &&
          ((isClient && !a.client_approved_at) || (isProvider && !a.provider_approved_at));
        const canReject = a.status === 'pending' && (isClient || isProvider) && !isRequester;
        const canCancel = isRequester && (a.status === 'pending' || a.status === 'approved');
        const canApply = a.status === 'approved' && (isProvider || isAdmin);

        // C5D.1 financial preview (only meaningful for approved amendments)
        const previewInput = contract
          ? { contract, amendment: a, payments: installmentPayments ?? [] }
          : null;
        const preview = a.status === 'approved' && previewInput
          ? previewAmendmentFinancialImpact(previewInput)
          : null;
        const applyBlocked = !!preview && preview.blockingErrors.length > 0;

        return (
          <div key={a.id} className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3 hover-lift">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground tech-content">#{amendments.length - idx}</span>
                  <h4 className="font-heading font-bold text-sm truncate">{isRTL ? a.title_ar : (a.title_en || a.title_ar)}</h4>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(a.created_at, isRTL)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className="text-[9px]">{isRTL ? t.ar : t.en}</Badge>
                <Badge variant="outline" className={`text-[10px] ${s.cls}`}>{isRTL ? s.ar : s.en}</Badge>
              </div>
            </div>

            {/* Description / reason */}
            {(a.description_ar || a.description_en) && (
              <p className="text-xs text-muted-foreground font-body">
                {isRTL ? (a.description_ar || a.description_en) : (a.description_en || a.description_ar)}
              </p>
            )}
            {a.reason && (
              <p className="text-[11px] text-muted-foreground italic">
                <span className="font-medium">{isRTL ? 'السبب: ' : 'Reason: '}</span>{a.reason}
              </p>
            )}

            {/* Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              {a.new_amount != null && (
                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[9px]">{isRTL ? 'المبلغ الجديد' : 'New amount'}</div>
                  <div className="font-semibold tech-content">{Number(a.new_amount).toLocaleString()} {currencyCode}</div>
                </div>
              )}
              {a.new_end_date && (
                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[9px]">{isRTL ? 'تاريخ الانتهاء الجديد' : 'New end date'}</div>
                  <div className="font-semibold tech-content">{a.new_end_date}</div>
                </div>
              )}
              {a.amount_delta != null && (
                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[9px]">{isRTL ? 'الفرق' : 'Delta'}</div>
                  <div className={`font-semibold tech-content ${Number(a.amount_delta) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {Number(a.amount_delta) >= 0 ? '+' : ''}{Number(a.amount_delta).toLocaleString()} {currencyCode}
                  </div>
                </div>
              )}
            </div>

            {/* Approval status */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                {a.client_approved_at
                  ? (isRTL ? 'تمت الموافقة من العميل' : 'Client approved') + ' ✅'
                  : (isRTL ? 'بانتظار موافقة العميل' : 'Awaiting client') + ' ⏳'}
              </span>
              <span>
                {a.provider_approved_at
                  ? (isRTL ? 'تمت الموافقة من المزود' : 'Provider approved') + ' ✅'
                  : (isRTL ? 'بانتظار موافقة المزود' : 'Awaiting provider') + ' ⏳'}
              </span>
              {a.applied_at && (
                <span className="text-primary">{isRTL ? 'طُبّق في: ' : 'Applied: '}{fmt(a.applied_at, isRTL)}</span>
              )}
              {a.cancelled_at && (
                <span>{isRTL ? 'أُلغي في: ' : 'Cancelled: '}{fmt(a.cancelled_at, isRTL)}</span>
              )}
              {a.rejection_reason && (
                <span className="text-destructive">{isRTL ? 'سبب الرفض: ' : 'Rejection: '}{a.rejection_reason}</span>
              )}
            </div>

            {/* Audit timeline */}
            {audit.length > 0 && (
              <div className="border-t border-border/40 pt-3">
                <div className="text-[10px] font-medium text-muted-foreground mb-2">{isRTL ? 'سجل التغييرات' : 'Activity timeline'}</div>
                <ol className="space-y-1.5">
                  {audit.map(row => {
                    const meta = ACTION_META[row.action] ?? { ar: row.action, en: row.action, Icon: Clock };
                    const Icon = meta.Icon;
                    return (
                      <li key={row.id} className="flex items-start gap-2 text-[11px]">
                        <Icon className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{isRTL ? meta.ar : meta.en}</span>
                            {row.old_status && row.new_status && row.old_status !== row.new_status && (
                              <span className="text-[9px] text-muted-foreground tech-content">
                                {row.old_status} → {row.new_status}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{fmt(row.created_at, isRTL)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* C5D.1: financial impact preview for approved amendments */}
            {a.status === 'approved' && previewInput && (
              <AmendmentFinancialPreview input={previewInput} isRTL={isRTL} />
            )}

            {/* Action buttons */}
            {(canApprove || canReject || canCancel || canApply) && rejectingId !== a.id && cancellingId !== a.id && (
              <div className="flex flex-wrap gap-2 pt-1">
                {canApprove && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-[10px] gap-1 text-success border-success/60"
                    disabled={approving}
                    onClick={() => onApprove(a)}
                  >
                    <CheckCircle2 className="w-3 h-3" />{isRTL ? 'اعتماد طلب التعديل' : 'Approve amendment'}
                  </Button>
                )}
                {canReject && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-[10px] gap-1 text-destructive border-destructive/60"
                    onClick={() => { setRejectingId(a.id); setRejectReason(''); }}
                  >
                    <XCircle className="w-3 h-3" />{isRTL ? 'رفض طلب التعديل' : 'Reject amendment'}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-[10px] gap-1 text-muted-foreground"
                    onClick={() => setCancellingId(a.id)}
                  >
                    <Ban className="w-3 h-3" />{isRTL ? 'إلغاء طلب التعديل' : 'Cancel amendment'}
                  </Button>
                )}
                {canApply && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-[10px] gap-1 text-primary border-primary/60"
                    disabled={applying || applyBlocked}
                    onClick={() => onApply(a.id)}
                    title={applyBlocked ? (isRTL ? 'يتعذر التطبيق — راجع الأخطاء أعلاه' : 'Cannot apply — see errors above') : undefined}
                  >
                    <PlayCircle className="w-3 h-3" />{isRTL ? 'تطبيق على العقد' : 'Apply to contract'}
                  </Button>
                )}
              </div>
            )}

            {canApply && !preview && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-2 flex items-start gap-2 text-[10px] text-warning">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{isRTL
                  ? 'سيتم تطبيق التعديل على العقد. لا يتم حالياً إعادة توزيع جدول الدفعات تلقائياً.'
                  : 'This will apply the amendment to the contract. Payment schedule is not automatically redistributed.'}</span>
              </div>
            )}

            {/* Inline reject form */}
            {rejectingId === a.id && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <div className="text-xs font-medium text-destructive">{isRTL ? 'رفض طلب التعديل' : 'Reject amendment'}</div>
                <Textarea
                  placeholder={isRTL ? 'سبب الرفض *' : 'Rejection reason *'}
                  value={rejectReason} dir="auto" rows={2} maxLength={500}
                  onChange={e => setRejectReason(e.target.value)}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="destructive" className="h-7 text-[10px]"
                    disabled={rejecting || rejectReason.trim().length < 3}
                    onClick={() => { onReject(a.id, rejectReason.trim()); setRejectingId(null); setRejectReason(''); }}
                  >
                    {isRTL ? 'تأكيد الرفض' : 'Confirm rejection'}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px]"
                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            )}

            {/* Inline cancel confirmation */}
            {cancellingId === a.id && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-medium">{isRTL ? 'تأكيد إلغاء طلب التعديل؟' : 'Cancel this amendment request?'}</div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="destructive" className="h-7 text-[10px]"
                    disabled={cancelling}
                    onClick={() => { onCancel(a.id); setCancellingId(null); }}
                  >
                    {isRTL ? 'تأكيد الإلغاء' : 'Confirm cancel'}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px]"
                    onClick={() => setCancellingId(null)}
                  >
                    {isRTL ? 'تراجع' : 'Back'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
