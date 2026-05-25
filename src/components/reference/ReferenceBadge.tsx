import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BM-REF-REBUILD-1 — Step D
 *
 * Compact display for an official reference id (ENT/PAY/STF/LED/…).
 * Purely presentational — accepts an already-resolved string.
 */
interface Props {
  refId: string | null | undefined;
  className?: string;
  showIcon?: boolean;
  ariaLabel?: string;
}

export const ReferenceBadge: React.FC<Props> = ({ refId, className, showIcon = true, ariaLabel }) => {
  if (!refId) return null;
  return (
    <Badge
      variant="outline"
      aria-label={ariaLabel}
      className={cn('text-[10px] tech-content font-mono gap-1', className)}
    >
      {showIcon && <Hash className="w-2.5 h-2.5" />}
      <span>{refId}</span>
    </Badge>
  );
};

export default ReferenceBadge;