import React from 'react';
import { Ban, Crown, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { pickBi } from '@/components/common/Bilingual';
import {
  KpiCard,
  type AdminUsersStats, type AccountTypePiePoint, type TierBarPoint,
} from './_shared';

/**
 * PR-3 of the AdminUsers refactor. Pure display tab — no fetching, no
 * mutations. Owns the Pie/Bar Recharts imports so they only enter the bundle
 * when this tab is rendered (parent keeps the Area chart via OverviewTab).
 */
export type AnalyticsTabProps = {
  isRTL: boolean;
  stats: AdminUsersStats;
  accountTypePie: AccountTypePiePoint[];
  tierBar: TierBarPoint[];
};

export const AnalyticsTab = React.memo(({
  isRTL, stats, accountTypePie, tierBar,
}: AnalyticsTabProps) => (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon={ShieldAlert} label={pickBi(isRTL, 'مشرف أعلى', 'Super Admins')} value={stats.superAdmins} gradient="from-secondary/10 to-secondary/5" iconBg="bg-secondary/15 text-secondary" />
      <KpiCard icon={Crown} label={pickBi(isRTL, 'المشرفين', 'Admins')} value={stats.admins} gradient="from-destructive/10 to-destructive/5" iconBg="bg-destructive/15 text-destructive" />
      <KpiCard icon={ShieldCheck} label={pickBi(isRTL, 'مشرفي محتوى', 'Moderators')} value={stats.moderators} gradient="from-warning/10 to-warning/5" iconBg="bg-warning/15 text-warning" />
      <KpiCard icon={Ban} label={pickBi(isRTL, 'معطّلون', 'Disabled')} value={stats.bannedCount} gradient="from-destructive/10 to-destructive/5" iconBg="bg-destructive/15 text-destructive" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border/30 bg-card p-5">
        <h3 className="font-heading font-bold text-sm mb-3">{pickBi(isRTL, 'توزيع أنواع الحسابات', 'Account Type Distribution')}</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={accountTypePie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {accountTypePie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-border/30 bg-card p-5">
        <h3 className="font-heading font-bold text-sm mb-3">{pickBi(isRTL, 'توزيع العضويات', 'Membership Tiers')}</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={tierBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed={isRTL} />
              <YAxis tick={{ fontSize: 11 }} orientation={pickBi(isRTL, 'right', 'left')} />
              <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </>
));
AnalyticsTab.displayName = 'AnalyticsTab';
