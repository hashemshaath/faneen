import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { PieChart as PieIcon, Layers, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pickBi } from '@/components/common/Bilingual';
import type { DistributionBucket, BusinessOverviewMetrics } from '@/modules/admin/businesses/businessAdminMetrics';

interface Props {
  isRTL: boolean;
  metrics: BusinessOverviewMetrics;
  status: DistributionBucket[];
  entityType: DistributionBucket[];
}

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

const EmptyState: React.FC<{ isRTL: boolean }> = ({ isRTL }) => (
  <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">
    {pickBi(isRTL, 'لا توجد بيانات كافية بعد.', 'Not enough data yet.')}
  </div>
);

export const OverviewChartsSection: React.FC<Props> = ({
  isRTL, metrics, status, entityType,
}) => {
  const total = metrics.total || 1;
  const healthScore = Math.round(
    ((metrics.published + metrics.verified + metrics.pilotReady) /
      (Math.max(metrics.total, 1) * 3)) * 100,
  );

  const radialData = [{ name: 'health', value: healthScore, fill: 'hsl(var(--primary))' }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="business-control-center-charts">
      <Card className="surface-1 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4 text-success" />
            {pickBi(isRTL, 'مؤشر الجاهزية', 'Readiness index')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={12} fill="hsl(var(--primary))" />
              <text
                x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                className="fill-foreground"
                style={{ fontSize: 28, fontWeight: 700 }}
              >
                {healthScore}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
            <div>
              <div className="text-muted-foreground">{pickBi(isRTL, 'منشورة', 'Published')}</div>
              <div className="font-semibold">{metrics.published}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{pickBi(isRTL, 'موثّقة', 'Verified')}</div>
              <div className="font-semibold">{metrics.verified}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{pickBi(isRTL, 'للتشغيل', 'Pilot')}</div>
              <div className="font-semibold">{metrics.pilotReady}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-1 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            {pickBi(isRTL, 'توزيع الحالات', 'Status mix')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status.length === 0 ? <EmptyState isRTL={isRTL} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={status}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {status.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [`${v} · ${Math.round((v / total) * 100)}%`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="surface-1 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            {pickBi(isRTL, 'توزيع نوع الجهة', 'Entity mix')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entityType.length === 0 ? <EmptyState isRTL={isRTL} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={entityType}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {entityType.map((_, i) => (
                    <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [`${v} · ${Math.round((v / total) * 100)}%`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewChartsSection;