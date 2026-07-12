import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, FilePlus2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  convertAwardedBidToContract,
  getContractForOpportunity,
} from './services';
import { getActiveSampleForBid } from '../samples/services';
import { notifyContractConvertedBothParties } from './notifyContractConverted';

interface Props {
  opportunityId: string;
  /** Owner of the opportunity or admin. Providers must pass false. */
  canConvert: boolean;
}

interface AwardSnapshot {
  awarded_bid_id: string | null;
  award_status: string | null;
  requires_sample?: boolean | null;
}

/**
 * Phase 7 — surfaces the contract created from the winning bid and the
 * conversion CTA (owner/admin only). Provider view passes `canConvert={false}`.
 */
export const OpportunityContractSection: React.FC<Props> = ({
  opportunityId,
  canConvert,
}) => {
  const qc = useQueryClient();

  const { data: award } = useQuery<AwardSnapshot | null>({
    queryKey: ['opportunity-award-snapshot', opportunityId],
    enabled: !!opportunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('awarded_bid_id, award_status, requires_sample')
        .eq('id', opportunityId)
        .maybeSingle();
      if (error) throw error;
      return (data as AwardSnapshot | null) ?? null;
    },
  });

  const awardedBidId = award?.awarded_bid_id ?? null;
  const requiresSample = !!award?.requires_sample;

  const { data: activeSample } = useQuery({
    queryKey: ['rfq-active-sample', opportunityId, awardedBidId],
    enabled: !!opportunityId && !!awardedBidId && requiresSample,
    queryFn: () => getActiveSampleForBid(opportunityId, awardedBidId!),
  });
  const sampleApproved = activeSample?.status === 'approved';
  const sampleGateOpen = !requiresSample || sampleApproved;

  const { data: contract, isLoading } = useQuery({
    queryKey: ['opportunity-contract', opportunityId],
    enabled: !!opportunityId,
    queryFn: () => getContractForOpportunity(opportunityId),
  });

  const convertMut = useMutation({
    mutationFn: () => {
      if (!awardedBidId) throw new Error('no_awarded_bid');
      return convertAwardedBidToContract(opportunityId, awardedBidId);
    },
    onSuccess: (contractId) => {
      toast.success('تم إنشاء عقد مبدئي');
      qc.invalidateQueries({ queryKey: ['opportunity-contract', opportunityId] });
      // Best-effort — fan out in-app notifications to both parties.
      if (typeof contractId === 'string') {
        void notifyContractConvertedBothParties(opportunityId, contractId);
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'تعذر إنشاء العقد');
    },
  });

  if (!awardedBidId && !contract) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold inline-flex items-center gap-2">
            <FileText className="h-4 w-4" /> العقد
          </div>
          {contract && (
            <Badge variant="outline" className="text-xs">
              {contract.status}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : contract ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              تم إنشاء عقد مبدئي{' '}
              <span className="tech-content">{contract.contract_number}</span>
            </div>
            <Button asChild size="sm" variant="outline" className="min-h-[40px]">
              <Link to={`/dashboard/contracts/${contract.id}`}>عرض العقد</Link>
            </Button>
          </div>
        ) : canConvert && awardedBidId ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {sampleGateOpen
                ? 'يمكنك تحويل العرض الفائز إلى عقد مبدئي.'
                : 'بانتظار اعتماد العينة قبل تحويل العرض إلى عقد.'}
            </div>
            <Button
              size="sm"
              onClick={() => convertMut.mutate()}
              disabled={convertMut.isPending || !sampleGateOpen}
              title={!sampleGateOpen ? 'بانتظار اعتماد العينة' : undefined}
              className="min-h-[40px]"
            >
              {convertMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-1" />
              ) : (
                <FilePlus2 className="h-4 w-4 me-1" />
              )}
              تحويل إلى عقد
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            سيظهر العقد هنا بعد إنشائه.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
