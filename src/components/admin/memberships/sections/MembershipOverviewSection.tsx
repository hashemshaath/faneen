/**
 * Presentational overview tab for AdminMemberships.
 * Pure UI — receives pre-computed stats and an export callback from the parent.
 * No Supabase, no queries, no mutations.
 */
import React from 'react';
import { pickBi } from '@/components/common/Bilingual';
import { Card, CardContent } from '@/components/ui/card';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import {
  Users, UserCheck, DollarSign, AlertTriangle, Layers, Activity,
} from 'lucide-react';
import { TIERS, tierIcons, tierColors } from '@/lib/membership-tiers';
import { cn } from '@/lib/utils';

export interface MembershipOverviewStats {
  total: number;
  active: number;
  cancelled: number;
  expired: number;
  expiringSoon: number;
  monthly: number;
  yearly: number;
  revenue: number;
  tierDist: Array<{ tier: typeof TIERS[number]; count: number }>;
}

export interface MembershipOverviewSectionProps {
  stats: MembershipOverviewStats;
  isRTL: boolean;
  onExport: () => void;
}

export const MembershipOverviewSection: React.FC<MembershipOverviewSectionProps> = ({
  stats, isRTL, onExport,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminKpiCard
          icon={Users}
          tone="primary"
          label={pickBi(isRTL, 'إجمالي الاشتراكات', 'Total Subscriptions')}
          value={stats.total}
        />
        <AdminKpiCard
          icon={UserCheck}
          tone="success"
          label={pickBi(isRTL, 'نشط حالياً', 'Currently Active')}
          value={stats.active}
          trend={stats.active > 0 ? pickBi(isRTL, 'مباشر', 'LIVE') : undefined}
        />
        <AdminKpiCard
          icon={DollarSign}
          tone="info"
          label={pickBi(isRTL, 'الإيراد الشهري', 'Monthly Revenue')}
          value={`${Math.round(stats.revenue).toLocaleString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en-US'))} SAR`}
        />
        <AdminKpiCard
          icon={AlertTriangle}
          tone={stats.expiringSoon > 0 ? 'warning' : 'muted'}
          label={pickBi(isRTL, 'ينتهي قريباً', 'Expiring Soon')}
          value={stats.expiringSoon}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="border border-border/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {pickBi(isRTL, 'توزيع العضويات', 'Tier Distribution')}
            </h3>
            <span className="px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-md text-[9px] font-bold uppercase tracking-wide">
              {pickBi(isRTL, 'تحديث تلقائي', 'Auto')}
            </span>
          </div>
          <CardContent className="p-5">
            <div className="space-y-4">
              {stats.tierDist.map(({ tier, count }) => {
                const colors = tierColors[tier];
                const Icon = tierIcons[tier];
                const pct = stats.active > 0 ? Math.round((count / stats.active) * 100) : 0;
                const isEmpty = count === 0;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border',
                      isEmpty ? 'bg-muted/30 text-muted-foreground/50 border-dashed border-border' : cn(colors.badge, 'border-transparent')
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-bold capitalize', isEmpty && 'text-muted-foreground/70')}>{tier}</span>
                        <span className={cn(
                          'text-[10px] font-bold tech-content tabular-nums',
                          isEmpty ? 'text-muted-foreground/60' : 'text-primary'
                        )}>
                          <span>{count}</span>
                          <span className="text-muted-foreground mx-1">·</span>
                          <span>{pct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className={cn(
                          'h-full rounded-full transition-all duration-500',
                          tier === 'free' ? 'bg-muted-foreground/40' : tier === 'basic' ? 'bg-info' : tier === 'premium' ? 'bg-accent' : 'bg-secondary'
                        )} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {pickBi(isRTL, 'ملخص الحالة', 'Status Summary')}
            </h3>
            <button
              type="button"
              onClick={onExport}
              className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wide"
            >
              {pickBi(isRTL, 'تصدير التقرير', 'Export')}
            </button>
          </div>
          <CardContent className="p-5 space-y-4">
            {[
              { label: pickBi(isRTL, 'شهري نشط', 'Monthly Active'), value: stats.monthly, denom: stats.active, color: 'bg-info' },
              { label: pickBi(isRTL, 'سنوي نشط', 'Yearly Active'), value: stats.yearly, denom: stats.active, color: 'bg-accent' },
              { label: pickBi(isRTL, 'ينتهي خلال أسبوع', 'Expiring (7d)'), value: stats.expiringSoon, denom: stats.active, color: 'bg-warning' },
              { label: pickBi(isRTL, 'ملغي', 'Cancelled'), value: stats.cancelled, denom: stats.total, color: 'bg-destructive' },
              { label: pickBi(isRTL, 'منتهي', 'Expired'), value: stats.expired, denom: stats.total, color: 'bg-muted-foreground/50' },
            ].map((row, i) => {
              const pct = row.denom > 0 ? Math.round((row.value / row.denom) * 100) : 0;
              const isEmpty = row.value === 0;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-medium', isEmpty ? 'text-muted-foreground/70' : 'text-foreground')}>{row.label}</span>
                    <span className={cn(
                      'font-bold tech-content tabular-nums',
                      isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
                    )}>{row.value}</span>
                  </div>
                  <div className={cn('h-1.5 rounded-full overflow-hidden', isEmpty ? 'bg-muted/30 border border-dashed border-border/60' : 'bg-muted/40')}>
                    <div className={cn('h-full rounded-full transition-all duration-500', row.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MembershipOverviewSection;