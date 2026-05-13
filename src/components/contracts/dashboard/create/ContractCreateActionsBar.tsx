import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Plus } from 'lucide-react';
import type { CreateStepKey } from './ContractCreateStepper';

interface ContractCreateActionsBarProps {
  isRTL: boolean;
  editingId: string | null;
  activeStep: CreateStepKey;
  stepOrder: CreateStepKey[];
  isSaving: boolean;
  saveDisabled: boolean;
  onStepNav: (key: CreateStepKey) => void;
  onSave: () => void;
  /** Optional 0-100 completeness score for inline helper text. */
  completenessScore?: number;
}

/**
 * Inline Back / Next + Save Draft action row at the bottom of the create flow.
 * Pure presentation; parent owns mutation invocation.
 */
export const ContractCreateActionsBar: React.FC<ContractCreateActionsBarProps> = ({
  isRTL,
  editingId,
  activeStep,
  stepOrder,
  isSaving,
  saveDisabled,
  onStepNav,
  onSave,
  completenessScore,
}) => {
  const idx = stepOrder.indexOf(activeStep);
  const prev = idx > 0 ? stepOrder[idx - 1] : null;
  const next = idx < stepOrder.length - 1 ? stepOrder[idx + 1] : null;
  const showLowHelper =
    !editingId && typeof completenessScore === 'number' && completenessScore < 80;

  return (
    <div className="space-y-1.5">
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 text-xs"
        disabled={!prev}
        onClick={() => prev && onStepNav(prev)}
      >
        {isRTL ? '→ السابق' : '← Back'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 text-xs"
        disabled={!next}
        onClick={() => next && onStepNav(next)}
      >
        {isRTL ? 'التالي ←' : 'Next →'}
      </Button>
      <div className="flex-1" />
      <Button
        variant="hero"
        className="gap-2 h-10 shadow-lg"
        disabled={saveDisabled}
        onClick={onSave}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : editingId ? (
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Plus className="w-4 h-4" aria-hidden="true" />
        )}
        {editingId ? (isRTL ? 'تحديث المسودة' : 'Update Draft') : (isRTL ? 'حفظ المسودة' : 'Save Draft')}
      </Button>
    </div>
      {showLowHelper && (
        <p className="text-[10px] text-muted-foreground text-end">
          {isRTL
            ? 'يمكنك حفظ المسودة الآن وإكمال البيانات لاحقًا.'
            : 'You can save the draft now and complete the details later.'}
        </p>
      )}
    </div>
  );
};

interface ContractCreateMobileActionBarProps {
  isRTL: boolean;
  editingId: string | null;
  totalAmount: string;
  currencyCode: string;
  vatRate: string;
  vatInclusive: boolean;
  isSaving: boolean;
  saveDisabled: boolean;
  onSave: () => void;
}

/**
 * Sticky mobile action bar showing the live total and a single save button.
 * Visible on small screens only (lg:hidden).
 */
export const ContractCreateMobileActionBar: React.FC<ContractCreateMobileActionBarProps> = ({
  isRTL,
  editingId,
  totalAmount,
  currencyCode,
  vatRate,
  vatInclusive,
  isSaving,
  saveDisabled,
  onSave,
}) => {
  return (
    <div className="lg:hidden sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-background/95 backdrop-blur border-t border-border/40 flex items-center gap-2 z-20">
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-muted-foreground leading-none">{isRTL ? 'الإجمالي' : 'Total'}</div>
        <div className="text-xs font-bold tech-content truncate">
          {totalAmount ? `${Number(totalAmount).toLocaleString()} ${currencyCode}` : '—'}
          <span className="ms-1 text-[9px] text-muted-foreground font-normal">
            {vatInclusive ? (isRTL ? `شاملة ${vatRate}%` : `incl. ${vatRate}%`) : (isRTL ? `+${vatRate}%` : `+${vatRate}%`)}
          </span>
        </div>
      </div>
      <Button
        variant="hero"
        size="sm"
        className="h-10 text-xs gap-1.5"
        disabled={saveDisabled}
        onClick={onSave}
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        {editingId ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'حفظ المسودة' : 'Save Draft')}
      </Button>
    </div>
  );
};

export default ContractCreateActionsBar;