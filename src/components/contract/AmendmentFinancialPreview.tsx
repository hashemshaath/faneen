import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, ArrowRight } from 'lucide-react';
import {
  previewAmendmentFinancialImpact,
  type AmendmentPreviewInput,
  type AmendmentFinancialPreview as AmendmentFinancialPreviewResult,
} from '@/lib/contract-financials';

interface Props {
  input: AmendmentPreviewInput;
  isRTL: boolean;
}

const BLOCK_LABEL: Record<string, { ar: string; en: string }> = {
  missing_new_amount:        { ar: 'القيمة الجديدة مطلوبة',                              en: 'New amount is required' },
  invalid_new_amount:        { ar: 'القيمة الجديدة غير صالحة',                           en: 'New amount is invalid' },
  overpaid_refund_required:  { ar: 'القيمة الجديدة أقل من المدفوع — يلزم استرداد',       en: 'New total is below paid total — refund required' },
  invalid_vat:               { ar: 'قيمة الضريبة غير صالحة',                             en: 'Invalid VAT value' },
  currency_missing:          { ar: 'العملة غير محددة',                                   en: 'Currency missing' },
};

const WARN_LABEL: Record<string, { ar: string; en: string }> = {
  manual_schedule_required:      { ar: 'لا يوجد جدول دفعات — يلزم إنشاؤه يدوياً.',                       en: 'No payment schedule — needs manual creation.' },
  milestone_dates_not_shifted:   { ar: 'تواريخ المراحل لن تُعدّل تلقائياً، راجعها يدوياً.',              en: 'Milestone dates are not auto-shifted; review manually.' },
  pending_row_zeroed:            { ar: 'بعض الدفعات غير المدفوعة ستصبح صفراً بعد إعادة التوزيع.',         en: 'Some unpaid installments will become zero after redistribution.' },
  milestone_link_drift:          { ar: 'قد تنحرف ارتباطات المراحل بعد التطبيق.',                          en: 'Milestone links may drift after apply.' },
  rpc_does_not_redistribute_yet: { ar: 'سيتم تحديث الدفعات المعلقة فقط. الدفعات المدفوعة لن تتغير.', en: 'Only pending payments will be updated. Paid payments will remain unchanged.' },
  documentation_only:            { ar: 'هذا التعديل توثيقي فقط ولا يؤثر مالياً.',                          en: 'This amendment is documentation-only and has no financial impact.' },
};

const fmtMoney = (n: number, currency: string) =>
  `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

export const AmendmentFinancialPreview = ({ input, isRTL }: Props) => {
  const p: AmendmentFinancialPreviewResult = previewAmendmentFinancialImpact(input);
  const isAmount = p.type === 'amount_change';
  const isDate = p.type === 'date_change';
  const isMeasurement = p.type === 'measurement_change';

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-primary" />
        <h5 className="font-heading font-bold text-xs">
          {isRTL ? 'معاينة أثر التعديل' : 'Amendment impact preview'}
        </h5>
      </div>

      {/* Money strip — only meaningful when amount changes */}
      {isAmount && (
        <>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'القيمة الحالية' : 'Old total'}</div>
              <div className="font-semibold tech-content">{fmtMoney(p.oldTotal, p.currency)}</div>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'القيمة الجديدة' : 'New total'}</div>
              <div className="font-semibold tech-content">{fmtMoney(p.newTotal, p.currency)}</div>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'الفرق' : 'Delta'}</div>
              <div className={`font-semibold tech-content ${p.amountDelta >= 0 ? 'text-success' : 'text-destructive'}`}>
                {p.amountDelta >= 0 ? '+' : ''}{fmtMoney(p.amountDelta, p.currency)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded-lg bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'الضريبة قبل' : 'VAT before'}</div>
              <div className="font-medium tech-content">{fmtMoney(p.oldVatAmount, p.currency)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'الضريبة بعد' : 'VAT after'}</div>
              <div className="font-medium tech-content">{fmtMoney(p.newVatAmount, p.currency)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'المدفوع' : 'Paid total'}</div>
              <div className="font-medium tech-content">{fmtMoney(p.paidTotal, p.currency)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground text-[9px]">{isRTL ? 'المتبقي بعد التعديل' : 'New remaining'}</div>
              <div className={`font-medium tech-content ${p.newRemaining < 0 ? 'text-destructive' : ''}`}>
                {fmtMoney(p.newRemaining, p.currency)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Date impact */}
      {isDate && (
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px] flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground text-[9px]">{isRTL ? 'تاريخ الانتهاء' : 'End date'}</span>
          <span className="tech-content">{p.oldEndDate ?? '—'}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-semibold tech-content">{p.newEndDate ?? '—'}</span>
        </div>
      )}

      {/* Schedule diff table */}
      {isAmount && p.rowDiffs.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">
            {isRTL ? 'أثر جدول الدفعات' : 'Payment schedule impact'}
          </div>
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-start">#</th>
                  <th className="px-2 py-1 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-2 py-1 text-end">{isRTL ? 'قبل' : 'Before'}</th>
                  <th className="px-2 py-1 text-end">{isRTL ? 'بعد' : 'After'}</th>
                  <th className="px-2 py-1 text-center">{isRTL ? 'تغيير' : 'Change'}</th>
                </tr>
              </thead>
              <tbody>
                {p.rowDiffs.map(r => (
                  <tr key={r.id} className="border-t border-border/30">
                    <td className="px-2 py-1 tech-content">{r.installmentNumber ?? '—'}</td>
                    <td className="px-2 py-1">{r.status}</td>
                    <td className="px-2 py-1 text-end tech-content">{fmtMoney(r.oldAmount, p.currency)}</td>
                    <td className="px-2 py-1 text-end tech-content">{fmtMoney(r.newAmount, p.currency)}</td>
                    <td className="px-2 py-1 text-center">
                      {r.isPaid ? (
                        <Badge variant="muted" size="sm">{isRTL ? 'ثابت' : 'Locked'}</Badge>
                      ) : r.adjusted ? (
                        <Badge variant="warning" size="sm">{isRTL ? 'معدّل' : 'Adjusted'}</Badge>
                      ) : (
                        <Badge variant="outline" size="sm">{isRTL ? 'بدون تغيير' : 'Unchanged'}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blocking errors */}
      {p.blockingErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 space-y-1">
          {p.blockingErrors.map(code => {
            const lbl = BLOCK_LABEL[code] ?? { ar: code, en: code };
            return (
              <div key={code} className="flex items-start gap-1.5 text-[11px] text-destructive">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{isRTL ? lbl.ar : lbl.en}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {p.warnings.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-2 space-y-1">
          {p.warnings.map(code => {
            const lbl = WARN_LABEL[code] ?? { ar: code, en: code };
            return (
              <div key={code} className="flex items-start gap-1.5 text-[11px] text-warning">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{isRTL ? lbl.ar : lbl.en}</span>
              </div>
            );
          })}
        </div>
      )}

      {isMeasurement && (
        <p className="text-[10px] text-muted-foreground">
          {isRTL
            ? 'سيتم اعتماد سجل تغييرات المقاسات في مرحلة لاحقة (C5E).'
            : 'Measurement change history will be enabled in a later phase (C5E).'}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        {isRTL
          ? 'سيتم تحديث الدفعات المعلقة فقط. الدفعات المدفوعة لن تتغير.'
          : 'Only pending payments will be updated. Paid payments will remain unchanged.'}
      </p>
    </div>
  );
};

export const previewHasBlockingErrors = (input: AmendmentPreviewInput): boolean =>
  previewAmendmentFinancialImpact(input).blockingErrors.length > 0;
