import React from 'react';
import {
  Users, Briefcase, UserCheck, Crown, Ban, TrendingUp, UserX, Inbox,
} from 'lucide-react';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { pickBi } from '@/components/common/Bilingual';
import type { AdminUserStats } from './types';

export interface AdminUsersStatsStripProps {
  isRTL: boolean;
  stats: AdminUserStats;
}

/**
 * Phase 6A — colored KPI strip for /admin/users.
 *
 * Pure presentational: receives a pre-computed `AdminUserStats` object
 * from the page and renders the canonical 8-cell layout using the
 * shared `AdminKpiCard` primitive with semantic tones. No data fetch,
 * no role checks, no Supabase. Order matches the spec: total, active,
 * suspended, admins, providers, customers, incomplete, recent 7d.
 */
export const AdminUsersStatsStrip = React.memo(function AdminUsersStatsStrip({
  isRTL,
  stats,
}: AdminUsersStatsStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      <AdminKpiCard
        icon={Users}
        tone="primary"
        label={pickBi(isRTL, 'الإجمالي', 'Total')}
        value={stats.total}
      />
      <AdminKpiCard
        icon={UserCheck}
        tone="success"
        label={pickBi(isRTL, 'نشطون', 'Active')}
        value={stats.active}
      />
      <AdminKpiCard
        icon={UserX}
        tone="destructive"
        label={pickBi(isRTL, 'موقوفون', 'Suspended')}
        value={stats.suspended}
      />
      <AdminKpiCard
        icon={Crown}
        tone="accent"
        label={pickBi(isRTL, 'فريق الإدارة', 'Admin team')}
        value={stats.admins}
      />
      <AdminKpiCard
        icon={Briefcase}
        tone="info"
        label={pickBi(isRTL, 'مزودو الخدمة', 'Providers')}
        value={stats.providers}
      />
      <AdminKpiCard
        icon={Users}
        tone="info"
        label={pickBi(isRTL, 'عملاء', 'Customers')}
        value={stats.customers}
      />
      <AdminKpiCard
        icon={Inbox}
        tone="warning"
        label={pickBi(isRTL, 'غير مكتمل', 'Incomplete')}
        value={stats.incomplete}
      />
      <AdminKpiCard
        icon={TrendingUp}
        tone="warning"
        label={pickBi(isRTL, 'تسجيلات 7 أيام', 'New (7d)')}
        value={stats.recent7d}
      />
    </div>
  );
});

/**
 * Phase 6A helper — derive the canonical `AdminUserStats` shape from
 * raw profile/role rows the page already holds in memory. Lives next
 * to the strip so any consumer can build the same view in one call,
 * with no Supabase round-trip.
 */
export function buildAdminUserStats(args: {
  profiles: ReadonlyArray<{
    is_banned?: boolean | null;
    is_onboarded?: boolean | null;
    account_type?: string | null;
    created_at?: string | null;
  }>;
  roles: ReadonlyArray<{ role: string }>;
}): AdminUserStats {
  const { profiles, roles } = args;
  const total = profiles.length;
  const suspended = profiles.filter((p) => p.is_banned).length;
  const active = total - suspended;
  const admins = roles.filter(
    (r) => r.role === 'super_admin' || r.role === 'admin' || r.role === 'moderator',
  ).length;
  const providers = profiles.filter(
    (p) => p.account_type === 'business' || p.account_type === 'company',
  ).length;
  const customers = profiles.filter((p) => p.account_type === 'individual').length;
  const incomplete = profiles.filter((p) => !p.is_onboarded).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const recent7d = profiles.filter((p) => {
    if (!p.created_at) return false;
    const t = new Date(p.created_at).getTime();
    return Number.isFinite(t) && t > weekAgo;
  }).length;
  return { total, active, suspended, admins, providers, customers, incomplete, recent7d };
}