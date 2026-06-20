import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(d: Date, isRTL: boolean): string {
  return d.toLocaleTimeString(isRTL ? 'ar-SA-u-nu-latn' : 'en', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

/**
 * Tiny chip showing when the underlying data was last refreshed and a
 * "verified source" tick — every counter on the admin dashboard is
 * sourced from a live DB query, never hardcoded.
 */
export function DataFreshness({
  lastUpdated,
  source,
  isRTL,
  className,
}: {
  lastUpdated: Date;
  source?: string;
  isRTL: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] text-muted-foreground tech-content',
        className,
      )}
      title={source ? `${isRTL ? 'المصدر' : 'Source'}: ${source}` : undefined}
    >
      <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
      <Clock className="w-3 h-3" aria-hidden="true" />
      <span>{isRTL ? 'آخر تحديث' : 'Updated'} {formatTime(lastUpdated, isRTL)}</span>
    </span>
  );
}