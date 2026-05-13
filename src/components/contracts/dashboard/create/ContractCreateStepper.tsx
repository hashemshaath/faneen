import React from 'react';

export type CreateStepKey = 'client' | 'work' | 'template' | 'details' | 'pricing' | 'review';

export interface CreateStepDescriptor {
  key: CreateStepKey;
  ar: string;
  en: string;
  done: boolean;
}

interface ContractCreateStepperProps {
  steps: CreateStepDescriptor[];
  activeStep: CreateStepKey;
  onStepClick: (key: CreateStepKey) => void;
  isRTL: boolean;
}

/**
 * Presentational stepper for the create-contract flow.
 * Parent owns all state; this component only renders chips and emits clicks.
 */
export const ContractCreateStepper: React.FC<ContractCreateStepperProps> = ({
  steps,
  activeStep,
  onStepClick,
  isRTL,
}) => {
  return (
    <div
      className="mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar"
      role="list"
      aria-label={isRTL ? 'خطوات إنشاء العقد' : 'Contract creation steps'}
    >
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <button
            type="button"
            onClick={() => onStepClick(s.key)}
            aria-current={activeStep === s.key ? 'step' : undefined}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] whitespace-nowrap transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              activeStep === s.key
                ? 'border-primary/60 bg-primary/10 text-primary'
                : s.done
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-border/40 bg-muted/30 text-muted-foreground'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold ${
                s.done
                  ? 'bg-success text-success-foreground'
                  : activeStep === s.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.done ? '✓' : i + 1}
            </span>
            {isRTL ? s.ar : s.en}
          </button>
          {i < steps.length - 1 && <span className="text-muted-foreground/40 text-[10px]">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContractCreateStepper;