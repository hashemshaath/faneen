import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Package, Truck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  SAMPLE_STATUS_LABEL_AR,
  type RfqSamplePhoto,
  type RfqSampleRow,
} from './types';
import {
  getSampleSignedUrl,
  listSamplesForOpportunity,
  markShipped,
  uploadSamplePhoto,
} from './services';

interface Props {
  opportunityId: string;
  providerBusinessId: string | null;
}

function Thumbs({ photos }: { photos: RfqSamplePhoto[] }) {
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
    <div className="flex flex-wrap gap-2">
      {photos.map((p) => (
        <a
          key={p.path}
          href={urls[p.path] ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="block h-16 w-16 rounded-md border overflow-hidden bg-muted"
        >
          {urls[p.path] ? (
            <img src={urls[p.path]} alt="sample" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full animate-pulse bg-muted" />
          )}
        </a>
      ))}
    </div>
  );
}

export const SampleTrackerProvider: React.FC<Props> = ({
  opportunityId,
  providerBusinessId,
}) => {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { data: samples, isLoading } = useQuery({
    queryKey: ['rfq-samples', opportunityId],
    enabled: !!opportunityId,
    queryFn: () => listSamplesForOpportunity(opportunityId),
  });

  const active = useMemo<RfqSampleRow | null>(() => {
    if (!samples) return null;
    return (
      samples.find(
        (s) =>
          s.provider_business_id === providerBusinessId && s.status !== 'rejected',
      ) ?? null
    );
  }, [samples, providerBusinessId]);

  const shipMut = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error('no_active_sample');
      const uploaded: RfqSamplePhoto[] = [];
      for (const f of pendingFiles) {
        try {
          const meta = await uploadSamplePhoto(active.id, f);
          uploaded.push(meta);
        } catch (e) {
          console.error('sample photo upload failed', e);
        }
      }
      const { data: qr } = await supabase
        .from('quote_requests')
        .select('user_id')
        .eq('id', opportunityId)
        .maybeSingle();
      return markShipped({
        sampleId: active.id,
        opportunityId,
        trackingRef: tracking.trim() || null,
        addedPhotos: uploaded,
        ownerUserId: qr?.user_id ?? null,
      });
    },
    onSuccess: () => {
      toast.success('تم تسجيل شحن العينة');
      setTracking('');
      setPendingFiles([]);
      qc.invalidateQueries({ queryKey: ['rfq-samples', opportunityId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'تعذر تسجيل الشحن'),
  });

  if (!active) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-semibold inline-flex items-center gap-2">
            <Package className="h-4 w-4" /> عينة مطلوبة
          </div>
          <Badge variant="outline" className="text-xs">
            {SAMPLE_STATUS_LABEL_AR[active.status]}
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : active.status === 'requested' ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              طلب العميل عينة قبل التعاقد. سجّل الشحن وأضف صورًا للتوثيق.
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="رقم التتبع (اختياري)"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                dir="auto"
              />
              <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                إضافة صور
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
                />
              </label>
            </div>
            {pendingFiles.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {pendingFiles.length} ملف جاهز للرفع
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => shipMut.mutate()}
                disabled={shipMut.isPending}
              >
                {shipMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-1" />
                ) : (
                  <Truck className="h-4 w-4 me-1" />
                )}
                تم شحن العينة
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              {active.status === 'shipped'
                ? 'تم تسجيل الشحن. في انتظار استلام العميل للعينة.'
                : active.status === 'received'
                  ? 'استلم العميل العينة. في انتظار قرار الاعتماد.'
                  : active.status === 'approved'
                    ? 'اعتمد العميل العينة — العميل سيتابع تحويل العرض إلى عقد.'
                    : ''}
            </div>
            {active.tracking_ref && (
              <div className="text-xs text-muted-foreground">
                رقم التتبع: <span className="tech-content">{active.tracking_ref}</span>
              </div>
            )}
            <Thumbs photos={(active.photos ?? []) as unknown as RfqSamplePhoto[]} />
            {active.status === 'approved' && active.decision_notes && (
              <div className="text-xs">
                ملاحظات: <span>{active.decision_notes}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SampleTrackerProvider;