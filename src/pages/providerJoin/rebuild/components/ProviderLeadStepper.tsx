import React from 'react';
import { STEPS } from '../constants';
import type { StepNumber } from '../types';

export interface ProviderLeadStepperProps {
  current: StepNumber;
  isRTL: boolean;
  percent: number;
}

export const ProviderLeadStepper: React.FC<ProviderLeadStepperProps> = ({ current, isRTL, percent }) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const step = STEPS.find((s) => s.id === current)!;
  return (
    <div className="space-y-2.5" aria-label={t('خطوات الانضمام', 'Join steps')}>
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{t(`الخطوة ${current} من ${STEPS.length}`, `Step ${current} of ${STEPS.length}`)}</span>
        <span className="tech-content">{percent}%</span>
      </div>
      <div className="flex items-center gap-1.5" role="tablist">
        {STEPS.map((s) => (
          <div
            key={s.id}
            aria-current={s.id === current ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s.id < current ? 'bg-primary' : s.id === current ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="space-y-0.5">
        <h2 className="text-[20px] leading-[28px] font-semibold">
          {t(step.titleAr, step.titleEn)}
        </h2>
        <p className="text-[13px] text-muted-foreground">{t(step.descAr, step.descEn)}</p>
      </div>
    </div>
  );
};