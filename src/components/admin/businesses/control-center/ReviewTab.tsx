import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Inbox, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { pickBi } from '@/components/common/Bilingual';
import {
  reviewBuckets,
  pilotReadinessReasons,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { BusinessMiniCard } from './BusinessMiniCard';

interface ReviewTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow & {
    name_ar?: string | null; name_en?: string | null;
    ref_id?: string | null; logo_url?: string | null;
  }>;
  isRTL: boolean;
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({ businesses, isRTL, onJumpToBusiness }) => {
  const buckets = reviewBuckets(businesses, isRTL);
  const totalQueue = useMemo(
    () => buckets.reduce((s, b) => s + b.rows.length, 0),
    [buckets],
  );
  const uniqueQueue = useMemo(() => {
    const ids = new Set<string>();
    for (const b of buckets) for (const r of b.rows) ids.add(r.id);
    return ids.size;
  }, [buckets]);
  const cleanRows = businesses.length - uniqueQueue;
  const chartData = useMemo(
    () => buckets.map((b) => ({ key: b.key, label: b.label, count: b.rows.length })),
    [buckets],
  );
  const PALETTE = [
    'hsl(var(--warning))',
    'hsl(var(--primary))',
    'hsl(var(--muted-foreground))',
    'hsl(var(--accent))',
    'hsl(var(--info, var(--primary)))',
    'hsl(var(--destructive))',
  ];

  return (
    <div className="space-y-4" data-testid="business-control-center-review">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminKpiCard
          label={pickBi(isRTL, 'إجمالي قائمة المراجعة', 'Review queue size')}
          value={uniqueQueue} icon={Inbox} tone="warning"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'تنبيهات مفتوحة', 'Open flags')}
          value={totalQueue} icon={AlertTriangle} tone="destructive"
          trend={pickBi(isRTL, 'قد تتكرر في أكثر من قائمة', 'rows may appear in >1 list')}
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'نظيفة (لا تحتاج إجراء)', 'Clean rows')}
          value={Math.max(cleanRows, 0)} icon={CheckCircle2} tone="success"
        />
        <AdminKpiCard
          label={pickBi(isRTL, 'قوائم نشطة', 'Active buckets')}
          value={buckets.filter((b) => b.rows.length > 0).length}
          icon={ShieldCheck} tone="primary"
        />
      </div>

      <Card className="surface-1 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-warning-foreground" />
            {pickBi(isRTL, 'حجم كل قائمة', 'Bucket sizes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalQueue === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {pickBi(isRTL, 'لا توجد عناصر للمراجعة.', 'Nothing to review.')}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData} layout="vertical"
                margin={{ top: 4, right: 16, left: isRTL ? 8 : 100, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <YAxis
                  dataKey="label" type="category"
                  stroke="hsl(var(--muted-foreground))" fontSize={11}
                  width={isRTL ? 0 : 110}
                  orientation={isRTL ? 'right' : 'left'}
                />
                <Tooltip contentStyle={{
                  background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))',
                  border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12,
                }} />
                <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {buckets.map((b) => (
        <Card key={b.key} className="rounded-3xl border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {b.label}
              <span className="ms-1 text-xs text-muted-foreground tabular-nums">
                ({b.rows.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {b.rows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                {pickBi(isRTL, 'لا توجد عناصر في هذه القائمة.', 'No items in this bucket.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {b.rows.slice(0, 20).map((row) => (
                  <BusinessMiniCard
                    key={row.id}
                    business={row}
                    isRTL={isRTL}
                    reasons={pilotReadinessReasons(row, isRTL).slice(0, 3)}
                    reasonTone="warning"
                    onJumpToBusiness={onJumpToBusiness}
                  />
                ))}
                {b.rows.length > 20 ? (
                  <p className="col-span-full text-[11px] text-muted-foreground text-center">
                    {pickBi(
                      isRTL,
                      `يتم عرض أول 20 من إجمالي ${b.rows.length}.`,
                      `Showing first 20 of ${b.rows.length}.`,
                    )}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReviewTab;