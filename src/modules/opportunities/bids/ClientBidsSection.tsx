import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { OPPORTUNITY_LABELS } from '../opportunityLabels';
import { getAssignmentStatusLabel } from '../status';
import { listOpportunityBidsForClient } from './services';

interface Props {
  opportunityId: string;
}

/**
 * Read-only list of bids on an opportunity, for the client (and admin
 * — RLS gates visibility either way). NO award action in Phase 5.
 */
export const ClientBidsSection: React.FC<Props> = ({ opportunityId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['opportunity-bids-list', opportunityId],
    enabled: !!opportunityId,
    queryFn: () => listOpportunityBidsForClient(opportunityId),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-base font-semibold">{OPPORTUNITY_LABELS.submittedBids.ar}</div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            لا توجد عروض بعد على هذه الفرصة.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((bid) => (
              <li
                key={bid.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card"
              >
                <div className="min-w-0">
                  <div className="text-lg font-bold tech-content">
                    {Number(bid.price_amount ?? 0).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{bid.currency}</span>
                  </div>
                  {bid.duration_value != null && (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="tech-content">{bid.duration_value}</span> {bid.duration_unit ?? ''}
                    </div>
                  )}
                </div>
                <Badge variant="outline">{getAssignmentStatusLabel(bid.status).ar}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};