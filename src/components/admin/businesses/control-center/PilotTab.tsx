import React, { useMemo } from 'react';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, MapPin, Layers, Gauge, AlertCircle } from 'lucide-react';
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
  const readyPct = providers.length
    ? Math.round((ready.length / providers.length) * 100) : 0;
  const reasonsAgg = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of notReady) {
      for (const r of pilotReadinessReasons(p, isRTL)) {
        counts.set(r, (counts.get(r) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [notReady, isRTL]);
  const REASON_PALETTE = [
    'hsl(var(--destructive))',
    'hsl(var(--warning))',
    'hsl(var(--accent))',
    'hsl(var(--primary))',
    'hsl(var(--info, var(--primary)))',
    'hsl(var(--muted-foreground))',
  ];

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
        <Card className="surface-1 hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-success" />
              {pickBi(isRTL, 'نسبة الجاهزية للتشغيل', 'Pilot-readiness rate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart
                innerRadius="70%" outerRadius="100%"
                data={[{ name: 'ready', value: readyPct, fill: 'hsl(var(--success))' }]}
                startAngle={90} endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={12} fill="hsl(var(--success))" />
                <text
                  x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                  className="fill-foreground" style={{ fontSize: 26, fontWeight: 700 }}
                >
                  {readyPct}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              {pickBi(
                isRTL,
                `${ready.length} جاهز من ${providers.length} مزود`,
                `${ready.length} ready of ${providers.length} providers`,
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="surface-1 hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning-foreground" />
              {pickBi(isRTL, 'أسباب عدم الجاهزية', 'Blocking reasons')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reasonsAgg.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">
                {pickBi(isRTL, 'لا توجد أسباب مفتوحة.', 'No open reasons.')}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={reasonsAgg} layout="vertical"
                  margin={{ top: 4, right: 16, left: isRTL ? 8 : 110, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <YAxis
                    dataKey="label" type="category"
                    stroke="hsl(var(--muted-foreground))" fontSize={11}
                    width={isRTL ? 0 : 120}
                    orientation={isRTL ? 'right' : 'left'}
                  />
                  <Tooltip contentStyle={{
                    background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))',
                    border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12,
                  }} />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                    {reasonsAgg.map((_, i) => (
                      <Cell key={i} fill={REASON_PALETTE[i % REASON_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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