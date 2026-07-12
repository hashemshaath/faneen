import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  Loader2,
  Package,
  PackageCheck,
  Send,
  ShieldCheck,
  ThumbsDown,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  SAMPLE_STAGES,
  SAMPLE_STATUS_LABEL_AR,
  type RfqSampleRow,
  type RfqSamplePhoto,
} from './types';
import {
  decideSample,
  getSampleSignedUrl,
  listSamplesForOpportunity,
  markReceived,
  requestSample,
} from './services';

interface Props {
  opportunityId: string;
  /** Optional overrides — otherwise discovered from the RFQ row. */
  awardedBidId?: string | null;
  clientUserId?: string | null;
}

const STAGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  requested: Send,
  shipped: Truck,
  received: Package,
  approved: ShieldCheck,
};

function SampleThumbs({ photos }: { photos: RfqSamplePhoto[] }) {
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const p of photos) {
        if (!p?.path) continue;
        const u = await getSampleSignedUrl(p.path);
        if (u) next[p.path] = u;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);
  if (!photos.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {photos.map((p) => (
        <a
          key={p.path}
          href={urls[p.path] ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="block h-16 w-16 rounded-md border overflow-hidden bg-muted"
          title={p.file_name ?? p.path}
        >
          {urls[p.path] ? (
            <img
              src={urls[p.path]}
              alt={p.file_name ?? 'sample'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-muted" />
          )}
        </a>
      ))}
    </div>
  );
}

export const SampleTrackerClient: React.FC<Props> = ({
  opportunityId,
  awardedBidId: awardedBidIdProp,
  clientUserId: clientUserIdProp,
}) => {
  const qc = useQueryClient();
  const [decisionNotes, setDecisionNotes] = useState('');
  const [openDecision, setOpenDecision] = useState(false);

  const { data: rfq } = useQuery({
    queryKey: ['rfq-context-for-samples', opportunityId],
    enabled: !!opportunityId && (!awardedBidIdProp || !clientUserIdProp),
    queryFn: async () => {
      const { data } = await supabase
        .from('quote_requests')
        .select('user_id, awarded_bid_id, award_status')
        .eq('id', opportunityId)
        .maybeSingle();
      return data;
    },
  });
  const awardedBidId = awardedBidIdProp ?? rfq?.awarded_bid_id ?? null;
  const clientUserId = clientUserIdProp ?? rfq?.user_id ?? null;

  const { data: samples, isLoading } = useQuery({
    queryKey: ['rfq-samples', opportunityId],
    enabled: !!opportunityId && !!awardedBidId,
    queryFn: () => listSamplesForOpportunity(opportunityId),
  });

  const active = useMemo<RfqSampleRow | null>(() => {
    if (!samples || !awardedBidId) return null;
    return (
      samples.find(
        (s) => s.bid_id === awardedBidId && s.status !== 'rejected',
      ) ?? null
    );
  }, [samples, awardedBidId]);

  const rejectedHistory = useMemo(
    () => (samples ?? []).filter((s) => s.status === 'rejected' && s.bid_id === awardedBidId),
    [samples, awardedBidId],
  );

  const requestMut = useMutation({
    mutationFn: async () => {
      if (!clientUserId || !awardedBidId) throw new Error('missing_context');
      const { data: bid } = await supabase
        .from('opportunity_bids')
        .select('provider_business_id, submitted_by')
        .eq('id', awardedBidId)
        .maybeSingle();
      return requestSample({
        opportunityId,
        bidId: awardedBidId,
        providerBusinessId: bid?.provider_business_id ?? null,
        requestedBy: clientUserId,
        providerUserId: bid?.submitted_by ?? null,
      });
    },
    onSuccess: () => {
      toast.success('تم إرسال طلب العينة');
      qc.invalidateQueries({ queryKey: ['rfq-samples', opportunityId] });
      qc.invalidateQueries({ queryKey: ['opportunity-award-snapshot', opportunityId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر طلب العينة'),
  });

  const receivedMut = useMutation({
    mutationFn: (sampleId: string) => markReceived({ sampleId, opportunityId }),
    onSuccess: () => {
      toast.success('تم تسجيل استلام العينة');
      qc.invalidateQueries({ queryKey: ['rfq-samples', opportunityId] });
    },
  });

  const decisionMut = useMutation({
    mutationFn: async (approve: boolean) => {
      if (!active || !clientUserId) throw new Error('missing');
      const { data: bid } = await supabase
        .from('opportunity_bids')
        .select('submitted_by')
        .eq('id', active.bid_id)
        .maybeSingle();
      return decideSample({
        sampleId: active.id,
        opportunityId,
        approve,
        notes: decisionNotes,
        decisionBy: clientUserId,
        providerUserId: bid?.submitted_by ?? null,
      });
    },
    onSuccess: (_res, approve) => {
      toast.success(approve ? 'تم اعتماد العينة' : 'تم رفض العينة');
      setDecisionNotes('');
      setOpenDecision(false);
      qc.invalidateQueries({ queryKey: ['rfq-samples', opportunityId] });
      qc.invalidateQueries({ queryKey: ['opportunity-award-snapshot', opportunityId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر تسجيل القرار'),
  });

  if (!awardedBidId) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-semibold inline-flex items-center gap-2">
            <Package className="h-4 w-4" /> مسار العينة
          </div>
          {active && (
            <Badge variant="outline" className="text-xs">
              {SAMPLE_STATUS_LABEL_AR[active.status]}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : !active ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              اطلب عينة من المورّد للتحقق من الجودة قبل تحويل العرض إلى عقد.
            </div>
            <Button
              size="sm"
              onClick={() => requestMut.mutate()}
              disabled={requestMut.isPending}
              className="min-h-[40px]"
            >
              {requestMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-1" />
              ) : (
                <Send className="h-4 w-4 me-1" />
              )}
              طلب عينة قبل التعاقد
            </Button>
          </div>
        ) : (
          <div dir="rtl" className="space-y-3">
            {/* progress */}
            <ol className="flex items-center gap-2 overflow-x-auto pb-1">
              {SAMPLE_STAGES.map((stage, idx) => {
                const currentIdx = SAMPLE_STAGES.indexOf(active.status as (typeof SAMPLE_STAGES)[number]);
                const done = currentIdx > idx || active.status === 'approved';
                const isCurrent = currentIdx === idx;
                const Icon = STAGE_ICON[stage] ?? Check;
                return (
                  <li key={stage} className="flex items-center gap-2 shrink-0">
                    <div
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                        done
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs ${isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}
                    >
                      {SAMPLE_STATUS_LABEL_AR[stage]}
                    </span>
                    {idx < SAMPLE_STAGES.length - 1 && (
                      <span className="h-px w-6 bg-border" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ol>

            {active.tracking_ref && (
              <div className="text-xs text-muted-foreground">
                رقم التتبع: <span className="tech-content">{active.tracking_ref}</span>
              </div>
            )}

            <SampleThumbs photos={(active.photos ?? []) as unknown as RfqSamplePhoto[]} />

            {active.status === 'shipped' && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => receivedMut.mutate(active.id)}
                  disabled={receivedMut.isPending}
                >
                  {receivedMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin me-1" />
                  ) : (
                    <PackageCheck className="h-4 w-4 me-1" />
                  )}
                  تأكيد استلام العينة
                </Button>
              </div>
            )}

            {active.status === 'received' && !openDecision && (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setOpenDecision(true)}>
                  تسجيل قرار العينة
                </Button>
              </div>
            )}

            {active.status === 'received' && openDecision && (
              <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">قرار العينة</div>
                  <button
                    type="button"
                    aria-label="إغلاق"
                    onClick={() => {
                      setOpenDecision(false);
                      setDecisionNotes('');
                    }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="ملاحظات على العينة (اختياري)"
                  rows={3}
                  dir="rtl"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decisionMut.mutate(false)}
                    disabled={decisionMut.isPending}
                  >
                    <ThumbsDown className="h-4 w-4 me-1" /> رفض العينة
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => decisionMut.mutate(true)}
                    disabled={decisionMut.isPending}
                  >
                    {decisionMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin me-1" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 me-1" />
                    )}
                    اعتماد العينة
                  </Button>
                </div>
              </div>
            )}

            {active.status === 'approved' && (
              <div className="text-sm text-emerald-700 dark:text-emerald-400">
                تم اعتماد العينة — يمكنك الآن تحويل العرض إلى عقد.
              </div>
            )}
          </div>
        )}

        {rejectedHistory.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <div className="text-xs text-muted-foreground">عينات سابقة مرفوضة</div>
            {!active && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => requestMut.mutate()}
                disabled={requestMut.isPending}
              >
                طلب عينة جديدة
              </Button>
            )}
            <ul className="text-xs text-muted-foreground list-disc ps-4 space-y-1">
              {rejectedHistory.map((r) => (
                <li key={r.id}>
                  {new Date(r.decision_at ?? r.created_at).toLocaleDateString('ar-SA')} —{' '}
                  {r.decision_notes || 'بدون ملاحظات'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SampleTrackerClient;