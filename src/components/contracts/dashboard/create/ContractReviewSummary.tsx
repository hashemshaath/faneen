import React from 'react';
import { FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StatusGuidanceShape {
  meaning_ar: string;
  meaning_en: string;
  next_actions_ar: string[];
  next_actions_en: string[];
}

interface ContractReviewSummaryProps {
  isRTL: boolean;
  guide: StatusGuidanceShape;
  clientLabel: string;
  workTypeLabel: string;
  templateLabel: string;
  pricingMethodLabel: string;
  amountLabel: string;
  vatLabel: string;
  datesLabel: string;
  missing: string[];
  /** Phase E — Optional party/scope rows surfaced in the pre-submit review. */
  firstPartyLabel?: string;
  secondPartyLabel?: string;
  executionSiteLabel?: string;
  sectorLabel?: string;
  scopeOfWorkLabel?: string;
  warrantyLabel?: string;
  paymentTermsLabel?: string;
  executionDurationLabel?: string;
  deliveryTermsLabel?: string;
  /** Non-blocking warnings shown alongside missing-fields banner. */
  warnings?: string[];
}

/**
 * Read-only review card shown at the end of the create-contract flow.
 * Receives all computed strings from the parent — no business logic.
 */
export const ContractReviewSummary: React.FC<ContractReviewSummaryProps> = ({
  isRTL,
  guide,
  clientLabel,
  workTypeLabel,
  templateLabel,
  pricingMethodLabel,
  amountLabel,
  vatLabel,
  datesLabel,
  missing,
  firstPartyLabel,
  secondPartyLabel,
  executionSiteLabel,
  sectorLabel,
  scopeOfWorkLabel,
  warrantyLabel,
  paymentTermsLabel,
  executionDurationLabel,
  deliveryTermsLabel,
  warnings,
}) => {
  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2" data-testid="contract-review-summary">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <FileCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        {isRTL ? 'مراجعة العقد قبل الإرسال' : 'Review contract before submission'}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {firstPartyLabel !== undefined && (
          <div data-testid="review-first-party"><span className="text-muted-foreground">{isRTL ? 'الطرف الأول — الجهة المنفذة:' : 'First party — Executing provider:'}</span> {firstPartyLabel}</div>
        )}
        {secondPartyLabel !== undefined && (
          <div data-testid="review-second-party"><span className="text-muted-foreground">{isRTL ? 'الطرف الثاني — صاحب الحساب:' : 'Second party — Account holder:'}</span> {secondPartyLabel}</div>
        )}
        {executionSiteLabel !== undefined && (
          <div data-testid="review-execution-site"><span className="text-muted-foreground">{isRTL ? 'موقع التنفيذ:' : 'Execution site:'}</span> {executionSiteLabel}</div>
        )}
        {sectorLabel !== undefined && (
          <div data-testid="review-sector"><span className="text-muted-foreground">{isRTL ? 'المجال / التخصص:' : 'Sector / specialty:'}</span> {sectorLabel}</div>
        )}
        <div><span className="text-muted-foreground">{isRTL ? 'العميل:' : 'Client:'}</span> {clientLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'نوع العمل:' : 'Work type:'}</span> {workTypeLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'القالب:' : 'Template:'}</span> {templateLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'طريقة التسعير:' : 'Pricing method:'}</span> {pricingMethodLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'المبلغ:' : 'Amount:'}</span> {amountLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'الضريبة:' : 'VAT:'}</span> {vatLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'تاريخ البدء/الانتهاء:' : 'Dates:'}</span> {datesLabel}</div>
        {scopeOfWorkLabel !== undefined && (
          <div data-testid="review-scope-of-work"><span className="text-muted-foreground">{isRTL ? 'نطاق العمل:' : 'Scope of work:'}</span> {scopeOfWorkLabel}</div>
        )}
        {warrantyLabel !== undefined && (
          <div data-testid="review-warranty"><span className="text-muted-foreground">{isRTL ? 'الضمان:' : 'Warranty:'}</span> {warrantyLabel}</div>
        )}
        {paymentTermsLabel !== undefined && (
          <div data-testid="review-payment-terms"><span className="text-muted-foreground">{isRTL ? 'الدفعات:' : 'Payment terms:'}</span> {paymentTermsLabel}</div>
        )}
        {executionDurationLabel !== undefined && (
          <div data-testid="review-execution-duration"><span className="text-muted-foreground">{isRTL ? 'مدة التنفيذ:' : 'Execution duration:'}</span> {executionDurationLabel}</div>
        )}
        {deliveryTermsLabel !== undefined && (
          <div data-testid="review-delivery-terms"><span className="text-muted-foreground">{isRTL ? 'شروط التسليم:' : 'Delivery terms:'}</span> {deliveryTermsLabel}</div>
        )}
      </div>
      {missing.length > 0 && (
        <div className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded-lg p-2" data-testid="review-missing">
          {isRTL ? 'حقول مطلوبة ناقصة: ' : 'Missing required fields: '}{missing.join(' · ')}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="text-[10px] text-muted-foreground bg-muted/40 border border-border/40 rounded-lg p-2" data-testid="review-warnings">
          {isRTL ? 'تنبيهات: ' : 'Notices: '}{warnings.join(' · ')}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
        <strong className="text-foreground">{isRTL ? 'الحالة الأولى:' : 'Initial status:'}</strong>{' '}
        {isRTL ? 'مسودة' : 'Draft'} — {isRTL ? guide.meaning_ar : guide.meaning_en}
      </div>
      <div className="flex flex-wrap gap-1">
        {(isRTL ? guide.next_actions_ar : guide.next_actions_en).map((a) => (
          <Badge key={a} variant="outline" className="text-[9px]">{a}</Badge>
        ))}
      </div>
    </div>
  );
};

export default ContractReviewSummary;