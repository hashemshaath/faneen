import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Building2, DollarSign, FileText, Crown, MessageSquare, Mail,
  ShieldAlert, Zap, AlertCircle, AlertTriangle, UserPlus, ShieldCheck, Inbox,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Newspaper,
  ArrowUpRight,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import { maskEmail } from '@/lib/masking';
import { countByRole } from '@/modules/identity';
import { countProfiles, listProfiles } from '@/modules/users';
import { countBusinesses } from '@/modules/businesses';
import {
  countLeadsByDateRange,
  countLeadsByStatus,
} from '@/modules/leads';
import { countConversationsTotal } from '@/modules/messaging';
import { listAllContracts } from '@/modules/contracts';
import { countActiveMembershipSubscriptions } from '@/modules/memberships';
import {
  CHART_COLORS, ChartTooltipStyle, getStatusLabel, buildMonthlyData,
  StatCard, QuickAction, OverdueAlerts, TodaySummary, MembershipWidget,
  RefreshButton, getTimeGreeting,
} from '@/components/dashboard/overview/shared';

export default function AdminDashboardView({ isRTL }: { isRTL: boolean }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: stats, isFetching, refetch } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const todayIso = startOfToday.toISOString();
      const fresh48hIso = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const [
        users, businesses, contracts, categories, messages, subscriptions, roleCounts,
        recentUsers, recentActivity, blogPosts, contactMessages, userGrowth,
        leadsTodayQ, contractsTodayQ, providersTodayQ,
        leadsPendingQ, providersPendingQ, dlqActiveQ, contractsPendingQ,
      ] = await Promise.all([
        countProfiles(),
        countBusinesses({ select: 'id' }),
        listAllContracts<{ id: string; status: string; total_amount: number | null; created_at: string }>({
          select: 'id, status, total_amount, created_at',
          count: { mode: 'exact' },
        }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        countConversationsTotal(),
        countActiveMembershipSubscriptions(),
        countByRole(),
        listProfiles<{ id: string; full_name: string | null; avatar_url: string | null; email: string | null; account_type: string | null; created_at: string }>({ select: 'id, full_name, avatar_url, email, account_type, created_at', orderBy: { column: 'created_at', ascending: false }, limit: 5 }),
        supabase.from('admin_activity_log').select('id, action, entity_type, created_at, details').order('created_at', { ascending: false }).limit(6),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        listProfiles<{ created_at: string }>({ select: 'created_at', orderBy: { column: 'created_at', ascending: true } }),
        countLeadsByDateRange(todayIso),
        listAllContracts({ select: 'id', count: { mode: 'exact', head: true }, gteCreatedAt: todayIso }),
        countBusinesses({ select: 'id', filters: [{ column: 'created_at', op: 'gte', value: todayIso }] }),
        countLeadsByStatus('new'),
        countBusinesses({ select: 'id', filters: [{ column: 'approval_status', op: 'in', value: ['submitted', 'under_review'] }] }),
        supabase.from('email_send_log').select('id', { count: 'exact', head: true }).eq('status', 'dlq').gte('created_at', fresh48hIso),
        listAllContracts({ select: 'id', count: { mode: 'exact', head: true }, eqStatus: 'pending_approval' }),
      ]);

      const allContracts = contracts.data || [];
      const totalRevenue = allContracts.filter((c) => c.status === 'completed').reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      const activeContracts = allContracts.filter((c) => c.status === 'active').length;

      const statusCounts: Record<string, number> = {};
      allContracts.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      const cnt = (x: unknown) => ((x as { count?: number }).count) ?? 0;
      return {
        users: cnt(users), businesses: cnt(businesses),
        contracts: allContracts.length, activeContracts, totalRevenue,
        categories: cnt(categories), messages: cnt(messages),
        subscriptions: cnt(subscriptions), blogPosts: cnt(blogPosts),
        newContactMessages: cnt(contactMessages),
        roleCounts, statusCounts,
        monthlyContracts: buildMonthlyData(allContracts, isRTL),
        monthlyUsers: buildMonthlyData(userGrowth.data || [], isRTL),
        recentUsers: recentUsers.data || [], recentActivity: recentActivity.data || [],
        leadsToday: cnt(leadsTodayQ), contractsToday: cnt(contractsTodayQ), providersToday: cnt(providersTodayQ),
        leadsPending: cnt(leadsPendingQ), providersPending: cnt(providersPendingQ),
        dlqActive: cnt(dlqActiveQ), contractsPending: cnt(contractsPendingQ),
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
    { icon: Building2, label: isRTL ? 'المنشآت' : 'Businesses', value: stats?.businesses ?? 0, color: 'bg-success/10 text-success', to: '/admin/businesses' },
    { icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Revenue', value: `${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`, color: 'bg-success/10 text-success', to: '/dashboard/contracts' },
    { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: stats?.activeContracts ?? 0, sub: `${isRTL ? 'من' : 'of'} ${animatedContracts}`, color: 'bg-accent/10 text-accent', to: '/dashboard/contracts' },
    { icon: Crown, label: isRTL ? 'اشتراكات نشطة' : 'Active Subs', value: stats?.subscriptions ?? 0, color: 'bg-accent/10 text-accent', to: '/admin/memberships' },
    { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: stats?.messages ?? 0, color: 'bg-primary/10 text-primary', to: '/dashboard/messages' },
    { icon: Mail, label: isRTL ? 'رسائل جديدة' : 'New Messages', value: stats?.newContactMessages ?? 0, color: 'bg-info/10 text-info', to: '/admin/contact-messages' },
  ], [isRTL, animatedUsers, animatedRevenue, animatedContracts, stats]);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['today-summary'] });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    refetch();
  };

  return (
    <div className="space-y-5" ref={ref}>
      {/* Welcome */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 dark:from-card/80 dark:to-primary/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-accent" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-lg sm:text-xl truncate">
                {getTimeGreeting(isRTL)}{profile?.full_name ? `، ${profile.full_name}` : ''}
              </h1>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{isRTL ? 'نظرة شاملة على النظام' : 'System overview'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RefreshButton onClick={handleRefresh} isLoading={isFetching} isRTL={isRTL} />
            <Badge variant="outline" className="text-[10px] gap-1.5 bg-success/10 border-success/30 text-success">
              <Zap className="w-3 h-3" aria-hidden="true" />{isRTL ? 'مباشر' : 'Live'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Alerts + Today + Membership */}
      {user && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <OverdueAlerts isRTL={isRTL} userId={user.id} />
          <TodaySummary isRTL={isRTL} userId={user.id} />
          <MembershipWidget isRTL={isRTL} userId={user.id} />
        </div>
      )}

      {/* Today's Pulse */}
      <Card className="border-border/40">
        <CardHeader className="pb-1 px-4 pt-3">
          <CardTitle className="text-xs flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            {isRTL ? 'نبض اليوم' : "Today's Pulse"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {([
              { icon: MessageSquare, label: isRTL ? 'طلبات اليوم' : 'Leads today', value: stats?.leadsToday, tone: 'text-info', bg: 'bg-info/10' },
              { icon: FileText,      label: isRTL ? 'عقود اليوم' : 'Contracts today', value: stats?.contractsToday, tone: 'text-accent', bg: 'bg-accent/10' },
              { icon: UserPlus,      label: isRTL ? 'تسجيل مزودين' : 'New providers', value: stats?.providersToday, tone: 'text-primary', bg: 'bg-primary/10' },
              { icon: AlertTriangle, label: isRTL ? 'بريد فاشل (48س)' : 'Email DLQ (48h)', value: stats?.dlqActive, tone: 'text-destructive', bg: 'bg-destructive/10' },
            ] as const).map((m) => (
              <div key={m.label} className="rounded-xl border border-border/40 p-3 flex items-center gap-2.5">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', m.bg, m.tone)}>
                  <m.icon className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-lg font-bold leading-none tech-content', m.tone)}>
                    {m.value === null || m.value === undefined ? '—' : m.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention */}
      <Card className="border-border/40">
        <CardHeader className="pb-1 px-4 pt-3">
          <CardTitle className="text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-urgent" aria-hidden="true" />
            {isRTL ? 'بحاجة إلى إجراء' : 'Needs attention'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {([
              { icon: MessageSquare, label: isRTL ? 'طلبات جديدة' : 'New leads',           value: stats?.leadsPending,       to: '/admin/lead-requests',   tone: 'text-info' },
              { icon: ShieldCheck,   label: isRTL ? 'مراجعة مزودين' : 'Provider review',   value: stats?.providersPending,   to: '/admin/provider-review', tone: 'text-warning' },
              { icon: AlertTriangle, label: isRTL ? 'بريد DLQ نشط' : 'Email DLQ',          value: stats?.dlqActive,          to: '/admin/email-center',    tone: 'text-destructive' },
              { icon: Inbox,         label: isRTL ? 'رسائل تواصل' : 'Contact messages',    value: stats?.newContactMessages, to: '/admin/contact-messages',tone: 'text-info' },
              { icon: FileText,      label: isRTL ? 'عقود بانتظار الموافقة' : 'Contracts pending', value: stats?.contractsPending, to: '/dashboard/contracts', tone: 'text-warning' },
            ] as const).map((m) => {
              const v = m.value;
              const empty = v === null || v === undefined;
              const zero = v === 0;
              return (
                <Link
                  key={m.label}
                  to={m.to}
                  className="group rounded-xl border border-border/40 p-3 flex items-center justify-between gap-2 hover:border-accent/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/40', m.tone)}>
                      <m.icon className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-lg font-bold leading-none tech-content', empty || zero ? 'text-muted-foreground' : m.tone)}>
                        {empty ? '—' : v}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{m.label}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-accent transition-colors" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {adminCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'العقود الشهرية' : 'Monthly Contracts'}
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
              <PieChartIcon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'توزيع حالة العقود' : 'Contract Status'}
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

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" aria-hidden="true" />{isRTL ? 'نمو المستخدمين' : 'User Growth'}
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
              <Activity className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'آخر النشاطات' : 'Recent Activity'}
            </CardTitle>
            <Link to="/admin/activity-log"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {(stats?.recentActivity || []).map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Activity className="w-3 h-3 text-accent" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium truncate">{item.action} — {item.entity_type}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
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
              <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />{isRTL ? 'أحدث المستخدمين' : 'Recent Users'}
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
                    <p className="text-[9px] text-muted-foreground truncate tech-content" title={isRTL ? 'البريد مخفي لحماية الخصوصية' : 'Email masked for privacy'}>{maskEmail(u.email)}</p>
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
            ].map((a) => <QuickAction key={a.to} {...a} />)}
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
        ].map((card) => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-2.5 flex flex-col items-center text-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <card.icon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              </div>
              <span className="tech-content text-base font-bold">{card.value}</span>
              <span className="text-[9px] text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}