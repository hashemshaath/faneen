import React, { useMemo, useState } from 'react';
import { ShieldCheck, Rocket, Inbox, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { pickBi } from '@/components/common/Bilingual';
import {
  isPilotReady,
  reviewBuckets,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { ReviewTab } from './ReviewTab';
import { PilotTab } from './PilotTab';

interface QualityTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow & {
    name_ar?: string | null; name_en?: string | null;
    ref_id?: string | null; logo_url?: string | null;
  }>;
  isRTL: boolean;
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

/**
 * QualityTab — unifies the previous "Review & Visibility" and
 * "Pilot Readiness" tabs into a single quality-gate surface.
 * Shared KPI strip at the top removes the duplicated review/pilot
 * counters; inner sub-tabs preserve the two specialised drilldowns.
 */
export const QualityTab: React.FC<QualityTabProps> = ({ businesses, isRTL, onJumpToBusiness }) => {
  const [view, setView] = useState<'review' | 'pilot'>('review');

  const buckets = useMemo(() => reviewBuckets(businesses, isRTL), [businesses, isRTL]);
  const queueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of buckets) for (const r of b.rows) ids.add(r.id);
    return ids;
  }, [buckets]);
  const queueSize = queueIds.size;
  const cleanRows = businesses.length - queueSize;
  const pilotReady = useMemo(
    () => businesses.filter(isPilotReady).length,
    [businesses],
  );
  const blocked = businesses.length - pilotReady;
  const cleanPct = businesses.length
    ? `${Math.round((cleanRows / businesses.length) * 100)}%`
    : undefined;
  const readyPct = businesses.length
    ? `${Math.round((pilotReady / businesses.length) * 100)}%`
    : undefined;

  return (
    <div className="space-y-4" data-testid="business-control-center-quality">
      {/* Unified KPI strip — single source of truth across both sub-views */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminKpiCard
          label={pickBi(isRTL, 'قائمة المراجعة', 'Review queue')}
          value={queueSize} icon={Inbox} tone="warning"
          hint={pickBi(isRTL, 'سجلات بحاجة قرار', 'records needing a decision')}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'سجلات نظيفة', 'Clean records')}
          value={cleanRows} icon={CheckCircle2} tone="success" trend={cleanPct}
          hint={pickBi(isRTL, 'لا تظهر في أي قائمة مراجعة', 'absent from every queue')}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'مؤهلة للتشغيل', 'Pilot-ready')}
          value={pilotReady} icon={Rocket} tone="accent" trend={readyPct}
          hint={pickBi(isRTL, 'اجتازت كل بوابات الجودة', 'passes every quality gate')}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'محجوبة عن التشغيل', 'Blocked from pilot')}
          value={blocked} icon={AlertTriangle}
          tone={blocked > 0 ? 'destructive' : 'muted'}
          hint={pickBi(isRTL, 'بحاجة معالجة قبل الإطلاق', 'fix before launch')}
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'review' | 'pilot')}>
        <TabsList className="rounded-2xl bg-muted/60 p-1 h-auto">
          <TabsTrigger
            value="review"
            className="gap-1.5 rounded-xl text-xs md:text-sm data-[state=active]:bg-card"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {pickBi(isRTL, 'المراجعة والظهور', 'Review & Visibility')}
          </TabsTrigger>
          <TabsTrigger
            value="pilot"
            className="gap-1.5 rounded-xl text-xs md:text-sm data-[state=active]:bg-card"
          >
            <Rocket className="h-3.5 w-3.5" />
            {pickBi(isRTL, 'جاهزية التشغيل', 'Pilot Readiness')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-3">
          <ReviewTab
            businesses={businesses} isRTL={isRTL} onJumpToBusiness={onJumpToBusiness}
          />
        </TabsContent>
        <TabsContent value="pilot" className="mt-3">
          <PilotTab
            businesses={businesses} isRTL={isRTL} onJumpToBusiness={onJumpToBusiness}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QualityTab;