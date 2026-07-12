/**
 * R5.4 — Compact admin-facing RFQ journey summary.
 * Read-only aggregation for admin quote-request views; reuses only
 * existing tables/queries. No schema changes.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Award, Star, FlaskConical, Users, ExternalLink } from 'lucide-react';

interface Props { opportunityId: string }

interface JourneyData {
  bidsTotal: number;
  bidsShortlisted: number;
  awardedProviderName: string | null;
  requiresSample: boolean;
  sampleStatus: string | null;
  contract: { id: string; contract_number: string; status: string } | null;
}

async function loadJourney(opportunityId: string): Promise<JourneyData> {
  const [qrRes, bidsRes] = await Promise.all([
    supabase
      .from('quote_requests')
      .select('awarded_bid_id, awarded_provider_business_id, requires_sample')
      .eq('id', opportunityId)
      .maybeSingle(),
    supabase
      .from('opportunity_bids')
      .select('id, status')
      .eq('opportunity_id', opportunityId),
  ]);

  const qr = qrRes.data as {
    awarded_bid_id: string | null;
    awarded_provider_business_id: string | null;
    requires_sample: boolean | null;
  } | null;
  const bids = (bidsRes.data as Array<{ id: string; status: string }>) ?? [];
  const shortlisted = bids.filter((b) =>
    ['shortlisted', 'awarded', 'revised'].includes(b.status),
  ).length;

  let awardedProviderName: string | null = null;
  if (qr?.awarded_provider_business_id) {
    const { data } = await supabase
      .from('businesses_public')
      .select('name_ar, name_en')
      .eq('id', qr.awarded_provider_business_id)
      .maybeSingle();
    awardedProviderName = (data?.name_ar as string) || (data?.name_en as string) || null;
  }

  let sampleStatus: string | null = null;
  if (qr?.requires_sample && qr.awarded_bid_id) {
    const { data } = await supabase
      .from('rfq_samples')
      .select('status')
      .eq('bid_id', qr.awarded_bid_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    sampleStatus = (data?.status as string) ?? 'not_requested';
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, contract_number, status')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    bidsTotal: bids.length,
    bidsShortlisted: shortlisted,
    awardedProviderName,
    requiresSample: !!qr?.requires_sample,
    sampleStatus,
    contract: (contract as JourneyData['contract']) ?? null,
  };
}

const SAMPLE_LABELS: Record<string, string> = {
  requested: 'طُلبت',
  shipped: 'شُحنت',
  received: 'استُلمت',
  approved: 'مُعتمَدة',
  rejected: 'مرفوضة',
  not_requested: 'لم تُطلَب بعد',
};

export const RfqJourneySummary: React.FC<Props> = ({ opportunityId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['rfq-journey-summary', opportunityId],
    enabled: !!opportunityId,
    queryFn: () => loadJourney(opportunityId),
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-3 text-xs text-muted-foreground">
          جارٍ تحميل رحلة الطلب…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="text-sm font-semibold">رحلة الطلب</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>العروض: <b>{data.bidsTotal}</b></span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-muted-foreground" />
            <span>قائمة قصيرة: <b>{data.bidsShortlisted}</b></span>
          </div>
          <div className="flex items-center gap-1 col-span-2">
            <Award className="h-3.5 w-3.5 text-muted-foreground" />
            {data.awardedProviderName ? (
              <span>مُعمَّد: <b>{data.awardedProviderName}</b></span>
            ) : (
              <span className="text-muted-foreground">لم يتم التعميد بعد</span>
            )}
          </div>
          {data.requiresSample && (
            <div className="flex items-center gap-1 col-span-2">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                العينة:{' '}
                <Badge variant="outline" className="text-[10px]">
                  {SAMPLE_LABELS[data.sampleStatus ?? 'not_requested'] ?? data.sampleStatus}
                </Badge>
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 col-span-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            {data.contract ? (
              <Link
                to={`/dashboard/contracts/${data.contract.id}`}
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                عقد <span className="tech-content">{data.contract.contract_number}</span>
                <Badge variant="outline" className="text-[10px]">{data.contract.status}</Badge>
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-muted-foreground">لم يُحوَّل إلى عقد بعد</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RfqJourneySummary;
