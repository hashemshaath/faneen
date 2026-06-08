import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Wrench, ShieldAlert, TrendingDown, Boxes, Activity, Bell } from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import { getAssetOpsCounts } from '../services/operationsHub';
import type { AssetOpsCounts } from '../types';

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

export const AssetOpsCard: React.FC = () => {
  const [counts, setCounts] = useState<AssetOpsCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await getAssetOpsCounts();
      setCounts(data);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2">
          <Boxes className="size-4" />
          <Bi ar="نظرة تشغيلية على الأصول" en="Assets operations snapshot" />
        </div>
      </div>
      {loading || !counts ? (
        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile icon={Boxes} ar="إجمالي الأصول" en="Total assets" value={counts.total} />
          <Tile icon={Activity} ar="متاح للإيجار" en="Available" value={counts.available} />
          <Tile icon={Activity} ar="مؤجَّر حاليًا" en="Rented" value={counts.rented} />
          <Tile icon={Wrench} ar="قيد الصيانة" en="In maintenance" value={counts.maintenance} tone="warning" />
          <Tile icon={Wrench} ar="صيانة متجاوزة" en="Maintenance overdue" value={counts.maintenance_overdue} tone="danger" />
          <Tile icon={Wrench} ar="صيانة خلال 7 أيام" en="Maintenance soon" value={counts.maintenance_due_soon} tone="warning" />
          <Tile icon={ShieldAlert} ar="فحوصات متجاوزة" en="Inspections overdue" value={counts.inspections_overdue} tone="danger" />
          <Tile icon={TrendingDown} ar="استغلال منخفض" en="Low utilization" value={counts.low_utilization} tone="warning" />
          <Tile icon={Bell} ar="تنبيهات مفتوحة" en="Open alerts" value={counts.open_alerts} tone="warning" />
          <Tile icon={Activity} ar="مُستبعد" en="Retired" value={counts.retired} />
        </div>
      )}
    </Card>
  );
};

export default AssetOpsCard;