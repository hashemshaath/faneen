import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { Activity, MapPin, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pickBi } from '@/components/common/Bilingual';
import {
  creationTrend, cityDistribution, buildBusinessesCsv,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';

interface Props {
  isRTL: boolean;
  rows: ReadonlyArray<BusinessMetricsRow>;
}

const tooltipStyle: React.CSSProperties = {
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
};

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const OverviewTrendSection: React.FC<Props> = ({ isRTL, rows }) => {
  const trend = useMemo(() => creationTrend(rows, 30), [rows]);
  const cities = useMemo(() => cityDistribution(rows, isRTL).slice(0, 8), [rows, isRTL]);

  const handleExport = () => {
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`businesses-${ts}.csv`, buildBusinessesCsv(rows));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="business-control-center-trend">
      <Card className="surface-1 hover-lift lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {pickBi(isRTL, 'الإضافات خلال 30 يومًا', 'Additions · last 30 days')}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleExport} className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {pickBi(isRTL, 'تصدير CSV', 'Export CSV')}
          </Button>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
              {pickBi(isRTL, 'لا توجد بيانات تاريخية بعد.', 'No historical data yet.')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="qtCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed={isRTL} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} orientation={isRTL ? 'right' : 'left'} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#qtCreatedGrad)"
                  name={pickBi(isRTL, 'جديدة', 'New')}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="surface-1 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {pickBi(isRTL, 'أعلى المناطق', 'Top regions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cities.length === 0 ? (
            <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
              {pickBi(isRTL, 'لا توجد بيانات منطقة بعد.', 'No region data yet.')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={cities}
                layout="vertical"
                margin={{ top: 4, right: 16, left: isRTL ? 8 : 60, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={isRTL ? 0 : 80}
                  orientation={isRTL ? 'right' : 'left'}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                  {cities.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTrendSection;