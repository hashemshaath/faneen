import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Shield, KeyRound, Activity, Lock, LayoutDashboard, ArrowRight,
  UserCheck, UserX, ShieldAlert, Crown, Mail, TrendingUp, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import IdentityActivityFeed from '@/components/admin/identity/IdentityActivityFeed';

/**
 * ADMIN UX RECONSOLIDATION PHASE 4 — Identity & Access Center overview.
 *
 * Presentational landing for `/admin/identity`. Static tiles that route
 * into the center's own tabs and into the legacy identity dashboard.
 * NO queries, NO mutations, NO service or supabase imports.
 */

type TileTone = 'primary' | 'users' | 'roles' | 'invite' | 'activity' | 'security';

// ----- Live KPI hook (Identity Executive Dashboard) -----
interface IdentityKpis {
  totalUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  newUsers7d: number;
  pendingAccessRequests: number;
  pendingInvitations: number;
  adminActions24h: number;
  roleCounts: Record<string, number>;
}

async function fetchIdentityKpis(): Promise<IdentityKpis> {
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since24h = new Date(Date.now() - 86400_000).toISOString();

  const [
    totalRes, verifiedRes, bannedRes, new7dRes,
    pendingAccessRes, pendingInvRes, actionsRes, rolesRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
    supabase.from('entity_access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('business_staff_invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('admin_activity_log').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase.from('user_roles').select('role'),
  ]);

  const roleCounts: Record<string, number> = {};
  for (const row of (rolesRes.data ?? []) as Array<{ role: string }>) {
    roleCounts[row.role] = (roleCounts[row.role] ?? 0) + 1;
  }

  return {
    totalUsers: totalRes.count ?? 0,
    verifiedUsers: verifiedRes.count ?? 0,
    bannedUsers: bannedRes.count ?? 0,
    newUsers7d: new7dRes.count ?? 0,
    pendingAccessRequests: pendingAccessRes.count ?? 0,
    pendingInvitations: pendingInvRes.count ?? 0,
    adminActions24h: actionsRes.count ?? 0,
    roleCounts,
  };
}

type Tile = {
  key: string;
  to: string;
  icon: typeof Users;
  tone: TileTone;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  badge?: { ar: string; en: string };
};

const TILES: ReadonlyArray<Tile> = [
  {
    key: 'dashboard',
    to: '/admin/identity/dashboard',
    icon: LayoutDashboard,
    tone: 'primary',
    title: { ar: 'لوحة الحسابات الكاملة', en: 'Full accounts dashboard' },
    description: {
      ar: 'مؤشرات تفصيلية للمستخدمين والمنشآت، البحث الموحّد، والنشاط الإداري.',
      en: 'Detailed KPIs for users and businesses, unified search, and admin activity.',
    },
    badge: { ar: 'النسخة الموسّعة', en: 'Extended view' },
  },
  {
    key: 'users',
    to: '/admin/identity?tab=users',
    icon: Users,
    tone: 'users',
    title: { ar: 'المستخدمون', en: 'Users' },
    description: {
      ar: 'إدارة الحسابات، الأدوار، الحظر، وكلمات المرور — السلوك دون تغيير.',
      en: 'Accounts, roles, ban, and passwords — behavior unchanged.',
    },
  },
  {
    key: 'roles',
    to: '/admin/identity?tab=roles',
    icon: Shield,
    tone: 'roles',
    title: { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' },
    description: {
      ar: 'إدارة الوصول، الأدوار، وقواعد RLS. النموذج التنفيذي دون تغيير.',
      en: 'Access management, roles, and RLS catalog. Permission model unchanged.',
    },
  },
  {
    key: 'invitations',
    to: '/admin/identity?tab=invitations',
    icon: KeyRound,
    tone: 'invite',
    title: { ar: 'الدعوات وطلبات الانضمام', en: 'Invitations & Access Requests' },
    description: {
      ar: 'طلبات انضمام المستخدمين للمنشآت. تدفّق القبول دون تغيير.',
      en: 'Users requesting access to businesses. Acceptance flow unchanged.',
    },
  },
  {
    key: 'activity',
    to: '/admin/identity?tab=activity',
    icon: Activity,
    tone: 'activity',
    title: { ar: 'النشاط الإداري', en: 'Admin activity' },
    description: {
      ar: 'سجل النشاط للقراءة فقط. كاتب التدقيق دون تغيير.',
      en: 'Read-only admin activity log. Audit writer unchanged.',
    },
  },
  {
    key: 'security',
    to: '/admin/identity?tab=security',
    icon: Lock,
    tone: 'security',
    title: { ar: 'الأمان والوصول للنظام', en: 'Security & System Access' },
    description: {
      ar: 'لوحة وصول النظام للقراءة. الجلسات والمصادقة دون تغيير.',
      en: 'System-access review surface. Sessions and auth unchanged.',
    },
  },
];

const TONE_CLASSES: Record<TileTone, string> = {
  primary:  'bg-primary/10 text-primary',
  users:    'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  roles:    'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  invite:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  activity: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  security: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const ROLE_META: Record<string, { ar: string; en: string; cls: string }> = {
  super_admin:  { ar: 'مشرف عام',   en: 'Super Admin',  cls: 'bg-rose-500'    },
  admin:        { ar: 'مشرف',       en: 'Admin',        cls: 'bg-violet-500'  },
  moderator:    { ar: 'مراقب',      en: 'Moderator',    cls: 'bg-amber-500'   },
  business:     { ar: 'منشأة',      en: 'Business',     cls: 'bg-sky-500'     },
  user:         { ar: 'مستخدم',     en: 'User',         cls: 'bg-emerald-500' },
};

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Users;
  tone: string;
  loading?: boolean;
}
const KpiCard = ({ label, value, hint, icon: Icon, tone, loading }: KpiCardProps) => (
  <Card className="relative overflow-hidden hover-lift">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-0.5 tabular-nums tech-content">{value}</p>
          )}
          {hint ? <p className="text-[10px] text-muted-foreground mt-1">{hint}</p> : null}
        </div>
        <div className={`flex size-9 items-center justify-center rounded-xl ${tone} shrink-0`}>
          <Icon className="size-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const IdentityOverviewLanding = () => {
  const { isRTL } = useLanguage();
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['identity-overview-kpis'],
    queryFn: fetchIdentityKpis,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalRoles = Object.values(kpis?.roleCounts ?? {}).reduce((a, b) => a + b, 0) || 1;
  const verificationPct = kpis && kpis.totalUsers > 0
    ? Math.round((kpis.verifiedUsers / kpis.totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Live KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={isRTL ? 'إجمالي المستخدمين' : 'Total users'}
          value={kpis?.totalUsers ?? 0}
          hint={isRTL ? `+${kpis?.newUsers7d ?? 0} خلال 7 أيام` : `+${kpis?.newUsers7d ?? 0} in last 7 days`}
          icon={Users}
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          loading={isLoading}
        />
        <KpiCard
          label={isRTL ? 'موثّقون' : 'Verified'}
          value={`${verificationPct}%`}
          hint={isRTL ? `${kpis?.verifiedUsers ?? 0} مستخدم` : `${kpis?.verifiedUsers ?? 0} users`}
          icon={UserCheck}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          loading={isLoading}
        />
        <KpiCard
          label={isRTL ? 'طلبات معلّقة' : 'Pending requests'}
          value={(kpis?.pendingAccessRequests ?? 0) + (kpis?.pendingInvitations ?? 0)}
          hint={isRTL ? 'طلبات وصول + دعوات' : 'Access + invites'}
          icon={KeyRound}
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          loading={isLoading}
        />
        <KpiCard
          label={isRTL ? 'إجراءات إدارية (24س)' : 'Admin actions (24h)'}
          value={kpis?.adminActions24h ?? 0}
          hint={isRTL ? 'سجل التدقيق' : 'Audit log'}
          icon={TrendingUp}
          tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          loading={isLoading}
        />
      </div>

      {/* Health row: verification progress + banned alert */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              {isRTL ? 'توزيع الأدوار' : 'Role distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : Object.keys(kpis?.roleCounts ?? {}).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'لا توجد أدوار مخصّصة بعد.' : 'No roles assigned yet.'}
              </p>
            ) : (
              Object.entries(kpis!.roleCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([role, count]) => {
                  const meta = ROLE_META[role] ?? { ar: role, en: role, cls: 'bg-muted-foreground' };
                  const pct = Math.round((count / totalRoles) * 100);
                  return (
                    <div key={role} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium">
                          <span className={`size-2 rounded-full ${meta.cls}`} />
                          {isRTL ? meta.ar : meta.en}
                        </span>
                        <span className="text-muted-foreground tabular-nums tech-content">
                          {count} · {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-500" />
              {isRTL ? 'تنبيهات الأمان' : 'Security alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <UserX className="size-4 text-rose-500" />
                <span className="text-xs">{isRTL ? 'حسابات محظورة' : 'Banned accounts'}</span>
              </div>
              <Badge variant={kpis && kpis.bannedUsers > 0 ? 'destructive' : 'secondary'} className="tabular-nums tech-content">
                {kpis?.bannedUsers ?? 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-amber-500" />
                <span className="text-xs">{isRTL ? 'دعوات معلّقة' : 'Pending invites'}</span>
              </div>
              <Badge variant="secondary" className="tabular-nums tech-content">{kpis?.pendingInvitations ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-sky-500" />
                <span className="text-xs">{isRTL ? 'طلبات وصول' : 'Access requests'}</span>
              </div>
              <Badge variant="secondary" className="tabular-nums tech-content">{kpis?.pendingAccessRequests ?? 0}</Badge>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full mt-1">
              <Link to="/admin/identity?tab=invitations">
                {isRTL ? 'مراجعة الطلبات' : 'Review requests'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live activity */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            {isRTL ? 'النشاط الإداري المباشر' : 'Live admin activity'}
          </CardTitle>
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link to="/admin/identity?tab=activity">
              {isRTL ? 'عرض الكل' : 'View all'}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <IdentityActivityFeed isRTL={isRTL} limit={6} />
        </CardContent>
      </Card>

      {/* Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.key}
              to={tile.to}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${TONE_CLASSES[tile.tone]}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                      <ArrowRight
                        className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                      />
                    </CardTitle>
                    {tile.badge ? (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {isRTL ? tile.badge.ar : tile.badge.en}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {isRTL ? tile.description.ar : tile.description.en}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default IdentityOverviewLanding;