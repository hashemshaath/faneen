import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Wrench, Image, Star, FileText, Shield, TrendingUp, Eye, Mail,
  DollarSign, Plus, Send, BarChart3, ArrowUpRight, Activity,
  MessageSquare, Crown, Users, Building2, Newspaper, CreditCard,
  Bookmark, FolderOpen, Bell, Clock, CheckCircle2, AlertCircle,
  ShieldAlert, Zap, CalendarDays, Target, Megaphone, Loader2,
  AlertTriangle, RefreshCw, Sparkles, Timer, Percent,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { tierIcons } from '@/lib/membership-tiers';

// ═══ Shared utils ═══
const CHART_COLORS = [
  'hsl(var(--accent))', 'hsl(270 50% 60%)', 'hsl(150 50% 50%)',
  'hsl(200 70% 55%)', 'hsl(0 60% 55%)', 'hsl(40 80% 55%)',
];

const ChartTooltipStyle = {
  borderRadius: 12, fontSize: 11,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

function getStatusLabel(status: string, isRTL: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' }, pending_approval: { ar: 'بانتظار الموافقة', en: 'Pending' },
    active: { ar: 'نشط', en: 'Active' }, completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' }, disputed: { ar: 'متنازع', en: 'Disputed' },
  };
  return map[status]?.[isRTL ? 'ar' : 'en'] ?? status;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'border-muted-foreground/30 text-muted-foreground', pending_approval: 'border-amber-500/30 text-amber-600',
    active: 'border-emerald-500/30 text-emerald-600', completed: 'border-primary/30 text-primary',
    cancelled: 'border-destructive/30 text-destructive', disputed: 'border-amber-600/30 text-amber-600',
  };
  return map[status] ?? '';
}

function getMonths(isRTL: boolean) {
  return isRTL
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

function buildMonthlyData(items: { created_at: string }[], isRTL: boolean, monthCount = 6) {
  const months = getMonths(isRTL);
  const now = new Date();
  const map = new Map<string, number>();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    map.set(months[d.getMonth()], 0);
  }
  items.forEach(item => {
    const key = months[new Date(item.created_at).getMonth()];
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([month, count]) => ({ month, count }));
}

// ═══ Memoized stat card ═══
const StatCard = React.memo(({ icon: Icon, label, value, sub, color, to }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; to?: string;
}) => {
  const content = (
    <Card className="border-border/30 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/25 transition-all duration-300 group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          {to && <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
        <p className="text-xl sm:text-2xl font-bold leading-none tracking-tight"><span className="tech-content">{value}</span></p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">{label}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
});
StatCard.displayName = 'StatCard';

// ═══ Quick action button ═══
const QuickAction = React.memo(({ icon: Icon, label, to }: { icon: React.ElementType; label: string; to: string }) => (
  <Link to={to}>
    <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5 hover:shadow-sm transition-all duration-300">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Button>
  </Link>
));
QuickAction.displayName = 'QuickAction';

// ═══ Today's summary widget ═══
const TodaySummary = React.memo(({ isRTL, userId }: { isRTL: boolean; userId: string }) => {
  const { data } = useQuery({
    queryKey: ['today-summary', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [notifs, messages] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', `${today}T00:00:00Z`),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId).gte('created_at', `${today}T00:00:00Z`),
      ]);
      return {
        todayNotifs: ((notifs as { count?: number }).count) ?? 0,
        todayMessages: ((messages as { count?: number }).count) ?? 0,
      };
    },
    staleTime: 60000,
  });

  const items = [
    { icon: Bell, label: isRTL ? 'إشعارات اليوم' : "Today's Alerts", value: data?.todayNotifs ?? 0 },
    { icon: Send, label: isRTL ? 'رسائل مرسلة' : 'Sent Messages', value: data?.todayMessages ?? 0 },
  ];

  return (
    <Card className="border-border/40">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-3.5 h-3.5 text-accent" />
          <h3 className="font-heading font-bold text-xs">{isRTL ? 'ملخص اليوم' : "Today's Summary"}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
              <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-bold leading-none">{item.value}</p>
                <p className="text-[8px] text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
TodaySummary.displayName = 'TodaySummary';

// ═══ Overdue alerts widget ═══
const OverdueAlerts = React.memo(({ isRTL, userId }: { isRTL: boolean; userId: string }) => {
  const { data } = useQuery({
    queryKey: ['overdue-alerts', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: overduePayments } = await supabase
        .from('installment_payments')
        .select('id, plan_id')
        .eq('status', 'pending')
        .lt('due_date', today)
        .limit(10);

      const { data: expiringContracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .lt('end_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
        .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
        .limit(10);

      return {
        overduePayments: overduePayments?.length ?? 0,
        expiringContracts: expiringContracts?.length ?? 0,
      };
    },
    staleTime: 120000,
  });

  const total = (data?.overduePayments ?? 0) + (data?.expiringContracts ?? 0);
  if (total === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <h3 className="font-heading font-bold text-xs text-amber-700 dark:text-amber-400">{isRTL ? 'تنبيهات' : 'Alerts'}</h3>
        </div>
        <div className="space-y-1.5">
          {(data?.overduePayments ?? 0) > 0 && (
            <Link to="/dashboard/installments" className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 transition-colors">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {data!.overduePayments} {isRTL ? 'أقساط متأخرة' : 'overdue payments'}
              </span>
            </Link>
          )}
          {(data?.expiringContracts ?? 0) > 0 && (
            <Link to="/dashboard/contracts" className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 transition-colors">
              <Timer className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {data!.expiringContracts} {isRTL ? 'عقود قاربت الانتهاء' : 'contracts expiring soon'}
              </span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
OverdueAlerts.displayName = 'OverdueAlerts';

// ═══ Membership status widget ═══
const MembershipWidget = React.memo(({ isRTL, userId }: { isRTL: boolean; userId: string }) => {
  const { data: sub } = useQuery({
    queryKey: ['membership-widget', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('membership_subscriptions')
        .select('*, plan:membership_plans(name_ar, name_en, tier)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 300000,
  });

  const daysRemaining = sub?.expires_at
    ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const plan = sub?.plan as Record<string, unknown> | null;
  const tier = plan?.tier || 'free';
  const Icon = tierIcons[tier] || Zap;

  return (
    <Card className="border-border/40">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-3.5 h-3.5 text-accent" />
          <h3 className="font-heading font-bold text-xs">{isRTL ? 'العضوية' : 'Membership'}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">{plan ? (isRTL ? plan.name_ar : plan.name_en) : (isRTL ? 'مجاني' : 'Free')}</p>
            {daysRemaining !== null && (
              <>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                  <span>{isRTL ? `${daysRemaining} يوم متبقي` : `${daysRemaining} days left`}</span>
                  <span>{Math.round((daysRemaining / (sub?.billing_cycle === 'yearly' ? 365 : 30)) * 100)}%</span>
                </div>
                <Progress value={Math.max(5, (daysRemaining / (sub?.billing_cycle === 'yearly' ? 365 : 30)) * 100)} className="h-1 mt-0.5" />
              </>
            )}
          </div>
        </div>
        <Link to="/membership">
          <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] h-7 text-accent gap-1">
            <Sparkles className="w-3 h-3" />{isRTL ? 'إدارة العضوية' : 'Manage Plan'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});
MembershipWidget.displayName = 'MembershipWidget';

/* ═══════════════════════════════════════════════════
   ADMIN Dashboard
   ═══════════════════════════════════════════════════ */
const AdminDashboardView = React.memo(({ isRTL }: { isRTL: boolean }) => {
  const { user } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const [users, businesses, contracts, categories, messages, subscriptions, roles, recentUsers, recentActivity, blogPosts, contactMessages, userGrowth] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
        supabase.from('contracts').select('id, status, total_amount, created_at', { count: 'exact' }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('membership_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_roles').select('role'),
        supabase.from('profiles').select('id, full_name, avatar_url, email, account_type, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('admin_activity_log').select('id, action, entity_type, created_at, details').order('created_at', { ascending: false }).limit(6),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
      ]);

      const allContracts = contracts.data || [];
      const totalRevenue = allContracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      const activeContracts = allContracts.filter(c => c.status === 'active').length;

      const statusCounts: Record<string, number> = {};
      allContracts.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
      const roleCounts: Record<string, number> = {};
      (roles.data || []).forEach((r) => { roleCounts[r.role] = (roleCounts[r.role] || 0) + 1; });

      return {
        users: ((users as { count?: number }).count) ?? 0, businesses: ((businesses as { count?: number }).count) ?? 0,
        contracts: allContracts.length, activeContracts, totalRevenue,
        categories: ((categories as { count?: number }).count) ?? 0, messages: ((messages as { count?: number }).count) ?? 0,
        subscriptions: ((subscriptions as { count?: number }).count) ?? 0, blogPosts: ((blogPosts as { count?: number }).count) ?? 0,
        newContactMessages: ((contactMessages as { count?: number }).count) ?? 0,
        roleCounts, statusCounts,
        monthlyContracts: buildMonthlyData(allContracts, isRTL),
        monthlyUsers: buildMonthlyData(userGrowth.data || [], isRTL),
        recentUsers: recentUsers.data || [], recentActivity: recentActivity.data || [],
      };
    },
    staleTime: 30000,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedUsers = useCountUp(stats?.users ?? 0, isVisible, 1200);
  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, isVisible, 1500);
  const animatedContracts = useCountUp(stats?.contracts ?? 0, isVisible, 1000);

  const contractStatusData = useMemo(() =>
    stats?.statusCounts
      ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
          name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
        }))
      : [],
    [stats?.statusCounts, isRTL]
  );

  const adminCards = useMemo(() => [
    { icon: Users, label: isRTL ? 'المستخدمين' : 'Users', value: animatedUsers, color: 'bg-primary/10 text-primary', to: '/admin/users' },
    { icon: Building2, label: isRTL ? 'المنشآت' : 'Businesses', value: stats?.businesses ?? 0, color: 'bg-emerald-500/10 text-emerald-600', to: '/admin/businesses' },
    { icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Revenue', value: `${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`, color: 'bg-emerald-500/10 text-emerald-600', to: '/dashboard/contracts' },
    { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: stats?.activeContracts ?? 0, sub: `${isRTL ? 'من' : 'of'} ${animatedContracts}`, color: 'bg-accent/10 text-accent', to: '/dashboard/contracts' },
    { icon: Crown, label: isRTL ? 'اشتراكات نشطة' : 'Active Subs', value: stats?.subscriptions ?? 0, color: 'bg-accent/10 text-accent', to: '/admin/memberships' },
    { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: stats?.messages ?? 0, color: 'bg-primary/10 text-primary', to: '/dashboard/messages' },
    { icon: Mail, label: isRTL ? 'رسائل جديدة' : 'New Messages', value: stats?.newContactMessages ?? 0, color: 'bg-blue-500/10 text-blue-600', to: '/admin/contact-messages' },
  ], [isRTL, animatedUsers, animatedRevenue, animatedContracts, stats]);

  return (
    <div className="space-y-5" ref={ref}>
      {/* Welcome */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 dark:from-card/80 dark:to-accent/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg sm:text-xl">{isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}</h1>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{isRTL ? 'نظرة شاملة على النظام' : 'System overview'}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
            <Zap className="w-3 h-3" />{isRTL ? 'مباشر' : 'Live'}
          </Badge>
        </div>
      </div>

      {/* Alerts + Today */}
      {user && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <OverdueAlerts isRTL={isRTL} userId={user.id} />
          <TodaySummary isRTL={isRTL} userId={user.id} />
          <MembershipWidget isRTL={isRTL} userId={user.id} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {adminCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-accent" />{isRTL ? 'العقود الشهرية' : 'Monthly Contracts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyContracts || []}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                  <Tooltip contentStyle={ChartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[5, 5, 0, 0]} name={isRTL ? 'عقود' : 'Contracts'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <PieChartIcon className="w-3.5 h-3.5 text-accent" />{isRTL ? 'توزيع حالة العقود' : 'Contract Status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {contractStatusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[120px] h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={contractStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={0}>
                      {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {contractStatusData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-muted-foreground flex-1">{entry.name}</span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">{isRTL ? 'لا توجد بيانات' : 'No data'}</div>
            )}
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />{isRTL ? 'نمو المستخدمين' : 'User Growth'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyUsers || []}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                  <Tooltip contentStyle={ChartTooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#userGrowthGrad)" strokeWidth={2} name={isRTL ? 'مستخدمين' : 'Users'} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-accent" />{isRTL ? 'آخر النشاطات' : 'Recent Activity'}
            </CardTitle>
            <Link to="/admin/activity-log"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {(stats?.recentActivity || []).map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Activity className="w-3 h-3 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium truncate">{item.action} — {item.entity_type}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity?.length) && <p className="text-[10px] text-muted-foreground text-center py-4">{isRTL ? 'لا نشاطات' : 'No activity'}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-primary" />{isRTL ? 'أحدث المستخدمين' : 'Recent Users'}
            </CardTitle>
            <Link to="/admin/users"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {(stats?.recentUsers || []).map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent/10 text-accent text-[9px] font-bold">{(u.full_name || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium truncate">{u.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 shrink-0">
                    {['business', 'company', 'provider'].includes(u.account_type) ? (isRTL ? 'مزود' : 'Provider') : (isRTL ? 'مستخدم' : 'User')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/40">
        <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle></CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {[
              { icon: Users, label: isRTL ? 'المستخدمين' : 'Users', to: '/admin/users' },
              { icon: Building2, label: isRTL ? 'المنشآت' : 'Businesses', to: '/admin/businesses' },
              { icon: Crown, label: isRTL ? 'العضويات' : 'Memberships', to: '/admin/memberships' },
              { icon: Newspaper, label: isRTL ? 'المدونة' : 'Blog', to: '/dashboard/blog' },
              { icon: Activity, label: isRTL ? 'السجل' : 'Activity', to: '/admin/activity-log' },
              { icon: ShieldAlert, label: isRTL ? 'النظام' : 'System', to: '/admin/system-settings' },
              { icon: BarChart3, label: isRTL ? 'التصنيفات' : 'Categories', to: '/admin/categories' },
              { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Messages', to: '/dashboard/messages' },
              { icon: Mail, label: isRTL ? 'رسائل التواصل' : 'Contact', to: '/admin/contact-messages' },
            ].map(a => <QuickAction key={a.to} {...a} />)}
          </div>
        </CardContent>
      </Card>

      {/* System Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Activity, label: isRTL ? 'تصنيفات' : 'Categories', value: stats?.categories ?? 0 },
          { icon: Newspaper, label: isRTL ? 'مقالات' : 'Posts', value: stats?.blogPosts ?? 0 },
          { icon: ShieldAlert, label: isRTL ? 'مشرفين' : 'Admins', value: (stats?.roleCounts?.admin ?? 0) + (stats?.roleCounts?.super_admin ?? 0) },
          { icon: FileText, label: isRTL ? 'إجمالي العقود' : 'Contracts', value: stats?.contracts ?? 0 },
        ].map(card => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-2.5 flex flex-col items-center text-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <card.icon className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="tech-content text-base font-bold">{card.value}</span>
              <span className="text-[9px] text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});
AdminDashboardView.displayName = 'AdminDashboardView';

/* ═══════════════════════════════════════════════════
   PROVIDER Dashboard
   ═══════════════════════════════════════════════════ */
const ProviderDashboardView = React.memo(({ isRTL, user, profile }: { isRTL: boolean; user: { id: string }; profile: Record<string, unknown> | null }) => {
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const businessId = business?.id;

  const { data: stats } = useQuery({
    queryKey: ['provider-overview-stats', user?.id, businessId],
    queryFn: async () => {
      const [services, portfolio, reviews, allContracts, projects, operations, messages, promotions] = await Promise.all([
        businessId ? supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('reviews').select('id, rating', { count: 'exact' }).eq('business_id', businessId) : { count: 0, data: [] },
        supabase.from('contracts').select('id, total_amount, status, created_at', { count: 'exact' }).or(`provider_id.eq.${user.id},client_id.eq.${user.id}`),
        businessId ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        supabase.from('operations_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
        businessId ? supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('is_active', true) : { count: 0 },
      ]);

      const contractsData = allContracts.data || [];
      const activeContracts = contractsData.filter(c => c.status === 'active' || c.status === 'pending_approval');
      const completedContracts = contractsData.filter(c => c.status === 'completed');
      const totalRevenue = completedContracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const reviewsData = ((reviews as { data?: unknown[] }).data) || [];
      const avgRating = reviewsData.length > 0 ? (reviewsData.reduce((s: number, r) => s + r.rating, 0) / reviewsData.length).toFixed(1) : '0.0';
      const ratingDist = [0, 0, 0, 0, 0];
      reviewsData.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++; });

      const statusCounts: Record<string, number> = {};
      contractsData.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      const months = getMonths(isRTL);
      const now = new Date();
      const revenueMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); revenueMap.set(months[d.getMonth()], 0); }
      completedContracts.forEach(c => {
        const key = months[new Date(c.created_at).getMonth()];
        if (revenueMap.has(key)) revenueMap.set(key, (revenueMap.get(key) || 0) + Number(c.total_amount || 0));
      });

      return {
        services: ((services as { count?: number }).count) ?? 0, portfolio: ((portfolio as { count?: number }).count) ?? 0,
        reviews: reviewsData.length, avgRating, ratingDist,
        contracts: contractsData.length, activeContracts: activeContracts.length,
        completedContracts: completedContracts.length, totalRevenue,
        projects: ((projects as { count?: number }).count) ?? 0, operations: ((operations as { count?: number }).count) ?? 0,
        messages: ((messages as { count?: number }).count) ?? 0, promotions: ((promotions as { count?: number }).count) ?? 0,
        statusCounts,
        monthlyRevenue: Array.from(revenueMap.entries()).map(([month, revenue]) => ({ month, revenue })),
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: recentContracts } = useQuery({
    queryKey: ['provider-recent-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at')
        .eq('provider_id', user.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: recentReviews } = useQuery({
    queryKey: ['provider-recent-reviews-overview', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase.from('reviews').select('id, rating, content, created_at')
        .eq('business_id', businessId).order('created_at', { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!businessId,
    staleTime: 60000,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, isVisible, 1500);
  const animatedContracts = useCountUp(stats?.contracts ?? 0, isVisible, 1200);
  const completionRate = stats?.contracts ? Math.round((stats.completedContracts / stats.contracts) * 100) : 0;

  const contractStatusData = useMemo(() =>
    stats?.statusCounts ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
      name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
    })) : [],
    [stats?.statusCounts, isRTL]
  );

  return (
    <div className="space-y-5" ref={ref}>
      {/* Welcome */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 dark:from-card/80 dark:to-accent/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 overflow-hidden">
              {business?.logo_url ? <img src={business.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-accent" />}
            </div>
            <div>
              <h1 className="font-heading font-bold text-base sm:text-lg flex items-center gap-2">
                {isRTL ? 'لوحة مزود الخدمة' : 'Provider Dashboard'}
                {business?.is_verified && <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-0"><CheckCircle2 className="w-2.5 h-2.5 me-0.5" />{isRTL ? 'موثق' : 'Verified'}</Badge>}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}
                {business && <> — {isRTL ? business.name_ar : (business.name_en || business.name_ar)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {profile?.ref_id && <Badge variant="outline" className="text-[9px] h-5">{profile.ref_id}</Badge>}
            {business?.membership_tier && <Badge className="bg-accent/10 text-accent border-accent/30 text-[9px] h-5">{business.membership_tier}</Badge>}
          </div>
        </div>
      </div>

      {/* Widgets row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OverdueAlerts isRTL={isRTL} userId={user.id} />
        <TodaySummary isRTL={isRTL} userId={user.id} />
        <MembershipWidget isRTL={isRTL} userId={user.id} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={DollarSign} label={isRTL ? 'إجمالي الإيرادات' : 'Revenue'} value={`${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`} color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={FileText} label={isRTL ? 'العقود النشطة' : 'Active'} value={stats?.activeContracts ?? 0} sub={`${isRTL ? 'من' : 'of'} ${animatedContracts}`} color="bg-accent/10 text-accent" />
        <StatCard icon={Star} label={isRTL ? 'التقييم' : 'Rating'} value={stats?.avgRating ?? '0.0'} sub={`${stats?.reviews ?? 0} ${isRTL ? 'تقييم' : 'reviews'}`} color="bg-accent/10 text-accent" />
        <StatCard icon={Target} label={isRTL ? 'معدل الإنجاز' : 'Completion'} value={`${completionRate}%`} sub={`${stats?.completedContracts ?? 0} ${isRTL ? 'مكتمل' : 'done'}`} color="bg-primary/10 text-primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border/40 lg:col-span-2">
          <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" />{isRTL ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyRevenue || []}>
                  <defs><linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={ChartTooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" fill="url(#revenueGrad)" strokeWidth={2} name={isRTL ? 'إيرادات' : 'Revenue'} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><Star className="w-3.5 h-3.5 text-accent" />{isRTL ? 'التقييمات' : 'Ratings'}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats?.ratingDist?.[star - 1] ?? 0;
              const pct = (stats?.reviews ?? 0) > 0 ? (count / stats!.reviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 text-muted-foreground">{star}</span>
                  <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                  <Progress value={pct} className="flex-1 h-1.5" />
                  <span className="w-4 text-end text-muted-foreground text-[9px]">{count}</span>
                </div>
              );
            })}
            <div className="text-center pt-1">
              <span className="tech-content text-2xl font-bold text-accent">{stats?.avgRating ?? '0.0'}</span>
              <p className="text-[9px] text-muted-foreground">{stats?.reviews ?? 0} {isRTL ? 'تقييم' : 'reviews'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts + Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-accent" />{isRTL ? 'أحدث العقود' : 'Recent Contracts'}</CardTitle>
            <Link to="/dashboard/contracts"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {recentContracts && recentContracts.length > 0 ? (
              <div className="space-y-1.5">
                {recentContracts.map((c) => (
                  <Link key={c.id} to={`/contracts/${c.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium truncate">{isRTL ? c.title_ar : (c.title_en || c.title_ar)}</p>
                        <p className="tech-content text-[9px] text-muted-foreground">{c.contract_number}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn('text-[8px] h-4', getStatusColor(c.status))}>{getStatusLabel(c.status, isRTL)}</Badge>
                        <span className="tech-content text-[10px] font-semibold whitespace-nowrap">{Number(c.total_amount).toLocaleString()} {c.currency_code}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <FileText className="w-8 h-8 mb-2 opacity-20" /><p className="text-[10px]">{isRTL ? 'لا عقود بعد' : 'No contracts'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2"><Star className="w-3.5 h-3.5 text-accent" />{isRTL ? 'أحدث التقييمات' : 'Recent Reviews'}</CardTitle>
            <Link to="/dashboard/reviews"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {recentReviews && recentReviews.length > 0 ? (
              <div className="space-y-1.5">
                {recentReviews.map(review => (
                  <div key={review.id} className="p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-1 mb-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn('w-2.5 h-2.5', i < review.rating ? 'text-accent fill-accent' : 'text-muted-foreground/20')} />
                      ))}
                      <span className="text-[9px] text-muted-foreground ms-auto">{new Date(review.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {review.content && <p className="text-[10px] text-muted-foreground line-clamp-2">{review.content}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Star className="w-8 h-8 mb-2 opacity-20" /><p className="text-[10px]">{isRTL ? 'لا تقييمات' : 'No reviews'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Bottom Stats */}
      <Card className="border-border/40">
        <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle></CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { icon: Plus, label: isRTL ? 'خدمة' : 'Service', to: '/dashboard/services' },
              { icon: Image, label: isRTL ? 'مشروع' : 'Project', to: '/dashboard/projects' },
              { icon: Send, label: isRTL ? 'عرض' : 'Offer', to: '/dashboard/promotions' },
              { icon: MessageSquare, label: isRTL ? 'رسائل' : 'Messages', to: '/dashboard/messages' },
              { icon: FileText, label: isRTL ? 'عقود' : 'Contracts', to: '/dashboard/contracts' },
              { icon: Crown, label: isRTL ? 'عضوية' : 'Membership', to: '/membership' },
            ].map(a => <QuickAction key={a.to} {...a} />)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon: Wrench, label: isRTL ? 'خدمات' : 'Services', value: stats?.services ?? 0 },
          { icon: Image, label: isRTL ? 'معرض' : 'Portfolio', value: stats?.portfolio ?? 0 },
          { icon: FolderOpen, label: isRTL ? 'مشاريع' : 'Projects', value: stats?.projects ?? 0 },
          { icon: Megaphone, label: isRTL ? 'عروض' : 'Promos', value: stats?.promotions ?? 0 },
          { icon: MessageSquare, label: isRTL ? 'محادثات' : 'Chats', value: stats?.messages ?? 0 },
          { icon: Activity, label: isRTL ? 'عمليات' : 'Operations', value: stats?.operations ?? 0 },
        ].map(card => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-2 flex flex-col items-center text-center gap-0.5">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <card.icon className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="tech-content text-sm font-bold">{card.value}</span>
              <span className="text-[8px] text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});
ProviderDashboardView.displayName = 'ProviderDashboardView';

/* ═══════════════════════════════════════════════════
   USER Dashboard
   ═══════════════════════════════════════════════════ */
const UserDashboardView = React.memo(({ isRTL, user, profile }: { isRTL: boolean; user: { id: string }; profile: Record<string, unknown> | null }) => {
  const { data: stats } = useQuery({
    queryKey: ['user-overview-stats', user?.id],
    queryFn: async () => {
      const [contracts, messages, bookmarks, notifications] = await Promise.all([
        supabase.from('contracts').select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at', { count: 'exact' }).eq('client_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
        supabase.from('blog_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
      ]);

      const allContracts = contracts.data || [];
      const activeContracts = allContracts.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
      const completedContracts = allContracts.filter(c => c.status === 'completed');
      const totalSpent = completedContracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const statusCounts: Record<string, number> = {};
      allContracts.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      return {
        totalContracts: ((contracts as { count?: number }).count) ?? allContracts.length,
        activeContracts: activeContracts.length, completedContracts: completedContracts.length,
        totalSpent, messages: ((messages as { count?: number }).count) ?? 0,
        bookmarks: ((bookmarks as { count?: number }).count) ?? 0, unreadNotifications: ((notifications as { count?: number }).count) ?? 0,
        recentContracts: allContracts.slice(0, 5), statusCounts,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: recentNotifications } = useQuery({
    queryKey: ['user-recent-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('id, title_ar, title_en, body_ar, body_en, notification_type, is_read, created_at, action_url')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedSpent = useCountUp(stats?.totalSpent ?? 0, isVisible, 1500);

  const contractStatusData = useMemo(() =>
    stats?.statusCounts ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
      name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
    })) : [],
    [stats?.statusCounts, isRTL]
  );

  return (
    <div className="space-y-5" ref={ref}>
      {/* Welcome */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 dark:from-card/80 dark:to-accent/10">
        <div className="flex items-center justify-between">
          <div>
             <h1 className="font-heading font-bold text-lg sm:text-xl">{isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}</h1>
             <p className="text-xs text-muted-foreground/70 mt-0.5">{isRTL ? 'تتبع عقودك ورسائلك' : 'Track your contracts & messages'}</p>
          </div>
          {profile?.ref_id && <Badge variant="outline" className="tech-content text-[9px] h-5">{profile.ref_id}</Badge>}
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OverdueAlerts isRTL={isRTL} userId={user.id} />
        <TodaySummary isRTL={isRTL} userId={user.id} />
        <MembershipWidget isRTL={isRTL} userId={user.id} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FileText} label={isRTL ? 'العقود النشطة' : 'Active'} value={stats?.activeContracts ?? 0} sub={`${isRTL ? 'من' : 'of'} ${stats?.totalContracts ?? 0}`} color="bg-accent/10 text-accent" />
        <StatCard icon={DollarSign} label={isRTL ? 'إجمالي الإنفاق' : 'Spent'} value={`${animatedSpent.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`} color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={MessageSquare} label={isRTL ? 'المحادثات' : 'Conversations'} value={stats?.messages ?? 0} color="bg-primary/10 text-primary" />
        <StatCard icon={Bell} label={isRTL ? 'إشعارات جديدة' : 'Unread'} value={stats?.unreadNotifications ?? 0} color="bg-amber-500/10 text-amber-600" />
      </div>

      {/* Contracts + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-accent" />{isRTL ? 'أحدث العقود' : 'Recent Contracts'}</CardTitle>
            <Link to="/dashboard/contracts"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {stats?.recentContracts?.length ? (
              <div className="space-y-1.5">
                {stats.recentContracts.map((c) => (
                  <Link key={c.id} to={`/contracts/${c.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium truncate">{isRTL ? c.title_ar : (c.title_en || c.title_ar)}</p>
                        <p className="tech-content text-[9px] text-muted-foreground">{c.contract_number}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn('text-[8px] h-4', getStatusColor(c.status))}>{getStatusLabel(c.status, isRTL)}</Badge>
                        <span className="tech-content text-[10px] font-semibold whitespace-nowrap">{Number(c.total_amount).toLocaleString()} {c.currency_code}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <FileText className="w-8 h-8 mb-2 opacity-20" /><p className="text-[10px]">{isRTL ? 'لا عقود بعد' : 'No contracts'}</p>
                <Link to="/search"><Button variant="outline" size="sm" className="mt-2 text-[10px] gap-1"><TrendingUp className="w-3 h-3" />{isRTL ? 'ابحث عن مزود' : 'Find a provider'}</Button></Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2"><Bell className="w-3.5 h-3.5 text-amber-600" />{isRTL ? 'آخر الإشعارات' : 'Notifications'}</CardTitle>
            <Link to="/dashboard/notifications"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {recentNotifications?.length ? (
              <div className="space-y-1.5">
                {recentNotifications.map(n => (
                  <Link key={n.id} to={n.action_url || '/dashboard/notifications'}>
                    <div className={cn('flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors', !n.is_read && 'bg-accent/5')}>
                      <div className={cn('w-6 h-6 rounded-lg shrink-0 flex items-center justify-center', !n.is_read ? 'bg-accent/15' : 'bg-muted/50')}>
                        <Bell className={cn('w-3 h-3', !n.is_read ? 'text-accent' : 'text-muted-foreground')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[10px] truncate', !n.is_read ? 'font-medium' : 'text-muted-foreground')}>{isRTL ? n.title_ar : (n.title_en || n.title_ar)}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{isRTL ? n.body_ar : (n.body_en || n.body_ar)}</p>
                      </div>
                      {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-20" /><p className="text-[10px]">{isRTL ? 'لا إشعارات' : 'No notifications'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {contractStatusData.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><PieChartIcon className="w-3.5 h-3.5 text-accent" />{isRTL ? 'حالة العقود' : 'Contract Status'}</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex items-center gap-4">
                <div className="w-[100px] h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={contractStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45} strokeWidth={0}>
                      {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {contractStatusData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-muted-foreground flex-1">{entry.name}</span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs">{isRTL ? 'روابط سريعة' : 'Quick Links'}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', to: '/dashboard/contracts' },
                { icon: MessageSquare, label: isRTL ? 'الرسائل' : 'Messages', to: '/dashboard/messages' },
                { icon: Bookmark, label: isRTL ? 'المفضلة' : 'Bookmarks', to: '/dashboard/bookmarks' },
                { icon: CreditCard, label: isRTL ? 'الأقساط' : 'Installments', to: '/dashboard/installments' },
                { icon: Bell, label: isRTL ? 'الإشعارات' : 'Notifications', to: '/dashboard/notifications' },
                { icon: TrendingUp, label: isRTL ? 'البحث' : 'Search', to: '/search' },
              ].map(a => <QuickAction key={a.to} {...a} />)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
UserDashboardView.displayName = 'UserDashboardView';

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */
const DashboardOverview = () => {
  const { isRTL } = useLanguage();
  const { user, profile, isAdmin, isProvider } = useAuth();

  return (
    <DashboardLayout>
      {isAdmin ? (
        <AdminDashboardView isRTL={isRTL} />
      ) : isProvider ? (
        <ProviderDashboardView isRTL={isRTL} user={user} profile={profile} />
      ) : (
        <UserDashboardView isRTL={isRTL} user={user} profile={profile} />
      )}
    </DashboardLayout>
  );
};

export default DashboardOverview;
