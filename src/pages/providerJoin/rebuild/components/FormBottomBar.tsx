import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';

export interface FormBottomBarProps {
  step: 1 | 2 | 3 | 4;
  totalSteps: number;
  loading: boolean;
  isRTL: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export const FormBottomBar: React.FC<FormBottomBarProps> = ({
  step, totalSteps, loading, isRTL, onBack, onNext, onSaveDraft, onSubmit,
}) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const Prev = isRTL ? ChevronRight : ChevronLeft;
  const Next = isRTL ? ChevronLeft : ChevronRight;
  const isLast = step === totalSteps;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-[420px] px-4 py-2.5 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={step === 1}
          className="h-12 rounded-xl px-3 text-[13px] font-medium"
          aria-label={t('السابق', 'Back')}
        >
          <Prev className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSaveDraft}
          className="h-12 rounded-xl px-3 text-[12px] text-muted-foreground"
        >
          <Save className="w-3.5 h-3.5 me-1" />
          {t('مسودة', 'Draft')}
        </Button>
        {isLast ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 h-12 rounded-xl text-[14px] font-semibold shadow-elegant"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('جاري الإرسال...', 'Sending...')}</>
            ) : (
              t('إرسال طلب الانضمام', 'Submit request')
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            className="flex-1 h-12 rounded-xl text-[14px] font-semibold shadow-elegant"
          >
            {t('التالي', 'Next')}
            <Next className="w-4 h-4 ms-1" />
          </Button>
        )}
      </div>
    </div>
  );
};