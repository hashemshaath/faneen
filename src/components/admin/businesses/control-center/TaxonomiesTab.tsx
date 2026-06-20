import React, { useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Info, Building2 } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { MetricBarList } from './MetricBarList';
import {
  entityTypeDistribution,
  type BusinessMetricsRow,
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
  const total = businesses.length;
  const dominant = entityBuckets[0];
  const dominantPct = dominant && total
    ? Math.round((dominant.count / total) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="business-control-center-taxonomies">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminKpiCard
          label={pickBi(isRTL, 'إجمالي الجهات', 'Total entities')}
          value={total} icon={Building2} tone="primary"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'أنواع مميّزة', 'Distinct types')}
          value={entityBuckets.length} icon={Layers} tone="accent"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'النوع السائد', 'Dominant type')}
          value={dominant?.label ?? '—'} icon={Layers} tone="success"
          trend={dominant ? `${dominantPct}%` : undefined}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'بدون نوع مصنّف', 'Untyped')}
          value={total - entityBuckets.reduce((s, b) => s + b.count, 0)}
          icon={Info} tone="warning"
        />
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/60">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            {pickBi(
              isRTL,
              'لا يتوفر مصدر تصنيف مفصّل (قطاع/خدمة) على مستوى صف الجهة في البيانات الحالية. نعرض هنا توزيع أنواع الجهات كأقرب مؤشر حقيقي بدون اختراع بيانات.',
              'No detailed sector/service taxonomy exists on the business row in the current data. We show entity-type distribution as the closest real signal, without inventing data.',
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="surface-1 hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              {pickBi(isRTL, 'النسب البصرية', 'Visual share')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entityBuckets.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">
                {pickBi(isRTL, 'لا توجد بيانات كافية بعد.', 'Not enough data yet.')}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={entityBuckets} dataKey="count" nameKey="label"
                    innerRadius={60} outerRadius={95} paddingAngle={2}
                    stroke="hsl(var(--background))" strokeWidth={2}
                  >
                    {entityBuckets.map((_, i) => (
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

        <MetricBarList
          title={pickBi(isRTL, 'توزيع أنواع الجهات', 'Entity-type distribution')}
          icon={Layers}
          buckets={entityBuckets}
          total={total}
          isRTL={isRTL}
          tone="accent"
        />
      </div>
    </div>
  );
};

export default TaxonomiesTab;