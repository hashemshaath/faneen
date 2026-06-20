import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Phone, Link2, FileText, Image as ImageIcon } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import type { DistributionBucket } from '@/modules/admin/businesses/businessAdminMetrics';

interface Props {
  buckets: ReadonlyArray<DistributionBucket>;
  total: number;
  isRTL: boolean;
  /** Average completeness % across all rows (0..100). */
  avgCompleteness: number;
}

const ICONS: Record<string, React.ElementType> = {
  contact: Phone,
  publicLink: Link2,
  description: FileText,
  media: ImageIcon,
};

/**
 * Unified data-completeness panel for the overview tab. Replaces the
 * legacy MetricBarList trio with a single, dense visualization that
 * pairs the average score with the per-dimension breakdown.
 */
export const CompletenessSection: React.FC<Props> = ({
  buckets, total, isRTL, avgCompleteness,
}) => {
  return (
    <Card className="surface-1 hover-lift" data-testid="control-center-completeness">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-warning-foreground" />
          {pickBi(isRTL, 'فجوات اكتمال البيانات', 'Data completeness gaps')}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {pickBi(isRTL, 'متوسط الاكتمال', 'Average')}
          <span className="ms-1.5 text-base font-bold text-foreground tabular-nums">
            {avgCompleteness}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            {pickBi(isRTL, 'لا توجد بيانات بعد.', 'No data yet.')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {buckets.map((b) => {
              const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
              const Icon = ICONS[b.key] ?? ListChecks;
              const severity = pct >= 50 ? 'destructive' : pct >= 25 ? 'warning' : 'success';
              const fillCls =
                severity === 'destructive' ? 'bg-destructive'
                : severity === 'warning' ? 'bg-warning' : 'bg-success';
              const dotCls =
                severity === 'destructive' ? 'text-destructive'
                : severity === 'warning' ? 'text-warning-foreground' : 'text-success';
              return (
                <div key={b.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className={`h-3.5 w-3.5 ${dotCls}`} />
                      <span>{b.label}</span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {b.count}
                      <span className="text-muted-foreground"> · {pct}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fillCls} transition-all`}
                      style={{ width: `${Math.max(pct, b.count > 0 ? 3 : 0)}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompletenessSection;