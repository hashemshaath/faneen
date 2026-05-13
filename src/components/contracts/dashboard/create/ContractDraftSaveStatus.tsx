/**
 * Contracts Phase 4B — Draft save status indicator (UI-only).
 * Derives state from the create mutation status. Non-blocking, polite live region.
 */
import React from 'react';
import { Loader2, AlertCircle, CheckCircle2, FileEdit, CircleDashed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type DraftSaveState = 'not_saved' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  isRTL: boolean;
  state: DraftSaveState;
  /** Completeness score 0-100 — drives optional ready/incomplete hint. */
  score?: number;
}

const labelFor = (s: DraftSaveState, isRTL: boolean) => {
  switch (s) {
    case 'not_saved': return isRTL ? 'لم يتم حفظ المسودة بعد' : 'Draft not saved yet';
    case 'dirty':     return isRTL ? 'لديك تغييرات غير محفوظة' : 'You have unsaved changes';
    case 'saving':    return isRTL ? 'جارٍ حفظ المسودة...' : 'Saving draft...';
    case 'saved':     return isRTL ? 'تم حفظ المسودة' : 'Draft saved';
    case 'error':     return isRTL ? 'تعذر حفظ المسودة' : 'Could not save draft';
  }
};

const iconFor = (s: DraftSaveState) => {
  switch (s) {
    case 'saving': return <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />;
    case 'saved':  return <CheckCircle2 className="w-3 h-3" aria-hidden="true" />;
    case 'error':  return <AlertCircle className="w-3 h-3" aria-hidden="true" />;
    case 'dirty':  return <FileEdit className="w-3 h-3" aria-hidden="true" />;
    default:       return <CircleDashed className="w-3 h-3" aria-hidden="true" />;
  }
};

const variantFor = (s: DraftSaveState): 'muted' | 'info' | 'success' | 'warning' | 'destructive' => {
  switch (s) {
    case 'saving': return 'info';
    case 'saved':  return 'success';
    case 'error':  return 'destructive';
    case 'dirty':  return 'warning';
    default:       return 'muted';
  }
};

export const ContractDraftSaveStatus: React.FC<Props> = ({ isRTL, state, score }) => {
  const showScoreHint = typeof score === 'number';
  const lowScore = showScoreHint && (score as number) < 80;
  const ready = showScoreHint && score === 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-2 text-[11px]"
    >
      <Badge variant={variantFor(state)} size="sm" className="gap-1">
        {iconFor(state)}
        {labelFor(state, isRTL)}
      </Badge>
      {state !== 'saving' && lowScore && (
        <span className="text-muted-foreground">
          {isRTL
            ? 'العقد غير مكتمل بالكامل، لكن يمكنك حفظه كمسودة.'
            : 'The contract is not fully complete, but you can still save it as a draft.'}
        </span>
      )}
      {state !== 'saving' && ready && (
        <span className="text-success">
          {isRTL ? 'العقد جاهز للمراجعة والإرسال.' : 'Contract is ready for review and sending.'}
        </span>
      )}
    </div>
  );
};

export default ContractDraftSaveStatus;