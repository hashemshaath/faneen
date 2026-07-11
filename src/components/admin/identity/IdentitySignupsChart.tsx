/**
 * IdentitySignupsChart — 30-day signups area chart (users + businesses).
 *
 * Pure client-side aggregation over already-loaded profiles & businesses to
 * avoid an extra DB round trip. Uses Recharts and the project's semantic
 * tokens. Includes RTL-aware axis ordering.
 */
import React, { useMemo, lazy, Suspense } from 'react';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const IdentitySignupsChartInner = lazy(() => import('./IdentitySignupsChart.chart'));

interface HasCreated { created_at: string }

interface Props {
  profiles: HasCreated[];
  businesses: HasCreated[];
  isRTL: boolean;
  days?: number;
}

function bucketize(rows: HasCreated[], days: number): Map<string, number> {
  const m = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    m.set(d.toISOString().slice(0, 10), 0);
  }
  rows.forEach(r => {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    if (m.has(key)) m.set(key, (m.get(key) ?? 0) + 1);
  });
  return m;
}

export const IdentitySignupsChart: React.FC<Props> = ({ profiles, businesses, isRTL, days = 30 }) => {
  const data = useMemo(() => {
    const userMap = bucketize(profiles, days);
    const bizMap = bucketize(businesses, days);
    const out: { day: string; users: number; businesses: number; label: string }[] = [];
    Array.from(userMap.keys()).forEach(key => {
      const d = new Date(key);
      out.push({
        day: key,
        label: d.toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en', { day: '2-digit', month: 'short' }),
        users: userMap.get(key) ?? 0,
        businesses: bizMap.get(key) ?? 0,
      });
    });
    return out;
  }, [profiles, businesses, days, isRTL]);

  const totalUsers = useMemo(() => data.reduce((a, b) => a + b.users, 0), [data]);
  const totalBiz = useMemo(() => data.reduce((a, b) => a + b.businesses, 0), [data]);

  return (
    <div className="rounded-2xl border border-border/30 bg-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {isRTL ? `نمو التسجيلات — آخر ${days} يوم` : `Signups — last ${days} days`}
        </h3>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-info" />
            <span className="text-muted-foreground">{isRTL ? 'مستخدمون' : 'Users'}</span>
            <span className="font-bold tech-content">{totalUsers}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-muted-foreground">{isRTL ? 'منشآت' : 'Businesses'}</span>
            <span className="font-bold tech-content">{totalBiz}</span>
          </span>
        </div>
      </div>

      <div className="w-full h-48">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <IdentitySignupsChartInner data={data} isRTL={isRTL} />
        </Suspense>
      </div>
    </div>
  );
};

export default IdentitySignupsChart;