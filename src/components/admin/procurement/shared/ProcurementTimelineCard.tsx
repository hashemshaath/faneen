/**
 * Read-only lifecycle timeline for procurement/RFQ flows.
 *
 * Pure UI — no Supabase, no queries, no API, no events fetch. Renders
 * the canonical RFQ status order as a vertical list with one stage
 * marked as current. Labels come from
 * `@/modules/leads/constants/quoteStatuses` via `QuoteStatusBadge`.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import {
  QUOTE_STATUSES,
  type QuoteStatus,
} from '@/modules/leads/constants/quoteStatuses';

export interface ProcurementTimelineCardProps {
  status: string | null | undefined;
  isRTL?: boolean;
  title?: React.ReactNode;
  className?: string;
}

export const ProcurementTimelineCard: React.FC<ProcurementTimelineCardProps> = ({
  status,
  isRTL = true,
  title,
  className,
}) => {
  const current = (status ?? 'new') as QuoteStatus;
  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="p-4 space-y-3">
        {title ? <div className="text-sm font-medium">{title}</div> : null}
        <ol className="space-y-2">
          {QUOTE_STATUSES.map((stage) => {
            const isCurrent = stage === current;
            return (
              <li
                key={stage}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5',
                  isCurrent ? 'bg-muted/50' : 'bg-transparent',
                )}
              >
                <QuoteStatusBadge status={stage} isRTL={isRTL} />
                <span
                  className={cn(
                    'text-[10px] uppercase tracking-wide',
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {isCurrent ? (isRTL ? 'الحالية' : 'current') : ''}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
};

export default ProcurementTimelineCard;