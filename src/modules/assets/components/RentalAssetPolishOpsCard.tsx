import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Bi } from '@/components/common/Bilingual';
import {
  Loader2, TrendingDown, QrCode, ShieldAlert, ClipboardList, History, RefreshCw,
} from 'lucide-react';
import {
  getRentalAssetPolishCounts,
  type RentalAssetPolishCounts,
} from '../services/utilizationSummary';

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
 * RENTAL-ASSET-FINAL-POLISH-3 — final operations polish tiles.
 * Surfaces low utilization, missing QR identity, overdue inspections,
 * post-rental inspection queue, and repeatedly overridden assets.
 */
export const RentalAssetPolishOpsCard: React.FC = () => {
  const [counts, setCounts] = useState<RentalAssetPolishCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getRentalAssetPolishCounts();
    setCounts(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4 space-y-3" data-testid="rental-asset-polish-ops">
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2">
          <ClipboardList className="size-4" />
          <Bi ar="الجاهزية التشغيلية النهائية" en="Final operational readiness" />
        </div>
        <button
          type="button" onClick={load}
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
          <Tile icon={TrendingDown} ar="استغلال منخفض" en="Low utilization" value={counts.low_utilization_assets} tone="warning" />
          <Tile icon={QrCode} ar="أصول بدون تعريف QR" en="Assets without QR" value={counts.assets_without_qr} tone="warning" />
          <Tile icon={ShieldAlert} ar="فحوصات متجاوزة" en="Inspections overdue" value={counts.inspections_overdue} tone="danger" />
          <Tile icon={ClipboardList} ar="قائمة فحوصات ما بعد التأجير" en="Post-rental inspection queue" value={counts.post_rental_inspection_queue} tone="warning" />
          <Tile icon={History} ar="أصول تجاوزات متكررة" en="Repeatedly overridden" value={counts.repeated_overrides} tone="danger" />
        </div>
      )}
    </Card>
  );
};

export default RentalAssetPolishOpsCard;