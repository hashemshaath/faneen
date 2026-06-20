import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Check, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OPPORTUNITY_LABELS } from '../opportunityLabels';
import { getAssignmentStatusLabel } from '../status';
import { awardOpportunityBid, listOpportunityBidsForClient } from './services';

interface Props {
  opportunityId: string;
  /** Render the award CTA only when the viewer is the owner or an admin. */
  canAward?: boolean;
  /** Current award state of the opportunity. */
  awardedBidId?: string | null;
}

/**
 * List of bids on an opportunity.
 *  - Phase 5: read-only for client and admin.
 *  - Phase 6: opportunity owner / admin can award one winning bid.
 * NO contract conversion is exposed here.
 */
export const ClientBidsSection: React.FC<Props> = ({
  opportunityId,
  canAward = false,
  awardedBidId = null,
}) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['opportunity-bids-list', opportunityId],
    enabled: !!opportunityId,
    queryFn: () => listOpportunityBidsForClient(opportunityId),
  });

  const awardMut = useMutation({
    mutationFn: (bidId: string) => awardOpportunityBid(opportunityId, bidId),
    onSuccess: () => {
      toast.success('تم تعميد العرض');
      qc.invalidateQueries({ queryKey: ['opportunity-bids-list', opportunityId] });
      qc.invalidateQueries({ queryKey: ['quote-request', opportunityId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر تعميد العرض');
    },
  });

  const hasWinner = !!awardedBidId || (data ?? []).some((b) => b.status === 'awarded');

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
            {data.map((bid) => {
              const isWinner =
                bid.status === 'awarded' || (awardedBidId && awardedBidId === bid.id);
              const awardable =
                canAward &&
                !hasWinner &&
                ['submitted', 'under_review', 'shortlisted', 'revised'].includes(bid.status);
              return (
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
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isWinner ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                        <Check className="h-3 w-3 me-1" /> العرض الفائز
                      </Badge>
                    ) : (
                      <Badge variant="outline">{getAssignmentStatusLabel(bid.status).ar}</Badge>
                    )}
                    {awardable && (
                      <Button
                        size="sm"
                        onClick={() => awardMut.mutate(bid.id)}
                        disabled={awardMut.isPending}
                        className="min-h-[40px]"
                      >
                        {awardMut.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin me-1" />
                        ) : (
                          <Award className="h-4 w-4 me-1" />
                        )}
                        تعميد العرض
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};