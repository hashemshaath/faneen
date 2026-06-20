import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, MapPin, Layers } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import {
  isPilotReady,
  isProviderLike,
  cityDistribution,
  entityTypeDistribution,
  pilotReadinessReasons,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { MetricBarList } from './MetricBarList';
import { BusinessMiniCard } from './BusinessMiniCard';

interface PilotTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow & {
    name_ar?: string | null; name_en?: string | null;
    ref_id?: string | null; logo_url?: string | null;
  }>;
  isRTL: boolean;
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

export const PilotTab: React.FC<PilotTabProps> = ({ businesses, isRTL, onJumpToBusiness }) => {
  const providers = useMemo(() => businesses.filter(isProviderLike), [businesses]);
  const ready = useMemo(() => providers.filter(isPilotReady), [providers]);
  const notReady = useMemo(() => providers.filter((b) => !isPilotReady(b)), [providers]);
  const readyCities = useMemo(() => cityDistribution(ready, isRTL), [ready, isRTL]);
  const readyEntities = useMemo(() => entityTypeDistribution(ready, isRTL), [ready, isRTL]);

  return (
    <div className="space-y-4" data-testid="business-control-center-pilot">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminKpiCard
          label={pickBi(isRTL, 'مزودون مؤهلون', 'Pilot-ready providers')}
          value={ready.length} icon={Rocket} tone="success"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'غير جاهزين', 'Not ready')}
          value={notReady.length} icon={Rocket} tone="warning"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'مدن مغطّاة', 'Covered cities')}
          value={readyCities.length} icon={MapPin} tone="primary"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'أنواع جهات جاهزة', 'Ready entity types')}
          value={readyEntities.length} icon={Layers} tone="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricBarList
          title={pickBi(isRTL, 'جاهزية التشغيل حسب المدينة', 'Pilot readiness by city')}
          icon={MapPin}
          buckets={readyCities}
          total={ready.length}
          isRTL={isRTL}
          tone="primary"
        />
        <MetricBarList
          title={pickBi(isRTL, 'جاهزية التشغيل حسب نوع الجهة', 'Pilot readiness by entity type')}
          icon={Layers}
          buckets={readyEntities}
          total={ready.length}
          isRTL={isRTL}
          tone="accent"
        />
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Rocket className="h-4 w-4 text-muted-foreground" />
            {pickBi(isRTL, 'مزودون غير جاهزين — مع الأسباب', 'Not-ready providers — with reasons')}
            <span className="ms-1 text-xs text-muted-foreground tabular-nums">
              ({notReady.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notReady.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {pickBi(isRTL, 'جميع المزودين جاهزون للتشغيل.', 'All providers are pilot-ready.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {notReady.slice(0, 24).map((p) => (
                <BusinessMiniCard
                  key={p.id}
                  business={p}
                  isRTL={isRTL}
                  reasons={pilotReadinessReasons(p, isRTL)}
                  reasonTone="warning"
                  onJumpToBusiness={onJumpToBusiness}
                />
              ))}
              {notReady.length > 24 ? (
                <p className="col-span-full text-[11px] text-muted-foreground text-center">
                  {pickBi(
                    isRTL,
                    `يتم عرض أول 24 من إجمالي ${notReady.length}.`,
                    `Showing first 24 of ${notReady.length}.`,
                  )}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PilotTab;