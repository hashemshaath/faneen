/**
 * Phase 4E.3 — Inline autosave status indicator (no toasts).
 * Polite live region. Bilingual.
 */
import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, CircleDashed, PauseCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AutosaveState } from '@/hooks/useContractDraftAutosave';

interface Props {
  isRTL: boolean;
  state: AutosaveState;
  lastSavedAt?: string | null;
}

const labelFor = (s: AutosaveState, isRTL: boolean): string => {
  switch (s) {
    case 'disabled_unsaved': return isRTL ? 'الحفظ التلقائي يبدأ بعد حفظ المسودة لأول مرة.' : 'Autosave starts after the draft is saved for the first time.';
    case 'idle':    return isRTL ? 'سيتم حفظ التغييرات تلقائيًا.' : 'Changes will be autosaved.';
    case 'pending': return isRTL ? 'جارٍ الحفظ التلقائي...' : 'Autosaving...';
    case 'saved':   return isRTL ? 'تم الحفظ تلقائيًا · قبل لحظات' : 'Autosaved · just now';
    case 'error':   return isRTL ? 'تعذر الحفظ التلقائي — سنحاول لاحقًا.' : 'Autosave failed — we will retry later.';
    case 'stale':   return isRTL ? 'تم تعديل العقد في مكان آخر. يرجى تحديث الصفحة.' : 'Contract changed elsewhere. Please refresh the page.';
    case 'paused':  return isRTL ? 'الحفظ التلقائي متوقف مؤقتًا.' : 'Autosave paused.';
  }
};

const iconFor = (s: AutosaveState) => {
  switch (s) {
    case 'pending': return <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />;
    case 'saved':   return <CheckCircle2 className="w-3 h-3" aria-hidden="true" />;
    case 'error':   return <AlertCircle className="w-3 h-3" aria-hidden="true" />;
    case 'stale':   return <AlertTriangle className="w-3 h-3" aria-hidden="true" />;
    case 'paused':  return <PauseCircle className="w-3 h-3" aria-hidden="true" />;
    default:        return <CircleDashed className="w-3 h-3" aria-hidden="true" />;
  }
};

const variantFor = (s: AutosaveState): 'muted' | 'info' | 'success' | 'warning' | 'destructive' => {
  switch (s) {
    case 'pending': return 'info';
    case 'saved':   return 'success';
    case 'error':   return 'destructive';
    case 'stale':   return 'warning';
    case 'paused':  return 'muted';
    default:        return 'muted';
  }
};

export const AutosaveStatus: React.FC<Props> = ({ isRTL, state }) => {
  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2 text-[11px]">
      <Badge variant={variantFor(state)} size="sm" className="gap-1">
        {iconFor(state)}
        <span>{labelFor(state, isRTL)}</span>
      </Badge>
    </div>
  );
};

export default AutosaveStatus;