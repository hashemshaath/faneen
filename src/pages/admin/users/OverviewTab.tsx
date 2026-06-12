import React from 'react';
import { Activity, Briefcase, TrendingUp, UserCheck, Users } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { pickBi } from '@/components/common/Bilingual';
import {
  formatRelative,
  type AdminUsersStats, type SignupSeriesPoint, type RecentAdminActivityItem,
} from './_shared';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';

/**
 * PR-2 of the AdminUsers refactor. Pure display tab — no fetching, no
 * mutations. All data is passed in from the parent so memoisation,
 * query gating, and refetch invalidation stay centralised in AdminUsers.tsx.
 */
export type OverviewTabProps = {
  isRTL: boolean;
  stats: AdminUsersStats;
  signupSeries: SignupSeriesPoint[];
  recentAdminActivity: RecentAdminActivityItem[];
};

export const OverviewTab = React.memo(({
  isRTL, stats, signupSeries, recentAdminActivity,
}: OverviewTabProps) => (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AdminKpiCard icon={Users} tone="primary" label={pickBi(isRTL, 'إجمالي المستخدمين', 'Total Users')} value={stats.totalUsers} />
      <AdminKpiCard icon={Briefcase} tone="success" label={pickBi(isRTL, 'مزودي الخدمات', 'Providers')} value={stats.providers} />
      <AdminKpiCard
        icon={UserCheck}
        tone="info"
        label={pickBi(isRTL, 'مكتمل التسجيل', 'Onboarded')}
        value={stats.onboarded}
        trend={stats.totalUsers > 0 ? `${Math.round((stats.onboarded / stats.totalUsers) * 100)}%` : undefined}
      />
      <AdminKpiCard
        icon={TrendingUp}
        tone="warning"
        label={isRTL ? `جديد هذا الأسبوع • ${stats.last24h} اليوم` : `New 7d • ${stats.last24h} today`}
        value={stats.recentUsers}
        trend={`${stats.wow >= 0 ? '' : '-'}${Math.abs(stats.wow)}%`}
      />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-card p-5">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-accent" />{pickBi(isRTL, 'تسجيلات آخر 30 يوم', 'Signups (30 days)')}</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={signupSeries}>
              <defs>
                <linearGradient id="colTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} /></linearGradient>
                <linearGradient id="colProv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} reversed={isRTL} />
              <YAxis tick={{ fontSize: 10 }} orientation={pickBi(isRTL, 'right', 'left')} />
              <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--accent))" fill="url(#colTotal)" name={pickBi(isRTL, 'الكل', 'Total')} />
              <Area type="monotone" dataKey="providers" stroke="hsl(160 84% 39%)" fill="url(#colProv)" name={pickBi(isRTL, 'مزودين', 'Providers')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-border/30 bg-card p-5">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-accent" />{pickBi(isRTL, 'آخر النشاط الإداري', 'Recent Admin Activity')}</h3>
        <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
          {recentAdminActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{pickBi(isRTL, 'لا يوجد نشاط', 'No activity')}</p>
          ) : recentAdminActivity.slice(0, 12).map(a => (
            <div key={a.id} className="flex items-start gap-2 rounded-xl bg-muted/30 px-2.5 py-1.5">
              <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{a.action}</p>
                <p className="text-[10px] text-muted-foreground">{formatRelative(a.created_at, isRTL)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
));
OverviewTab.displayName = 'OverviewTab';
