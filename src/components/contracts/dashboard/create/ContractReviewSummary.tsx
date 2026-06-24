import React from 'react';
import {
  FileCheck, Users, Briefcase, MapPin, FileText, CreditCard,
  ShieldCheck, Calendar, Truck, Paperclip, AlertTriangle, Info,
  ClipboardList, ScrollText, CheckCircle2, Building2, User,
} from 'lucide-react';
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
  contractTermsLabel?: string;
  warrantyLabel?: string;
  paymentTermsLabel?: string;
  executionDurationLabel?: string;
  deliveryTermsLabel?: string;
  attachmentLabel?: string;
  /** Non-blocking warnings shown alongside missing-fields banner. */
  warnings?: string[];
}

const EMPTY_TOKENS = new Set(['—', '-', '']);
const isEmptyValue = (v?: string | null): boolean =>
  v == null || EMPTY_TOKENS.has(v.trim());

interface RowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  testId?: string;
  emptyHint?: string;
}
const Row: React.FC<RowProps> = ({ icon: Icon, label, value, testId, emptyHint }) => {
  const empty = isEmptyValue(value);
  return (
    <div
      data-testid={testId}
      className={`group flex items-start gap-2 rounded-lg border p-2.5 transition-colors ${
        empty
          ? 'border-dashed border-border/50 bg-muted/30'
          : 'border-border/40 bg-card/60 hover:border-primary/40'
      }`}
    >
      <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
        empty ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
      }`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className={`text-[11.5px] font-semibold leading-snug break-words ${
          empty ? 'text-muted-foreground/70 italic font-normal' : 'text-foreground'
        }`}>
          {empty ? (emptyHint ?? value ?? '—') : value}
        </div>
      </div>
    </div>
  );
};

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: 'primary' | 'accent' | 'success' | 'info';
  children: React.ReactNode;
}
const TONE: Record<NonNullable<SectionProps['tone']>, string> = {
  primary: 'text-primary',
  accent:  'text-accent',
  success: 'text-success',
  info:    'text-info',
};
const Section: React.FC<SectionProps> = ({ icon: Icon, title, tone = 'primary', children }) => (
  <div className="space-y-2">
    <div className={`flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider ${TONE[tone]}`}>
      <Icon className="w-3 h-3" />
      <span>{title}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{children}</div>
  </div>
);

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
  contractTermsLabel,
  warrantyLabel,
  paymentTermsLabel,
  executionDurationLabel,
  deliveryTermsLabel,
  attachmentLabel,
  warnings,
}) => {
  const emptyHint = isRTL ? 'لم يُحدَّد بعد' : 'Not set yet';
  const totalFields = 7
    + (firstPartyLabel !== undefined ? 1 : 0)
    + (secondPartyLabel !== undefined ? 1 : 0)
    + (executionSiteLabel !== undefined ? 1 : 0)
    + (sectorLabel !== undefined ? 1 : 0)
    + (scopeOfWorkLabel !== undefined ? 1 : 0)
    + (contractTermsLabel !== undefined ? 1 : 0)
    + (warrantyLabel !== undefined ? 1 : 0)
    + (paymentTermsLabel !== undefined ? 1 : 0)
    + (executionDurationLabel !== undefined ? 1 : 0)
    + (deliveryTermsLabel !== undefined ? 1 : 0)
    + (attachmentLabel !== undefined ? 1 : 0);
  const values = [
    firstPartyLabel, secondPartyLabel, executionSiteLabel, sectorLabel,
    clientLabel, workTypeLabel, templateLabel, pricingMethodLabel,
    amountLabel, vatLabel, datesLabel, scopeOfWorkLabel, contractTermsLabel,
    warrantyLabel, paymentTermsLabel, executionDurationLabel,
    deliveryTermsLabel, attachmentLabel,
  ];
  const filled = values.filter((v) => v !== undefined && !isEmptyValue(v)).length;
  const completionPct = totalFields > 0 ? Math.round((filled / totalFields) * 100) : 0;
  const isReady = missing.length === 0;

  return (
    <div
      data-testid="contract-review-summary"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden shadow-[var(--elev-1)]"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary/15 bg-primary/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <FileCheck className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-xs font-bold">
              {isRTL ? 'مراجعة العقد قبل الإرسال' : 'Review contract before submission'}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {isRTL
                ? 'تأكَّد من المعلومات أدناه. سيتم الحفظ كمسودة قابلة للتعديل.'
                : 'Verify the information below. It will be saved as an editable draft.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isReady ? 'default' : 'outline'}
            className={`text-[10px] gap-1 ${isReady ? 'bg-success text-success-foreground hover:bg-success' : 'border-warning/50 text-warning'}`}
          >
            {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {isReady
              ? (isRTL ? 'جاهز للإرسال' : 'Ready to submit')
              : (isRTL ? `${missing.length} حقل ناقص` : `${missing.length} missing`)}
          </Badge>
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${isReady ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Parties & Site */}
        <Section icon={Users} title={isRTL ? 'الأطراف والموقع' : 'Parties & Site'} tone="primary">
          {firstPartyLabel !== undefined && (
            <Row icon={Building2}
              label={isRTL ? 'الطرف الأول — الجهة المنفذة' : 'First party — Provider'}
              value={firstPartyLabel} testId="review-first-party" emptyHint={emptyHint} />
          )}
          {secondPartyLabel !== undefined && (
            <Row icon={User}
              label={isRTL ? 'الطرف الثاني — صاحب الحساب' : 'Second party — Account holder'}
              value={secondPartyLabel} testId="review-second-party" emptyHint={emptyHint} />
          )}
          <Row icon={User}
            label={isRTL ? 'العميل' : 'Client'} value={clientLabel} emptyHint={emptyHint} />
          {executionSiteLabel !== undefined && (
            <Row icon={MapPin}
              label={isRTL ? 'موقع التنفيذ' : 'Execution site'}
              value={executionSiteLabel} testId="review-execution-site" emptyHint={emptyHint} />
          )}
        </Section>

        {/* Scope */}
        <Section icon={Briefcase} title={isRTL ? 'نطاق ومحتوى العقد' : 'Scope & Content'} tone="info">
          {sectorLabel !== undefined && (
            <Row icon={ClipboardList}
              label={isRTL ? 'المجال / التخصص' : 'Sector / specialty'}
              value={sectorLabel} testId="review-sector" emptyHint={emptyHint} />
          )}
          <Row icon={Briefcase}
            label={isRTL ? 'نوع العمل' : 'Work type'} value={workTypeLabel} emptyHint={emptyHint} />
          <Row icon={ScrollText}
            label={isRTL ? 'القالب' : 'Template'} value={templateLabel} emptyHint={emptyHint} />
          {scopeOfWorkLabel !== undefined && (
            <Row icon={FileText}
              label={isRTL ? 'نطاق العمل' : 'Scope of work'}
              value={scopeOfWorkLabel} testId="review-scope-of-work" emptyHint={emptyHint} />
          )}
          {contractTermsLabel !== undefined && (
            <Row icon={ScrollText}
              label={isRTL ? 'بنود العقد' : 'Contract terms'}
              value={contractTermsLabel} testId="review-contract-terms" emptyHint={emptyHint} />
          )}
        </Section>

        {/* Pricing */}
        <Section icon={CreditCard} title={isRTL ? 'التسعير والمالية' : 'Pricing & Finance'} tone="accent">
          <Row icon={CreditCard}
            label={isRTL ? 'طريقة التسعير' : 'Pricing method'} value={pricingMethodLabel} emptyHint={emptyHint} />
          <Row icon={CreditCard}
            label={isRTL ? 'المبلغ' : 'Amount'} value={amountLabel} emptyHint={emptyHint} />
          <Row icon={CreditCard}
            label={isRTL ? 'الضريبة' : 'VAT'} value={vatLabel} emptyHint={emptyHint} />
          {paymentTermsLabel !== undefined && (
            <Row icon={CreditCard}
              label={isRTL ? 'الدفعات' : 'Payment terms'}
              value={paymentTermsLabel} testId="review-payment-terms" emptyHint={emptyHint} />
          )}
        </Section>

        {/* Timeline & Terms */}
        <Section icon={Calendar} title={isRTL ? 'المدة والضمانات' : 'Timeline & Warranties'} tone="success">
          <Row icon={Calendar}
            label={isRTL ? 'تاريخ البدء / الانتهاء' : 'Start / End dates'} value={datesLabel} emptyHint={emptyHint} />
          {executionDurationLabel !== undefined && (
            <Row icon={Calendar}
              label={isRTL ? 'مدة التنفيذ' : 'Execution duration'}
              value={executionDurationLabel} testId="review-execution-duration" emptyHint={emptyHint} />
          )}
          {warrantyLabel !== undefined && (
            <Row icon={ShieldCheck}
              label={isRTL ? 'الضمان' : 'Warranty'}
              value={warrantyLabel} testId="review-warranty" emptyHint={emptyHint} />
          )}
          {deliveryTermsLabel !== undefined && (
            <Row icon={Truck}
              label={isRTL ? 'شروط التسليم' : 'Delivery terms'}
              value={deliveryTermsLabel} testId="review-delivery-terms" emptyHint={emptyHint} />
          )}
          {attachmentLabel !== undefined && (
            <Row icon={Paperclip}
              label={isRTL ? 'المرفقات' : 'Attachments'}
              value={attachmentLabel} testId="review-attachments" emptyHint={emptyHint} />
          )}
        </Section>

        {/* Missing fields */}
        {missing.length > 0 && (
          <div
            data-testid="review-missing"
            className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-warning">
              <AlertTriangle className="w-3.5 h-3.5" />
              {isRTL ? `حقول مطلوبة ناقصة (${missing.length})` : `Missing required fields (${missing.length})`}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {missing.map((m) => (
                <li key={m} className="flex items-start gap-1.5 text-[10.5px] text-foreground/80">
                  <span className="mt-1 w-1 h-1 rounded-full bg-warning shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div
            data-testid="review-warnings"
            className="rounded-xl border border-border/40 bg-muted/30 p-2.5 flex items-start gap-2"
          >
            <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
            <div className="text-[10.5px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {isRTL ? 'تنبيهات: ' : 'Notices: '}
              </span>
              {warnings.join(' · ')}
            </div>
          </div>
        )}

        {/* Status footer */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold">{isRTL ? 'الحالة الأولى:' : 'Initial status:'}</span>
            <Badge variant="outline" className="text-[9px]">{isRTL ? 'مسودة' : 'Draft'}</Badge>
          </div>
          <p className="text-[10.5px] text-muted-foreground leading-relaxed">
            {isRTL ? guide.meaning_ar : guide.meaning_en}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {(isRTL ? guide.next_actions_ar : guide.next_actions_en).map((a) => (
              <Badge key={a} variant="secondary" className="text-[9px]">{a}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractReviewSummary;