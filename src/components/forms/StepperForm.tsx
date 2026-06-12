import React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN-REDESIGN PHASE 6 — Horizontal stepper form shell.
 *
 * Renders a numbered step indicator with a validated body slot per step.
 * The parent owns the form state (react-hook-form is recommended) and
 * passes a `validateStep(index)` callback that returns true to allow
 * advancing. Last step's "Next" becomes "Submit".
 *
 * RTL-aware: the chevrons flip via logical icons, not transforms.
 */
export interface StepperStep {
  id: string;
  labelAr: string;
  labelEn: string;
  /** Body rendered when this step is active. */
  content: React.ReactNode;
}

export interface StepperFormProps {
  steps: StepperStep[];
  /** Active step index (0-based). */
  current: number;
  onChange: (next: number) => void;
  /** Return false to block advance from `index`. */
  validateStep?: (index: number) => boolean | Promise<boolean>;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  className?: string;
}

export const StepperForm: React.FC<StepperFormProps> = ({
  steps, current, onChange, validateStep, onSubmit, submitting, className,
}) => {
  const { isRTL } = useLanguage();
  const isLast = current === steps.length - 1;
  const isFirst = current === 0;
  const ChevronNext = isRTL ? ChevronLeft : ChevronRight;
  const ChevronPrev = isRTL ? ChevronRight : ChevronLeft;

  const handleNext = async () => {
    if (validateStep) {
      const ok = await validateStep(current);
      if (!ok) return;
    }
    if (isLast) {
      await onSubmit();
    } else {
      onChange(current + 1);
    }
  };

  return (
    <div className={cn('space-y-5', className)}>
      {/* Step indicator */}
      <ol className="flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label={isRTL ? 'الخطوات' : 'Steps'}>
        {steps.map((s, i) => {
          const isDone = i < current;
          const isActive = i === current;
          const label = isRTL ? s.labelAr : s.labelEn;
          return (
            <React.Fragment key={s.id}>
              <li className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => i <= current && onChange(i)}
                  disabled={i > current}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isDone && 'bg-success/10 text-success hover:bg-success/20',
                    !isActive && !isDone && 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold',
                      isActive && 'bg-primary-foreground/20',
                      isDone && 'bg-success/20',
                      !isActive && !isDone && 'bg-muted-foreground/20',
                    )}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : <span className="tech-content">{i + 1}</span>}
                  </span>
                  <span className="truncate max-w-[10rem]">{label}</span>
                </button>
              </li>
              {i < steps.length - 1 && (
                <span className="shrink-0 w-4 h-px bg-border" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Active step body */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 sm:p-5">
        {steps[current]?.content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => !isFirst && onChange(current - 1)}
          disabled={isFirst || submitting}
        >
          <ChevronPrev className="w-4 h-4 me-1" aria-hidden="true" />
          {isRTL ? 'السابق' : 'Back'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleNext}
          disabled={submitting}
        >
          {isLast ? (isRTL ? 'إرسال' : 'Submit') : (isRTL ? 'التالي' : 'Next')}
          {!isLast && <ChevronNext className="w-4 h-4 ms-1" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
};

export default StepperForm;