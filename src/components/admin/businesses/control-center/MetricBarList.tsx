import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pickBi } from '@/components/common/Bilingual';
import type { DistributionBucket } from '@/modules/admin/businesses/businessAdminMetrics';

/**
 * Visual bar list — pure proportional bars rendered from real
 * distribution buckets. No charting dependency, no hardcoded data,
 * no hex colors (semantic tokens only). Empty `buckets` → empty
 * state.
 */
interface MetricBarListProps {
  title: string;
  icon?: React.ElementType;
  buckets: ReadonlyArray<DistributionBucket>;
  total: number;
  isRTL: boolean;
  /** Optional semantic tone for the bar fill. */
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive' | 'info';
}

const TONE: Record<NonNullable<MetricBarListProps['tone']>, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
};

export const MetricBarList: React.FC<MetricBarListProps> = ({
  title, icon: Icon, buckets, total, isRTL, tone = 'primary',
}) => {
  const has = buckets.length > 0 && total > 0;
  return (
    <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!has && (
          <p
            className="text-xs text-muted-foreground py-6 text-center"
            data-testid="metric-bar-empty"
          >
            {pickBi(isRTL, 'لا توجد بيانات كافية بعد.', 'Not enough data yet.')}
          </p>
        )}
        {has && buckets.map((b) => {
          const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
          return (
            <div key={b.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground truncate">{b.label}</span>
                <span className="tabular-nums tech-content font-medium">
                  {b.count}
                  <span className="text-muted-foreground"> · {pct}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${TONE[tone]} transition-[width]`}
                  style={{ width: `${Math.max(pct, b.count > 0 ? 4 : 0)}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MetricBarList;