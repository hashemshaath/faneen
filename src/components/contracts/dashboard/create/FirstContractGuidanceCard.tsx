/**
 * Contracts Phase 4B — First-contract guidance (collapsible).
 * Shown only when the user has zero contracts. Pure UI.
 */
import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  isRTL: boolean;
}

export const FirstContractGuidanceCard: React.FC<Props> = ({ isRTL }) => {
  const [open, setOpen] = useState(true);

  const steps: Array<{ ar: string; en: string }> = [
    { ar: 'حدّد الغرض / التخصص', en: 'Pick the purpose / specialty' },
    { ar: 'حدّد أطراف العقد', en: 'Set the contract parties' },
    { ar: 'اختر القالب وأضف البنود أو السعر', en: 'Choose a template and add items or price' },
    { ar: 'راجع العقد واحفظه', en: 'Review and save the contract' },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-start focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          {isRTL ? 'ابدأ بأول عقد' : 'Start your first contract'}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {open && (
        <ol className="space-y-1.5 ps-1">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px]">
              <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold tech-content">
                {i + 1}
              </span>
              <span>{isRTL ? s.ar : s.en}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default FirstContractGuidanceCard;