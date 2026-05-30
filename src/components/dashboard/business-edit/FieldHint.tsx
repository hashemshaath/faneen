import React from 'react';
import { Info } from 'lucide-react';

/**
 * Compact contextual hint shown directly under a form field.
 * Use for "what's required / what's not" guidance — keeps tips inline
 * (per the no-popup UX constraint) while staying visually quiet.
 */
export const FieldHint: React.FC<{ children: React.ReactNode; tone?: 'info' | 'muted' }> = ({
  children,
  tone = 'muted',
}) => (
  <p
    className={`mt-1 text-[11px] leading-relaxed flex items-start gap-1 ${
      tone === 'info' ? 'text-info' : 'text-muted-foreground'
    }`}
  >
    <Info className="w-3 h-3 mt-[2px] shrink-0 opacity-70" />
    <span>{children}</span>
  </p>
);