import React from 'react';
import { cn } from '@/lib/utils';

/**
 * BM-REF-REBUILD-1 — Step D
 *
 * Inline secondary hint surfacing a legacy reference identifier
 * (e.g. BIZ-…) underneath or beside the canonical ref_id.
 *
 * Bilingual copy:
 *   EN: "Previously: <ref>"
 *   AR: "المعرف السابق: <ref>"
 */
interface Props {
  legacyRefId: string | null | undefined;
  isRTL: boolean;
  className?: string;
}

export const LegacyReferenceHint: React.FC<Props> = ({ legacyRefId, isRTL, className }) => {
  if (!legacyRefId) return null;
  const label = isRTL ? 'المعرف السابق' : 'Previously';
  return (
    <span
      className={cn('text-[10px] text-muted-foreground tech-content', className)}
      title={`${label}: ${legacyRefId}`}
    >
      {label}: <span className="font-mono">{legacyRefId}</span>
    </span>
  );
};

export default LegacyReferenceHint;