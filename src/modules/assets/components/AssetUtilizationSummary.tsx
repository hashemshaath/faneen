import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Bi } from '@/components/common/Bilingual';
import { Loader2, TrendingUp, Calendar, History, Activity } from 'lucide-react';
import {
  getAssetUtilizationSummary,
  type AssetUtilizationSummary as Summary,
} from '../services/utilizationSummary';
import { AssetStatusBadge } from './AssetStatusBadge';

/**
 * RENTAL-ASSET-FINAL-POLISH-3 — operational utilization summary card.
 * Shows only operational metadata: no customer names, no prices.
 */
export const AssetUtilizationSummary: React.FC<{
  assetId: string;
  windowDays?: number;
}> = ({ assetId, windowDays = 90 }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await getAssetUtilizationSummary(assetId, windowDays);
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assetId, windowDays]);

  if (loading) {
    return <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin" /></div>;
  }
  if (!summary) return null;

  const pctTone = summary.utilization_pct >= 60
    ? 'text-emerald-700 dark:text-emerald-300'
    : summary.utilization_pct >= 25
    ? 'text-foreground'
    : 'text-amber-700 dark:text-amber-300';

  return (
    <Card className="p-3 space-y-3" data-testid="asset-utilization-summary">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="size-4 text-primary" />
          <Bi
            ar={`الاستغلال خلال ${summary.window_days} يومًا`}
            en={`Utilization · last ${summary.window_days} days`}
          />
        </div>
        <AssetStatusBadge status={summary.current_status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border bg-card/60 p-2">
          <div className="text-muted-foreground"><Bi ar="أيام التأجير" en="Days rented" /></div>
          <div className="font-semibold tech-content">{summary.days_rented}</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-2">
          <div className="text-muted-foreground"><Bi ar="أيام الخمول" en="Days idle" /></div>
          <div className="font-semibold tech-content">{summary.days_idle}</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-2">
          <div className="text-muted-foreground"><Bi ar="نسبة الاستغلال" en="Utilization %" /></div>
          <div className={`font-semibold tech-content ${pctTone}`}>{summary.utilization_pct}%</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-2">
          <div className="text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3" />
            <Bi ar="التوافر القادم" en="Next available" />
          </div>
          <div className="font-semibold tech-content">{summary.next_available_date ?? '—'}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <History className="size-3.5" />
        <Bi ar="آخر مرجع تأجير:" en="Last rental ref:" />
        <span className="tech-content font-medium">{summary.last_rental_ref ?? '—'}</span>
        <span className="mx-1">·</span>
        <Activity className="size-3.5" />
        <span className="tech-content">{summary.current_status}</span>
      </div>
    </Card>
  );
};

export default AssetUtilizationSummary;