import React from 'react';
import { Ban, Crown, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { pickBi } from '@/components/common/Bilingual';
import {
  type AdminUsersStats, type AccountTypePiePoint, type TierBarPoint,
} from './_shared';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';

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
      <AdminKpiCard icon={ShieldAlert} tone="secondary"   label={pickBi(isRTL, 'مشرف أعلى', 'Super Admins')} value={stats.superAdmins} />
      <AdminKpiCard icon={Crown}       tone="destructive" label={pickBi(isRTL, 'المشرفين', 'Admins')}       value={stats.admins} />
      <AdminKpiCard icon={ShieldCheck} tone="warning"     label={pickBi(isRTL, 'مشرفي محتوى', 'Moderators')} value={stats.moderators} />
      <AdminKpiCard icon={Ban}         tone="destructive" label={pickBi(isRTL, 'معطّلون', 'Disabled')}      value={stats.bannedCount} />
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
