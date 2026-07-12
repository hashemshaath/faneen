import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Award, Check, Clock, LayoutGrid, Loader2, Table2, X } from 'lucide-react';
import { toast } from 'sonner';
import { OPPORTUNITY_LABELS } from '../opportunityLabels';
import { getAssignmentStatusLabel } from '../status';
import {
  awardOpportunityBid,
  listOpportunityBidsForClient,
  notifyLosingBiddersAfterAward,
  recordAwardReason,
  setBidShortlisted,
} from './services';
import { BidComparisonTable } from './BidComparisonTable';
import type { OpportunityBidRow } from './types';

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

  const [view, setView] = useState<'cards' | 'compare'>('cards');
  const [awardTarget, setAwardTarget] = useState<OpportunityBidRow | null>(null);
  const [awardReason, setAwardReason] = useState('');

  const awardMut = useMutation({
    mutationFn: async (bid: OpportunityBidRow) => {
      await awardOpportunityBid(opportunityId, bid.id);
      if (awardReason.trim()) {
        try {
          await recordAwardReason(opportunityId, bid.id, awardReason);
        } catch {
          /* audit is best-effort */
        }
      }
      try {
        await notifyLosingBiddersAfterAward(opportunityId, bid.id);
      } catch {
        /* notifications best-effort */
      }
      return bid.id;
    },
    onSuccess: () => {
      toast.success('تم تعميد العرض');
      setAwardTarget(null);
      setAwardReason('');
      qc.invalidateQueries({ queryKey: ['opportunity-bids-list', opportunityId] });
      qc.invalidateQueries({ queryKey: ['quote-request', opportunityId] });
      qc.invalidateQueries({ queryKey: ['quote-request-events', opportunityId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر تعميد العرض');
    },
  });

  const shortlistMut = useMutation({
    mutationFn: ({ bidId, next }: { bidId: string; next: boolean }) =>
      setBidShortlisted(bidId, next),
    onSuccess: (_, vars) => {
      toast.success(vars.next ? 'تمت الإضافة للقائمة القصيرة' : 'أُزيل من القائمة القصيرة');
      qc.invalidateQueries({ queryKey: ['opportunity-bids-list', opportunityId] });
      qc.invalidateQueries({ queryKey: ['quote-request-events', opportunityId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر تحديث القائمة القصيرة');
    },
  });

  const bids = data ?? [];
  const hasWinner = !!awardedBidId || bids.some((b) => b.status === 'awarded');
  const canCompare = bids.length >= 2;
  const pendingBidId = shortlistMut.isPending
    ? shortlistMut.variables?.bidId ?? null
    : awardMut.isPending
      ? awardMut.variables?.id ?? null
      : null;
  const pendingKind: 'shortlist' | 'award' | null = shortlistMut.isPending
    ? 'shortlist'
    : awardMut.isPending
      ? 'award'
      : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-semibold">{OPPORTUNITY_LABELS.submittedBids.ar}</div>
          {canCompare && (
            <div className="inline-flex rounded-md border p-0.5 bg-muted/40" role="tablist" aria-label="طريقة العرض">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'cards'}
                onClick={() => setView('cards')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${view === 'cards' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> بطاقات
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'compare'}
                onClick={() => setView('compare')}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${view === 'compare' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <Table2 className="h-3.5 w-3.5" /> مقارنة
              </button>
            </div>
          )}
        </div>

        {awardTarget && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">تأكيد ترسية العرض</div>
              <button
                type="button"
                aria-label="إلغاء"
                onClick={() => {
                  setAwardTarget(null);
                  setAwardReason('');
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              السعر: {Number(awardTarget.price_amount ?? 0).toLocaleString()} {awardTarget.currency}
            </div>
            <Textarea
              value={awardReason}
              onChange={(e) => setAwardReason(e.target.value)}
              placeholder="سبب الترسية (اختياري) — سيُسجَّل في سجل الفرصة"
              rows={3}
              dir="rtl"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAwardTarget(null);
                  setAwardReason('');
                }}
                disabled={awardMut.isPending}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => awardMut.mutate(awardTarget)}
                disabled={awardMut.isPending}
              >
                {awardMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-1" />
                ) : (
                  <Award className="h-4 w-4 me-1" />
                )}
                تأكيد الترسية
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : bids.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            لا توجد عروض بعد على هذه الفرصة.
          </div>
        ) : view === 'compare' && canCompare ? (
          <BidComparisonTable
            bids={bids}
            canAward={canAward}
            awardedBidId={awardedBidId}
            onShortlistToggle={(bid, next) => shortlistMut.mutate({ bidId: bid.id, next })}
            onAward={(bid) => {
              setAwardTarget(bid);
              setAwardReason('');
            }}
            pendingBidId={pendingBidId}
            pendingKind={pendingKind}
          />
        ) : (
          <ul className="space-y-2">
            {bids.map((bid) => {
              const isWinner =
                bid.status === 'awarded' || (awardedBidId && awardedBidId === bid.id);
              const awardable =
                canAward &&
                !hasWinner &&
                ['submitted', 'under_review', 'shortlisted', 'revised'].includes(bid.status);
              const shortlisted = bid.status === 'shortlisted';
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
                    {canAward && !hasWinner && !isWinner && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shortlistMut.mutate({ bidId: bid.id, next: !shortlisted })}
                        disabled={shortlistMut.isPending}
                        className="min-h-[36px]"
                      >
                        {shortlisted ? 'إزالة من القائمة القصيرة' : 'ضم للقائمة القصيرة'}
                      </Button>
                    )}
                    {awardable && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setAwardTarget(bid);
                          setAwardReason('');
                        }}
                        disabled={awardMut.isPending}
                        className="min-h-[40px]"
                      >
                        <Award className="h-4 w-4 me-1" />
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