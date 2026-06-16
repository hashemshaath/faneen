/**
 * Tiny inline indicator showing that the onboarding draft is auto-saved.
 * The actual saving lives in `Onboarding.tsx` (saveDraft + syncDraftToServer);
 * this component only renders a subtle status pill that updates on each
 * `lastSavedAt` change.
 */
import React, { useEffect, useState } from 'react';
import { Check, Cloud } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';

interface Props {
  /** Timestamp (ms) of the most recent autosave. */
  lastSavedAt: number | null;
}

export const AutosaveBadge: React.FC<Props> = ({ lastSavedAt }) => {
  const bi = useBi();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!lastSavedAt) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 1400);
    return () => window.clearTimeout(t);
  }, [lastSavedAt]);

  if (!lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
        <Cloud className="w-3 h-3" />
        {bi('حفظ تلقائي مفعّل', 'Autosave on')}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] transition-colors duration-300 ${
        flash ? 'text-emerald-600' : 'text-muted-foreground'
      }`}
      aria-live="polite"
    >
      <Check className="w-3 h-3" />
      {bi('تم الحفظ', 'Saved')}
    </span>
  );
};

export default AutosaveBadge;