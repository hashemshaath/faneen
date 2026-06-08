import React from 'react';
import { Bi } from '@/components/common/Bilingual';
import { Wrench, ShieldAlert, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Asset } from '../types';
import { maintenanceTier, daysUntil } from '../utils/lifecycle';

/**
 * RENTAL-ASSET-FINAL-POLISH-3 — polished alert row.
 * Surfaces: maintenance due/overdue, inspection due/overdue,
 * post-rental inspection required, recommended maintenance after a closed rental.
 * Pure presentation — driven entirely by asset fields + flags.
 */
export interface AssetAlertContext {
  postRentalInspectionRequired?: boolean;
  maintenanceRecommendedAfterRental?: boolean;
}

type Tone = 'safe' | 'soon' | 'due' | 'overdue';
const toneClass: Record<Tone, string> = {
  safe: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  soon: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  due: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  overdue: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

const Badge: React.FC<{
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  ar: string; en: string;
  detail?: { ar: string; en: string } | null;
}> = ({ tone, icon: Icon, ar, en, detail }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${toneClass[tone]}`}>
    <Icon className="size-3.5" />
    <span><Bi ar={ar} en={en} /></span>
    {detail && (
      <span className="tech-content opacity-80">· <Bi ar={detail.ar} en={detail.en} /></span>
    )}
  </span>
);

const tierLabel = (
  days: number | null,
  tier: Tone,
): { ar: string; en: string } | null => {
  if (days === null) return null;
  if (tier === 'overdue') {
    const d = Math.abs(days);
    return { ar: `متجاوز ${d} يومًا`, en: `${d}d overdue` };
  }
  if (tier === 'due') return { ar: 'مستحق اليوم', en: 'due today' };
  if (tier === 'soon') return { ar: `خلال ${days} أيام`, en: `in ${days}d` };
  return null;
};

export const AssetMaintenanceAlerts: React.FC<{
  asset: Pick<Asset, 'next_maintenance_at' | 'next_inspection_at'>;
  context?: AssetAlertContext;
}> = ({ asset, context = {} }) => {
  const mTier = maintenanceTier(asset.next_maintenance_at);
  const iTier = maintenanceTier(asset.next_inspection_at);
  const mDays = daysUntil(asset.next_maintenance_at);
  const iDays = daysUntil(asset.next_inspection_at);

  const items: React.ReactNode[] = [];

  if (mTier !== 'safe') {
    items.push(
      <Badge
        key="m"
        tone={mTier}
        icon={mTier === 'overdue' ? AlertTriangle : Wrench}
        ar={mTier === 'overdue' ? 'صيانة متجاوزة' : mTier === 'due' ? 'صيانة مستحقة' : 'صيانة قريبة'}
        en={mTier === 'overdue' ? 'Maintenance overdue' : mTier === 'due' ? 'Maintenance due' : 'Maintenance soon'}
        detail={tierLabel(mDays, mTier)}
      />,
    );
  }

  if (iTier !== 'safe') {
    items.push(
      <Badge
        key="i"
        tone={iTier}
        icon={iTier === 'overdue' ? AlertTriangle : ShieldAlert}
        ar={iTier === 'overdue' ? 'فحص متجاوز' : iTier === 'due' ? 'فحص مستحق' : 'فحص قريب'}
        en={iTier === 'overdue' ? 'Inspection overdue' : iTier === 'due' ? 'Inspection due' : 'Inspection soon'}
        detail={tierLabel(iDays, iTier)}
      />,
    );
  }

  if (context.postRentalInspectionRequired) {
    items.push(
      <Badge
        key="pri"
        tone="due"
        icon={ShieldAlert}
        ar="فحص ما بعد التأجير مطلوب"
        en="Post-rental inspection required"
      />,
    );
  }

  if (context.maintenanceRecommendedAfterRental) {
    items.push(
      <Badge
        key="rec"
        tone="soon"
        icon={Clock}
        ar="يوصى بصيانة بعد إغلاق التأجير"
        en="Maintenance recommended after rental close"
      />,
    );
  }

  if (items.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5" />
        <Bi ar="لا توجد تنبيهات" en="No alerts" />
      </span>
    );
  }

  return <div className="flex flex-wrap gap-1.5" data-testid="asset-maintenance-alerts">{items}</div>;
};

export default AssetMaintenanceAlerts;