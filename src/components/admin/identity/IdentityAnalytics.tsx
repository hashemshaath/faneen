/**
 * IdentityAnalytics — Recharts dashboard for the Identity Hub.
 * - 30d account/business creation trend
 * - Role distribution donut
 * - Verification rate donut
 * - Top businesses by linked-user count (proxy for activity)
 */
import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;
interface BizRow {
  id: string; user_id: string; name_ar: string; name_en: string | null;
  is_verified: boolean; approval_status: string | null; membership_tier: string;
  created_at: string;
}

interface Props {
  profiles: Profile[];
  businesses: BizRow[];
  roles: UserRole[];
  isRTL: boolean;
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

export const IdentityAnalytics: React.FC<Props> = ({ profiles, businesses, roles, isRTL, isLoading }) => {
  const trend = useMemo(() => {
    const days = 30;
    const buckets = new Map<string, { day: string; users: number; businesses: number }>();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { day: key.slice(5), users: 0, businesses: 0 });
    }
    profiles.forEach(p => {
      const k = new Date(p.created_at).toISOString().slice(0, 10);
      const b = buckets.get(k); if (b) b.users += 1;
    });
    businesses.forEach(b => {
      const k = new Date(b.created_at).toISOString().slice(0, 10);
      const x = buckets.get(k); if (x) x.businesses += 1;
    });
    return Array.from(buckets.values());
  }, [profiles, businesses]);

  const roleDist = useMemo(() => {
    const counts = new Map<string, number>();
    roles.forEach(r => counts.set(r.role, (counts.get(r.role) || 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [roles]);

  const verification = useMemo(() => {
    const verified = businesses.filter(b => b.is_verified).length;
    const pending = businesses.filter(b => !b.is_verified && b.approval_status === 'pending').length;
    const other = businesses.length - verified - pending;
    return [
      { name: isRTL ? 'موثّق' : 'Verified', value: verified },
      { name: isRTL ? 'قيد المراجعة' : 'Pending', value: pending },
      { name: isRTL ? 'بدون توثيق' : 'Unverified', value: other },
    ];
  }, [businesses, isRTL]);

  const topBiz = useMemo(() => {
    const tierOrder: Record<string, number> = { enterprise: 4, premium: 3, basic: 2, free: 1 };
    return [...businesses]
      .sort((a, b) => (tierOrder[b.membership_tier] ?? 0) - (tierOrder[a.membership_tier] ?? 0))
      .slice(0, 8)
      .map(b => ({
        name: (isRTL ? b.name_ar : (b.name_en || b.name_ar) || '—').slice(0, 18),
        tier: tierOrder[b.membership_tier] ?? 1,
      }));
  }, [businesses, isRTL]);

  if (isLoading) {
    return <div className="grid lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Growth trend */}
        <div className="rounded-2xl border border-border/30 bg-card p-5">
          <h3 className="text-sm font-bold font-heading mb-3">{isRTL ? 'نمو الحسابات والمنشآت — 30 يوم' : 'Accounts & Businesses growth (30d)'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBiz" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--info))" fill="url(#gradUsers)" name={isRTL ? 'مستخدمون' : 'Users'} />
                <Area type="monotone" dataKey="businesses" stroke="hsl(var(--success))" fill="url(#gradBiz)" name={isRTL ? 'منشآت' : 'Businesses'} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification */}
        <div className="rounded-2xl border border-border/30 bg-card p-5">
          <h3 className="text-sm font-bold font-heading mb-3">{isRTL ? 'حالة توثيق المنشآت' : 'Business verification'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={verification} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {verification.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role distribution */}
        <div className="rounded-2xl border border-border/30 bg-card p-5">
          <h3 className="text-sm font-bold font-heading mb-3">{isRTL ? 'توزيع الأدوار' : 'Role distribution'}</h3>
          <div className="h-64">
            {roleDist.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-20">{isRTL ? 'لا توجد أدوار مُسجّلة' : 'No roles recorded'}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {roleDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top businesses by tier */}
        <div className="rounded-2xl border border-border/30 bg-card p-5">
          <h3 className="text-sm font-bold font-heading mb-3">{isRTL ? 'أبرز المنشآت حسب الفئة' : 'Top businesses by tier'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBiz} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} domain={[0, 4]} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="tier" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};