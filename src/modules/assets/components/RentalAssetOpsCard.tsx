import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle, Link2, Layers, Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import {
  getRentalAssetOpsCounts,
  type RentalAssetOpsCounts,
} from '../services/rentalAssignments';

const Tile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  ar: string; en: string; value: number;
  tone?: 'default' | 'warning' | 'danger';
}> = ({ icon: Icon, ar, en, value, tone = 'default' }) => {
  const toneCls = tone === 'danger'
    ? 'text-rose-700 dark:text-rose-300'
    : tone === 'warning'
    ? 'text-amber-700 dark:text-amber-300'
    : 'text-foreground';
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/60 p-3 hover-lift">
      <Icon className={`size-5 ${toneCls}`} />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground"><Bi ar={ar} en={en} /></div>
        <div className={`text-lg font-semibold tech-content ${toneCls}`}>{value}</div>
      </div>
    </div>
  );
};

/**
 * RENTAL-ASSET-INTEGRATION-1 — Operations Center widget surfacing mismatches
 * between rental orders and asset lifecycle (orders without assets, overdue,
 * overlaps, pending post-rental inspections, etc.).
 */
export const RentalAssetOpsCard: React.FC = () => {
  const [counts, setCounts] = useState<RentalAssetOpsCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getRentalAssetOpsCounts();
    setCounts(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2">
          <Link2 className="size-4" />
          <Bi ar="ربط التأجير بالأصول" en="Rental ↔ Assets integration" />
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          aria-label="refresh"
        >
          <RefreshCw className="size-3.5" />
          <Bi ar="تحديث" en="Refresh" />
        </button>
      </div>
      {loading || !counts ? (
        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile icon={AlertTriangle} ar="عقود بدون أصول مرتبطة" en="Orders without assets" value={counts.orders_without_assets} tone="warning" />
          <Tile icon={AlertTriangle} ar="حالة الأصل ≠ مؤجَّر" en="Active orders / asset not rented" value={counts.orders_active_asset_not_rented} tone="danger" />
          <Tile icon={AlertTriangle} ar="مغلق ولكن مازال مؤجَّر" en="Closed but asset still rented" value={counts.orders_closed_asset_still_rented} tone="danger" />
          <Tile icon={Clock} ar="متأخرات بأصول مرتبطة" en="Overdue with assets" value={counts.overdue_with_assets} tone="danger" />
          <Tile icon={ShieldAlert} ar="فحوصات ما بعد التأجير" en="Post-rental inspections" value={counts.post_rental_inspections_pending} tone="warning" />
          <Tile icon={Layers} ar="تخصيصات متداخلة" en="Overlapping assignments" value={counts.overlapping_assignments} tone="danger" />
        </div>
      )}
    </Card>
  );
};

export default RentalAssetOpsCard;
