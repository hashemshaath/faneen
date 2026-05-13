/**
 * Contracts Phase 4A — Draft Completeness Card (UI-only).
 * Shows score + missing items as keyboard-accessible jump links.
 * Non-blocking: never prevents Save Draft.
 */
import React from 'react';
import { Gauge } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type {
  CompletenessResult,
  CompletenessStep,
} from '@/lib/contract-completeness';

interface Props {
  isRTL: boolean;
  result: CompletenessResult;
  onGoToStep: (step: CompletenessStep) => void;
  maxMissing?: number;
}

const statusBadgeVariant: Record<
  CompletenessResult['status'],
  'warning' | 'info' | 'secondary' | 'success'
> = {
  low: 'warning',
  medium: 'info',
  good: 'secondary',
  complete: 'success',
};

const statusLabel = (s: CompletenessResult['status'], isRTL: boolean) => {
  switch (s) {
    case 'low': return isRTL ? 'يحتاج معلومات' : 'Needs info';
    case 'medium': return isRTL ? 'غير مكتمل' : 'Incomplete';
    case 'good': return isRTL ? 'شبه جاهز' : 'Almost ready';
    case 'complete': return isRTL ? 'جاهز للمراجعة' : 'Ready for review';
  }
};

export const ContractCompletenessCard: React.FC<Props> = ({
  isRTL, result, onGoToStep, maxMissing = 5,
}) => {
  const { score, status, missing } = result;
  const top = missing.slice(0, maxMissing);
  const ariaLabel = isRTL
    ? `اكتمال المسودة ${score}٪`
    : `Draft completeness ${score}%`;

  return (
    <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <Gauge className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <h4 className="text-xs font-semibold truncate">
            {isRTL ? 'اكتمال المسودة' : 'Draft completeness'}
          </h4>
          <Badge variant={statusBadgeVariant[status]} size="sm">
            {statusLabel(status, isRTL)}
          </Badge>
        </div>
        <span className="text-xs font-semibold tech-content tabular-nums">
          {score}%
        </span>
      </div>

      <Progress
        value={score}
        className="h-2"
        aria-label={ariaLabel}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {top.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            {isRTL ? 'العناصر الناقصة:' : 'Missing items:'}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {top.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => onGoToStep(m.step)}
                  className="text-[10px] px-2 py-1 rounded-full border border-border/60 bg-background/60 hover:bg-accent/10 hover:text-accent hover:border-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors"
                >
                  {isRTL ? m.labelAr : m.labelEn}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
        {isRTL
          ? 'هذا المؤشر إرشادي ولا يمنع حفظ المسودة.'
          : 'This indicator is guidance only and does not block saving the draft.'}
      </p>
    </div>
  );
};

export default ContractCompletenessCard;