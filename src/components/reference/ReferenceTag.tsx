import React from 'react';
import { ReferenceBadge } from './ReferenceBadge';
import { ReferenceLinkCopy } from './ReferenceLinkCopy';
import { cn } from '@/lib/utils';

/**
 * Unified Ref ID display for admin pages.
 *
 * Pairs <ReferenceBadge> + <ReferenceLinkCopy> with a single consistent
 * layout so every list row, detail header, and inline meta block looks
 * identical across /admin/*. Always prefer this over hand-rolled
 * Hash / Badge / Copy chips.
 *
 * Variants:
 *   - `full` (default): badge + copy button — for detail headers / meta panels
 *   - `compact`: badge only — for table cells and dense lists
 */
interface Props {
  refId: string | null | undefined;
  isRTL?: boolean;
  variant?: 'full' | 'compact';
  className?: string;
  ariaLabel?: string;
}

export const ReferenceTag: React.FC<Props> = ({
  refId,
  isRTL = false,
  variant = 'full',
  className,
  ariaLabel,
}) => {
  if (!refId) return null;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <ReferenceBadge refId={refId} ariaLabel={ariaLabel} />
      {variant === 'full' && <ReferenceLinkCopy refId={refId} isRTL={isRTL} />}
    </span>
  );
};

export default ReferenceTag;