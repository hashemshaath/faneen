import React, { useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Info, Building2, MapPin, ShieldCheck, Gauge, ListChecks } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { MetricBarList } from './MetricBarList';
import {
  entityTypeDistribution,
  statusDistribution,
  cityDistribution,
  verificationDistribution,
  completenessTierDistribution,
  type BusinessMetricsRow,
  type DistributionBucket,
} from '@/modules/admin/businesses/businessAdminMetrics';

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--info, var(--primary)))',
];

const tooltipStyle: React.CSSProperties = {
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
};

interface TaxonomiesTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow>;
  isRTL: boolean;
}

/**
 * Taxonomies & sectors tab.
 *
 * The `businesses` row shape exposes `entity_type` reliably; there is
 * no dedicated sector column on this row, so we show the closest real
 * proxy (entity-type distribution) and call out the data-source gap
 * in plain language. No fake categories, no invented data.
 */
export const TaxonomiesTab: React.FC<TaxonomiesTabProps> = ({ businesses, isRTL }) => {
  const entityBuckets = useMemo(
    () => entityTypeDistribution(businesses, isRTL),
    [businesses, isRTL],
  );
  const regionBuckets = useMemo(() => cityDistribution(businesses, isRTL), [businesses, isRTL]);
  const statusBuckets = useMemo(() => statusDistribution(businesses, isRTL), [businesses, isRTL]);
  const verifyBuckets = useMemo(() => verificationDistribution(businesses, isRTL), [businesses, isRTL]);
  const tierBuckets = useMemo(() => completenessTierDistribution(businesses, isRTL), [businesses, isRTL]);

  const total = businesses.length;
  const dominant = entityBuckets[0];
  const dominantPct = dominant && total
    ? Math.round((dominant.count / total) * 100) : 0;
  const typedTotal = entityBuckets.reduce((s, b) => s + b.count, 0);
  const geoTotal = regionBuckets.reduce((s, b) => s + b.count, 0);
  const dominantRegion = regionBuckets[0];

  return (
    <div className="space-y-4" data-testid="business-control-center-taxonomies">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <AdminKpiCard
          label={pickBi(isRTL, 'إجمالي الجهات', 'Total entities')}
          value={total} icon={Building2} tone="primary"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'أنواع مميّزة', 'Distinct types')}
          value={entityBuckets.length} icon={Layers} tone="accent"
          hint={pickBi(isRTL, 'حسب entity_type', 'by entity_type')}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'النوع السائد', 'Dominant type')}
          value={dominant?.label ?? '—'} icon={Layers} tone="success"
          trend={dominant ? `${dominantPct}%` : undefined}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'مناطق جغرافية', 'Regions covered')}
          value={regionBuckets.length} icon={MapPin} tone="info"
          hint={dominantRegion ? `${pickBi(isRTL, 'الأكثر', 'Top')}: ${dominantRegion.label}` : undefined}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'بدون تصنيف', 'Unclassified')}
          value={(total - typedTotal) + (total - geoTotal)}
          icon={Info} tone="warning"
          hint={pickBi(isRTL, 'بدون نوع أو منطقة', 'no type or region')}
        />
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/60">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            {pickBi(
              isRTL,
              'لا يتوفر عمود قطاع/خدمة على صف الجهة في الاستعلام الحالي. لذلك نُصنّف الجهات وفق الإشارات المتاحة فعلًا في البيانات: النوع، المنطقة، حالة الاعتماد، التوثيق، وجودة الاكتمال — دون اختراع تصنيفات.',
              'No sector/service column exists on the business row in the current query. Instead we classify entities by every real signal in the data: type, region, approval status, verification, and completeness — without inventing taxonomies.',
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaxonomyDonut
          title={pickBi(isRTL, 'حسب النوع', 'By entity type')}
          icon={Layers}
          buckets={entityBuckets}
          total={total}
          isRTL={isRTL}
        />
        <MetricBarList
          title={pickBi(isRTL, 'حسب المنطقة', 'By region')}
          icon={MapPin}
          buckets={regionBuckets}
          total={total}
          isRTL={isRTL}
          tone="info"
        />
        <TaxonomyDonut
          title={pickBi(isRTL, 'حسب حالة الاعتماد', 'By approval status')}
          icon={ListChecks}
          buckets={statusBuckets}
          total={total}
          isRTL={isRTL}
        />
        <TaxonomyDonut
          title={pickBi(isRTL, 'حسب التوثيق', 'By verification')}
          icon={ShieldCheck}
          buckets={verifyBuckets}
          total={total}
          isRTL={isRTL}
        />
        <MetricBarList
          title={pickBi(isRTL, 'حسب مستوى الاكتمال', 'By completeness tier')}
          icon={Gauge}
          buckets={tierBuckets}
          total={total}
          isRTL={isRTL}
          tone="success"
        />
      </div>
    </div>
  );
};

export default TaxonomiesTab;

interface DonutProps {
  title: string;
  icon: React.ElementType;
  buckets: ReadonlyArray<DistributionBucket>;
  total: number;
  isRTL: boolean;
}

const TaxonomyDonut: React.FC<DonutProps> = ({ title, icon: Icon, buckets, total, isRTL }) => (
  <Card className="surface-1 hover-lift">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {buckets.length === 0 ? (
        <p className="text-xs text-muted-foreground py-10 text-center">
          {pickBi(isRTL, 'لا توجد بيانات كافية بعد.', 'Not enough data yet.')}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={[...buckets]} dataKey="count" nameKey="label"
              innerRadius={55} outerRadius={88} paddingAngle={2}
              stroke="hsl(var(--background))" strokeWidth={2}
            >
              {buckets.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, n: string) => [
                `${v} · ${total ? Math.round((v / total) * 100) : 0}%`, n,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);