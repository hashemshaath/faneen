import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Filter } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import {
  isProviderLike,
  providerSegment,
  providerSegmentLabel,
  pilotReadinessReasons,
  type BusinessMetricsRow,
  type ProviderSegment,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { BusinessMiniCard } from './BusinessMiniCard';
import { ControlChip, type ChipTone } from './ControlChip';

interface ProvidersTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow & {
    name_ar?: string | null; name_en?: string | null;
    ref_id?: string | null; logo_url?: string | null;
  }>;
  isRTL: boolean;
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

const SEGMENTS: ProviderSegment[] = [
  'qualified', 'noContact', 'noPublicLink', 'unpublished', 'pendingOrRejected',
];

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  businesses, isRTL, onJumpToBusiness,
}) => {
  const providers = useMemo(() => businesses.filter(isProviderLike), [businesses]);

  const segmented = useMemo(() => {
    const map = new Map<ProviderSegment, typeof providers>();
    for (const seg of SEGMENTS) map.set(seg, []);
    for (const p of providers) {
      const s = providerSegment(p);
      map.get(s)!.push(p);
    }
    return map;
  }, [providers]);

  const [active, setActive] = useState<ProviderSegment>('qualified');
  const activeRows = segmented.get(active) ?? [];

  if (providers.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/40">
        <CardContent className="p-10 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            {pickBi(isRTL, 'لا يوجد مزودون مطابقون في البيانات الحالية.', 'No matching providers in the current data.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="business-control-center-providers">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SEGMENTS.map((seg) => (
          <AdminKpiCard
            key={seg}
            label={providerSegmentLabel(seg, isRTL)}
            value={segmented.get(seg)?.length ?? 0}
            icon={Briefcase}
            tone={
              seg === 'qualified' ? 'success'
              : seg === 'pendingOrRejected' ? 'destructive'
              : seg === 'unpublished' ? 'muted'
              : 'warning'
            }
          />
        ))}
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {pickBi(isRTL, 'تصفية حسب الشريحة', 'Filter by segment')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SEGMENTS.map((seg) => {
              const isActive = active === seg;
              const count = segmented.get(seg)?.length ?? 0;
              const tone: ChipTone =
                seg === 'qualified' ? 'success'
                : seg === 'pendingOrRejected' ? 'destructive'
                : seg === 'unpublished' ? 'muted'
                : seg === 'noPublicLink' ? 'info'
                : 'warning';
              return (
                <ControlChip
                  key={seg}
                  label={providerSegmentLabel(seg, isRTL)}
                  count={count}
                  tone={tone}
                  active={isActive}
                  onClick={() => setActive(seg)}
                  testId={`providers-seg-${seg}`}
                />
              );
            })}
          </div>

          {activeRows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {pickBi(isRTL, 'لا توجد عناصر ضمن هذه الشريحة.', 'No items in this segment.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {activeRows.slice(0, 30).map((p) => {
                const reasons = active === 'qualified' ? [] : pilotReadinessReasons(p, isRTL);
                return (
                  <BusinessMiniCard
                    key={p.id}
                    business={p}
                    isRTL={isRTL}
                    reasons={reasons}
                    reasonTone={active === 'pendingOrRejected' ? 'destructive' : 'warning'}
                    onJumpToBusiness={onJumpToBusiness}
                  />
                );
              })}
              {activeRows.length > 30 ? (
                <p className="col-span-full text-[11px] text-muted-foreground text-center pt-1">
                  {pickBi(
                    isRTL,
                    `يتم عرض أول 30 من إجمالي ${activeRows.length}.`,
                    `Showing first 30 of ${activeRows.length}.`,
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

export default ProvidersTab;