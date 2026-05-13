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
}) => {
  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <FileCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        {isRTL ? 'مراجعة قبل الحفظ' : 'Review before saving'}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div><span className="text-muted-foreground">{isRTL ? 'العميل:' : 'Client:'}</span> {clientLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'نوع العمل:' : 'Work type:'}</span> {workTypeLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'القالب:' : 'Template:'}</span> {templateLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'طريقة التسعير:' : 'Pricing method:'}</span> {pricingMethodLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'المبلغ:' : 'Amount:'}</span> {amountLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'الضريبة:' : 'VAT:'}</span> {vatLabel}</div>
        <div><span className="text-muted-foreground">{isRTL ? 'تاريخ البدء/الانتهاء:' : 'Dates:'}</span> {datesLabel}</div>
      </div>
      {missing.length > 0 && (
        <div className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded-lg p-2">
          {isRTL ? 'حقول مطلوبة ناقصة: ' : 'Missing required fields: '}{missing.join(' · ')}
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