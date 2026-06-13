/**
 * Read-only lifecycle timeline card for admin contracts.
 *
 * Pure UI — no Supabase, no queries, no API. Renders the canonical
 * contract lifecycle stages as a vertical list with one stage marked as
 * the current status. Labels come from the canonical source of truth via
 * `ContractLifecycleBadge` (which itself reads `getContractStatusMeta`).
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ContractLifecycleBadge } from './ContractLifecycleBadge';
import { type ContractStatus } from '@/lib/contract-statuses';

const LIFECYCLE_ORDER: ContractStatus[] = [
  'draft',
  'pending_approval',
  'active',
  'completed',
  'cancelled',
  'disputed',
];

export interface ContractTimelineCardProps {
  status: string | null | undefined;
  isRTL?: boolean;
  title?: React.ReactNode;
  className?: string;
}

export const ContractTimelineCard: React.FC<ContractTimelineCardProps> = ({
  status,
  isRTL = true,
  title,
  className,
}) => {
  const current = (status ?? 'draft') as ContractStatus;
  return (
    <Card className={cn('border-border/60', className)}>
      <CardContent className="p-4 space-y-3">
        {title ? <div className="text-sm font-medium">{title}</div> : null}
        <ol className="space-y-2">
          {LIFECYCLE_ORDER.map((stage) => {
            const isCurrent = stage === current;
            return (
              <li
                key={stage}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5',
                  isCurrent ? 'bg-muted/50' : 'bg-transparent',
                )}
              >
                <ContractLifecycleBadge status={stage} isRTL={isRTL} size="sm" />
                <span
                  className={cn(
                    'text-[10px] uppercase tracking-wide',
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {isCurrent
                    ? (isRTL ? 'الحالة الحالية' : 'Current')
                    : (isRTL ? '—' : '—')}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
};

export default ContractTimelineCard;