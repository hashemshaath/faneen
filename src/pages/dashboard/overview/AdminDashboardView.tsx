import React, { useCallback, useMemo } from 'react';
import { getProfileDisplayName, getProfileInitial } from '@/modules/profiles/utils/displayName';
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
  ShieldAlert, Zap, AlertTriangle, UserPlus, ShieldCheck, Inbox,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Newspaper,
  ArrowUpRight, RefreshCw, SlidersHorizontal, LayoutDashboard,
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
  OverdueAlerts, TodaySummary, MembershipWidget,
} from '@/components/dashboard/overview/shared';
import { formatLastUpdated } from '@/components/dashboard/overview/UnifiedDashboardHero';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SmartMetricCard, seriesFromMonthly } from '@/components/dashboard/admin/SmartMetricCard';
import { adminGetServiceActivationCounters } from '@/modules/providerServices';
import {
  AdminQuickActionsWidget,
  AdminWidgetShell,
  useAdminDashboardLayout,
} from '@/modules/admin-dashboard';

export default function AdminDashboardView({ isRTL }: { isRTL: boolean }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const layout = useAdminDashboardLayout();
  const [lastRefresh, setLastRefresh] = React.useState<Date>(() => new Date());

  const { data: svcCounters } = useQuery({
    queryKey: ['admin-service-activation-counters'],
    queryFn: adminGetServiceActivationCounters,
    staleTime: 60_000,
  });

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
        quoteRequestsPendingQ, serviceRequestsPendingQ,
        ownershipTransfersPendingQ, accessRequestsPendingQ, approvalsPendingQ,
      ] = await Promise.all([
        countProfiles(),
        countBusinesses({ select: 'id' }),
        listAllContracts<{ id: string; status: string; total_amount: number | null; created_at: string }>({
          select: 'id, status, total_amount, created_at',
          count: { mode: 'exact' },
        }),
        // Phase 16 — count from the central taxonomy instead of legacy `categories`.
        supabase.from('taxonomy_categories').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_archived', false),
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
        // Phase: Requests Inbox — live pending counters for every request channel.
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }).in('status', ['new', 'pending', 'submitted']),
        supabase.from('service_addition_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('business_ownership_transfer_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('entity_access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('membership_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
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
        quoteRequestsPending: cnt(quoteRequestsPendingQ),
        serviceRequestsPending: cnt(serviceRequestsPendingQ),
        ownershipTransfersPending: cnt(ownershipTransfersPendingQ),
        accessRequestsPending: cnt(accessRequestsPendingQ),
        approvalsPending: cnt(approvalsPendingQ),
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

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['today-summary'] });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    setLastRefresh(new Date());
    refetch();
  };

  // ────────────────────────────────────────────────────────────────
  // Registry-driven widget renderer.  Each case returns the existing
  // JSX for its section, unchanged. Visibility + order come from the
  // `useAdminDashboardLayout` hook (localStorage `qitaat_admin_dashboard_layout_v1`).
  // ────────────────────────────────────────────────────────────────
  const renderWidget = useCallback((id: string): React.ReactNode => {
    switch (id) {
      case 'welcome-hero':
        return (
          <AdminPageHeader
            icon={LayoutDashboard}
            tone="primary"
            eyebrow={isRTL ? 'لوحة المسؤول' : 'Admin Console'}
            title={isRTL ? 'نظرة عامة على المنصة' : 'Platform Overview'}
            subtitle={
              isRTL
                ? `قراءة شاملة لأداء المنصة · ${formatLastUpdated(lastRefresh, isRTL) ?? ''}`
                : `System-wide performance read · ${formatLastUpdated(lastRefresh, isRTL) ?? ''}`
            }
            actions={
              <>
                <Badge className="text-[10px] gap-1 h-7 px-2 bg-success/10 text-success border border-success/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                  {isRTL ? 'مباشر' : 'Live'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  aria-label={isRTL ? 'تحديث' : 'Refresh'}
                  className="h-8 gap-1.5"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} aria-hidden="true" />
                  <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
                </Button>
                <Button
                  variant={layout.editMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => layout.setEditMode(!layout.editMode)}
                  aria-pressed={layout.editMode}
                  className="h-8 gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {layout.editMode ? (isRTL ? 'إنهاء' : 'Done') : (isRTL ? 'تخصيص' : 'Customize')}
                  </span>
                </Button>
              </>
            }
          />
        );
      case 'alerts-row':
        return user ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OverdueAlerts isRTL={isRTL} userId={user.id} />
            <TodaySummary isRTL={isRTL} userId={user.id} />
            <MembershipWidget isRTL={isRTL} userId={user.id} />
          </div>
        ) : null;
      case 'todays-pulse':
        {
          const leadsSeries = seriesFromMonthly(stats?.monthlyContracts, 6); // proxy series for activity flow
          const usersSeries = seriesFromMonthly(stats?.monthlyUsers, 6);
          const pulse = [
            {
              icon: MessageSquare,
              label: isRTL ? 'طلبات اليوم' : 'Leads today',
              value: stats?.leadsToday ?? 0,
              series: leadsSeries,
              tone: 'info' as const,
              to: '/admin/lead-requests',
              insight: (stats?.leadsToday ?? 0) === 0
                ? (isRTL ? 'لا توجد طلبات جديدة اليوم — تابع لاحقاً.' : 'No incoming leads yet today — check back later.')
                : (isRTL ? `${stats?.leadsToday} طلب نشط بانتظار المراجعة الآن.` : `${stats?.leadsToday} active leads waiting for review.`),
            },
            {
              icon: FileText,
              label: isRTL ? 'عقود اليوم' : 'Contracts today',
              value: stats?.contractsToday ?? 0,
              series: leadsSeries,
              tone: 'accent' as const,
              to: '/admin/contracts',
              insight: (stats?.contractsToday ?? 0) > 0
                ? (isRTL ? 'تدفّق عقود إيجابي خلال آخر الفترات.' : 'Healthy contract velocity vs. recent periods.')
                : (isRTL ? 'لا عقود مسجّلة اليوم — راقب قناة التحويل.' : 'No contracts logged today — watch the funnel.'),
            },
            {
              icon: UserPlus,
              label: isRTL ? 'مزودون جدد' : 'New providers',
              value: stats?.providersToday ?? 0,
              series: usersSeries,
              tone: 'primary' as const,
              to: '/admin/businesses',
              insight: (stats?.providersToday ?? 0) > 0
                ? (isRTL ? 'نمو في تسجيل المزودين — راجع الموافقات.' : 'Provider sign-ups trending up — review approvals.')
                : (isRTL ? 'هدوء في التسجيل اليوم.' : 'Quiet sign-up day so far.'),
            },
            {
              icon: AlertTriangle,
              label: isRTL ? 'بريد فاشل (48س)' : 'Email DLQ (48h)',
              value: stats?.dlqActive ?? 0,
              series: [],
              tone: (stats?.dlqActive ?? 0) > 0 ? ('destructive' as const) : ('success' as const),
              to: '/admin/email-center',
              trendPercent: (stats?.dlqActive ?? 0) > 0 ? null : 0,
              insight: (stats?.dlqActive ?? 0) > 0
                ? (isRTL ? 'رسائل لم تُسلَّم — افحص قائمة DLQ فوراً.' : 'Delivery failures detected — inspect the DLQ now.')
                : (isRTL ? 'لا فشل في الإرسال خلال آخر 48 ساعة.' : 'No delivery failures in the last 48 hours.'),
            },
          ];
          const pulseTotal = pulse.reduce((s, p) => s + (typeof p.value === 'number' ? p.value : 0), 0);
          const hasIncidents = (stats?.dlqActive ?? 0) > 0;
          return (
            <Card className="border-border/40">
              <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                    {isRTL ? 'مهام اليوم — قراءة ذكية' : "Today's Tasks — smart read"}
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isRTL
                      ? 'مؤشرات حية لنشاط المنصة خلال آخر 24 ساعة.'
                      : 'Live indicators of platform activity in the last 24 hours.'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 px-1.5">
                    <span className="tech-content font-bold">{pulseTotal}</span>
                    <span className="text-muted-foreground">{isRTL ? 'حدث اليوم' : 'events today'}</span>
                  </Badge>
                  <Badge
                    className={cn(
                      'text-[10px] h-5 gap-1 px-1.5 border',
                      hasIncidents
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-success/10 text-success border-success/20',
                    )}
                  >
                    {hasIncidents
                      ? (isRTL ? 'حوادث نشطة' : 'incidents')
                      : (isRTL ? 'مستقر' : 'stable')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {pulse.map((m) => (
                    <SmartMetricCard
                      key={m.label}
                      icon={m.icon}
                      label={m.label}
                      value={m.value}
                      series={m.series}
                      trendPercent={m.trendPercent}
                      insight={m.insight}
                      tone={m.tone}
                      to={m.to}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }
      case 'needs-attention':
        {
          type InboxItem = {
            icon: typeof MessageSquare;
            label: string;
            value: number | null | undefined;
            to: string;
            tone: 'info' | 'accent' | 'warning' | 'primary' | 'destructive';
          };
          type InboxGroup = {
            key: 'urgent' | 'approvals' | 'communication';
            title: string;
            tone: 'destructive' | 'warning' | 'info';
            items: InboxItem[];
          };
          const groups: InboxGroup[] = [
            {
              key: 'urgent',
              title: isRTL ? 'عاجل' : 'Urgent',
              tone: 'destructive',
              items: [
                { icon: AlertTriangle, label: isRTL ? 'بريد فاشل (DLQ)' : 'Email DLQ',         value: stats?.dlqActive,         to: '/admin/email-center', tone: 'destructive' },
                { icon: FileText,      label: isRTL ? 'عقود معلّقة'     : 'Contracts pending', value: stats?.contractsPending,  to: '/admin/contracts',    tone: 'warning' },
              ],
            },
            {
              key: 'approvals',
              title: isRTL ? 'موافقات' : 'Approvals',
              tone: 'warning',
              items: [
                { icon: ShieldCheck, label: isRTL ? 'مراجعة مزودين'  : 'Provider review',      value: stats?.providersPending,            to: '/admin/provider-review',             tone: 'warning' },
                { icon: ShieldCheck, label: isRTL ? 'تفعيل الخدمات'  : 'Service activations',  value: svcCounters?.pendingReview ?? null, to: '/admin/service-activations',         tone: 'warning' },
                { icon: Crown,       label: isRTL ? 'موافقات العضوية' : 'Membership approvals', value: stats?.approvalsPending,            to: '/admin/approvals',                   tone: 'accent' },
                { icon: UserPlus,    label: isRTL ? 'نقل ملكية'      : 'Ownership transfers',  value: stats?.ownershipTransfersPending,   to: '/admin/ownership-transfer-requests', tone: 'primary' },
                { icon: ShieldCheck, label: isRTL ? 'طلبات وصول'     : 'Access requests',      value: stats?.accessRequestsPending,       to: '/admin/entity-access-requests',      tone: 'info' },
              ],
            },
            {
              key: 'communication',
              title: isRTL ? 'تواصل وطلبات' : 'Communication & requests',
              tone: 'info',
              items: [
                { icon: MessageSquare, label: isRTL ? 'طلبات عروض الأسعار' : 'Quote requests',   value: stats?.quoteRequestsPending,   to: '/admin/quote-requests',   tone: 'info' },
                { icon: FileText,      label: isRTL ? 'طلبات الخدمات'      : 'Service requests', value: stats?.serviceRequestsPending, to: '/admin/service-requests', tone: 'accent' },
                { icon: Mail,          label: isRTL ? 'رسائل تواصل'        : 'Contact messages', value: stats?.newContactMessages,     to: '/admin/contact-messages', tone: 'info' },
              ],
            },
          ];
          const sumOf = (items: InboxItem[]) =>
            items.reduce((s, c) => s + (typeof c.value === 'number' ? c.value : 0), 0);
          const groupTotals: Record<InboxGroup['key'], number> = {
            urgent: sumOf(groups[0].items),
            approvals: sumOf(groups[1].items),
            communication: sumOf(groups[2].items),
          };
          const totalPending = groupTotals.urgent + groupTotals.approvals + groupTotals.communication;
          const TONE_TEXT: Record<InboxItem['tone'], string> = {
            info: 'text-info', accent: 'text-accent', warning: 'text-warning',
            primary: 'text-primary', destructive: 'text-destructive',
          };
          const TONE_RING: Record<InboxGroup['tone'], string> = {
            destructive: 'border-destructive/30 bg-destructive/5',
            warning: 'border-warning/30 bg-warning/5',
            info: 'border-info/30 bg-info/5',
          };
          const TONE_TXT: Record<InboxGroup['tone'], string> = {
            destructive: 'text-destructive',
            warning: 'text-warning',
            info: 'text-info',
          };
          return (
            <Card className="border-border/40">
              <CardHeader className="pb-2 px-4 pt-3 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5 text-urgent" aria-hidden="true" />
                    {isRTL ? 'صناديق الوارد — بحاجة إلى إجراء' : 'Requests inbox — needs attention'}
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isRTL
                      ? 'كل الطلبات المعلّقة مصنّفة حسب الأولوية والقناة.'
                      : 'All pending items grouped by priority and channel.'}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 gap-1 px-1.5">
                  <span className="tech-content font-bold">{totalPending}</span>
                  <span className="text-muted-foreground">{isRTL ? 'بانتظار' : 'pending'}</span>
                </Badge>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-3">
                {/* Group summary strip */}
                <div className="grid grid-cols-3 gap-2">
                  {groups.map((g) => (
                    <div
                      key={g.key}
                      className={cn(
                        'rounded-xl border p-2.5 flex items-center justify-between gap-2',
                        TONE_RING[g.tone],
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{g.title}</p>
                        <p className={cn('text-xl font-bold leading-none tech-content mt-1', TONE_TXT[g.tone])}>
                          {groupTotals[g.key]}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground tech-content">
                        {g.items.length} {isRTL ? 'قناة' : 'channels'}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Grouped item grids */}
                {groups.map((g) => (
                  <div key={g.key} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 rounded-full', TONE_TXT[g.tone].replace('text-', 'bg-'))} />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {g.title}
                      </p>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {g.items.map((m) => {
                        const v = m.value;
                        const empty = v === null || v === undefined;
                        const zero = v === 0;
                        const toneClass = TONE_TEXT[m.tone];
                        return (
                          <Link
                            key={m.label}
                            to={m.to}
                            className="group rounded-xl border border-border/40 p-3 flex items-center justify-between gap-2 hover:border-accent/40 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/40', toneClass)}>
                                <m.icon className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <p className={cn('text-lg font-bold leading-none tech-content', empty || zero ? 'text-muted-foreground' : toneClass)}>
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
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        }
      case 'kpi-bento':
        {
          const usersSeries   = seriesFromMonthly(stats?.monthlyUsers, 6);
          const contractSeries = seriesFromMonthly(stats?.monthlyContracts, 6);
          const completionRate = stats?.contracts
            ? Math.round(((stats.activeContracts ?? 0) / stats.contracts) * 100)
            : 0;
          const kpis = [
            {
              icon: Users,
              label: isRTL ? 'المستخدمون' : 'Users',
              value: animatedUsers,
              series: usersSeries,
              tone: 'primary' as const,
              to: '/admin/users',
              insight: usersSeries.length >= 2
                ? (isRTL ? 'منحنى نمو إيجابي خلال الأشهر الأخيرة.' : 'Positive growth curve in recent months.')
                : (isRTL ? 'لا توجد بيانات كافية بعد لقراءة الاتجاه.' : 'Not enough history yet to read a trend.'),
            },
            {
              icon: Building2,
              label: isRTL ? 'المنشآت' : 'Businesses',
              value: stats?.businesses ?? 0,
              series: usersSeries,
              tone: 'success' as const,
              to: '/admin/businesses',
              insight: (stats?.providersPending ?? 0) > 0
                ? (isRTL ? `${stats?.providersPending} منشأة بانتظار المراجعة.` : `${stats?.providersPending} businesses awaiting review.`)
                : (isRTL ? 'كل المنشآت تمت مراجعتها.' : 'All businesses are reviewed.'),
            },
            {
              icon: DollarSign,
              label: isRTL ? 'الإيرادات' : 'Revenue',
              value: `${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`,
              series: contractSeries,
              tone: 'success' as const,
              to: '/dashboard/contracts',
              insight: isRTL
                ? `${stats?.activeContracts ?? 0} عقد نشط حالياً، يولّد إيراد مستمر.`
                : `${stats?.activeContracts ?? 0} active contracts generating ongoing revenue.`,
            },
            {
              icon: FileText,
              label: isRTL ? 'العقود النشطة' : 'Active Contracts',
              value: stats?.activeContracts ?? 0,
              series: contractSeries,
              tone: 'accent' as const,
              to: '/dashboard/contracts',
              trendPercent: completionRate,
              insight: isRTL
                ? `${completionRate}% من إجمالي ${animatedContracts} عقد قيد التنفيذ.`
                : `${completionRate}% of ${animatedContracts} total contracts are active.`,
            },
            {
              icon: Crown,
              label: isRTL ? 'اشتراكات نشطة' : 'Active Subs',
              value: stats?.subscriptions ?? 0,
              series: [],
              tone: 'accent' as const,
              to: '/admin/memberships',
              insight: (stats?.approvalsPending ?? 0) > 0
                ? (isRTL ? `${stats?.approvalsPending} طلب عضوية بانتظار الموافقة.` : `${stats?.approvalsPending} membership requests pending.`)
                : (isRTL ? 'لا طلبات عضوية معلّقة حالياً.' : 'No pending membership requests.'),
            },
            {
              icon: MessageSquare,
              label: isRTL ? 'المحادثات' : 'Conversations',
              value: stats?.messages ?? 0,
              series: [],
              tone: 'info' as const,
              to: '/dashboard/messages',
              insight: isRTL ? 'حجم تواصل تراكمي بين المزودين والعملاء.' : 'Cumulative provider ↔ client conversations.',
            },
            {
              icon: Mail,
              label: isRTL ? 'رسائل جديدة' : 'New Messages',
              value: stats?.newContactMessages ?? 0,
              series: [],
              tone: (stats?.newContactMessages ?? 0) > 0 ? ('warning' as const) : ('success' as const),
              to: '/admin/contact-messages',
              insight: (stats?.newContactMessages ?? 0) > 0
                ? (isRTL ? 'رسائل تواصل بحاجة إلى رد.' : 'Contact messages waiting for a reply.')
                : (isRTL ? 'صندوق التواصل فارغ — أحسنت.' : 'Inbox empty — nice work.'),
            },
          ];
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((k) => (
                <SmartMetricCard
                  key={k.label}
                  icon={k.icon}
                  label={k.label}
                  value={k.value}
                  series={k.series}
                  trendPercent={k.trendPercent}
                  insight={k.insight}
                  tone={k.tone}
                  to={k.to}
                  isRTL={isRTL}
                />
              ))}
            </div>
          );
        }
      case 'quick-actions':
        return <AdminQuickActionsWidget isRTL={isRTL} />;
      case 'monthly-contracts-chart':
        return (
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
        );
      case 'contract-status-chart':
        return (
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
        );
      case 'user-growth-chart':
        return (
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
        );
      case 'recent-activity':
        return (
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
        );
      case 'recent-users':
        return (
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
                      <AvatarFallback className="bg-accent/10 text-accent text-[9px] font-bold">{getProfileInitial(u, isRTL ? 'ar' : 'en')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium truncate">{getProfileDisplayName(u, { locale: isRTL ? 'ar' : 'en', emptyFallback: isRTL ? 'بدون اسم' : 'No name' })}</p>
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
        );
      case 'service-ops':
        {
          const svcCards = [
            {
              icon: ShieldAlert, tone: 'warning' as const,
              label: isRTL ? 'قيد المراجعة' : 'Pending review',
              value: svcCounters?.pendingReview ?? 0,
              to: '/admin/service-activations?requires_admin_review=true',
              insight: (svcCounters?.pendingReview ?? 0) > 0
                ? (isRTL ? 'خدمات بانتظار اعتماد المسؤول — راجعها لتسريع التفعيل.' : 'Services awaiting admin sign-off — review to unblock activation.')
                : (isRTL ? 'لا خدمات بانتظار المراجعة الآن.' : 'No services awaiting review right now.'),
            },
            {
              icon: AlertTriangle, tone: 'destructive' as const,
              label: isRTL ? 'موقوفة' : 'Suspended',
              value: svcCounters?.suspended ?? 0,
              to: '/admin/service-activations?admin_status=suspended',
              insight: (svcCounters?.suspended ?? 0) > 0
                ? (isRTL ? 'خدمات موقوفة قد تؤثر على ظهور المزوّد — راجع السبب.' : 'Suspended services may hurt provider visibility — investigate.')
                : (isRTL ? 'لا توجد خدمات موقوفة.' : 'No suspended services.'),
            },
            {
              icon: Crown, tone: 'accent' as const,
              label: isRTL ? 'تتطلب ترقية' : 'Requires upgrade',
              value: svcCounters?.requiresUpgrade ?? 0,
              to: '/admin/service-activations?required_plan_tier=not_null',
              insight: (svcCounters?.requiresUpgrade ?? 0) > 0
                ? (isRTL ? 'فرصة بيع: مزودون بحاجة لخطة أعلى لتفعيل خدماتهم.' : 'Upsell opportunity: providers need a higher plan to activate.')
                : (isRTL ? 'لا خدمات تتطلب ترقية حالياً.' : 'No services need an upgrade.'),
            },
            {
              icon: Activity, tone: 'info' as const,
              label: isRTL ? 'مميزة' : 'Featured',
              value: svcCounters?.featured ?? 0,
              to: '/admin/service-activations?is_featured=true',
              insight: isRTL
                ? `${svcCounters?.featured ?? 0} خدمة مُبرزة حالياً في الواجهة العامة.`
                : `${svcCounters?.featured ?? 0} services currently spotlighted in public surfaces.`,
            },
            {
              icon: Crown, tone: 'primary' as const,
              label: isRTL ? 'بريميوم' : 'Premium',
              value: svcCounters?.premium ?? 0,
              to: '/admin/service-activations?is_premium_service=true',
              insight: isRTL
                ? 'خدمات بريميوم تساهم في رفع متوسط قيمة الاشتراك.'
                : 'Premium services lift average subscription value.',
            },
          ];
          return (
            <Card className="border-border/40">
              <CardHeader className="pb-1 px-4 pt-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  {isRTL ? 'تشغيل الخدمات — قراءة ذكية' : 'Service Operations — smart read'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" data-testid="service-ops-counter">
                  {svcCards.map((c) => (
                    <SmartMetricCard
                      key={c.label}
                      icon={c.icon}
                      label={c.label}
                      value={c.value}
                      tone={c.tone}
                      to={c.to}
                      insight={c.insight}
                      isRTL={isRTL}
                      chart="bars"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }
      case 'system-summary':
        {
          const contractSeries = seriesFromMonthly(stats?.monthlyContracts, 6);
          const usersSeries = seriesFromMonthly(stats?.monthlyUsers, 6);
          const adminCount = (stats?.roleCounts?.admin ?? 0) + (stats?.roleCounts?.super_admin ?? 0);
          const sysCards = [
            {
              icon: Activity, tone: 'info' as const,
              label: isRTL ? 'تصنيفات نشطة' : 'Active categories',
              value: stats?.categories ?? 0, to: '/admin/taxonomy',
              insight: isRTL ? 'العمود الفقري للبحث والتوجيه — تأكد من التغطية.' : 'Backbone of search & routing — keep coverage healthy.',
            },
            {
              icon: Newspaper, tone: 'accent' as const,
              label: isRTL ? 'مقالات المدوّنة' : 'Blog posts',
              value: stats?.blogPosts ?? 0, to: '/admin/blog',
              insight: isRTL ? 'محتوى يدعم الـ SEO وزيارات العضوية المجانية.' : 'Content fuels SEO and organic membership traffic.',
            },
            {
              icon: ShieldAlert, tone: adminCount > 1 ? ('success' as const) : ('warning' as const),
              label: isRTL ? 'فريق الإشراف' : 'Admin team',
              value: adminCount, to: '/admin/identity',
              insight: adminCount > 1
                ? (isRTL ? 'تغطية إشرافية صحية — تقليل مخاطر النقطة الواحدة.' : 'Healthy coverage — no single point of failure.')
                : (isRTL ? 'مشرف واحد فقط — أضف نسخة احتياطية للإدارة.' : 'Only one admin — add a backup for resilience.'),
            },
            {
              icon: FileText, tone: 'primary' as const,
              label: isRTL ? 'إجمالي العقود' : 'Total contracts',
              value: stats?.contracts ?? 0, series: contractSeries, to: '/admin/contracts',
              insight: isRTL
                ? `${stats?.activeContracts ?? 0} عقد نشط من إجمالي ${stats?.contracts ?? 0}.`
                : `${stats?.activeContracts ?? 0} active out of ${stats?.contracts ?? 0} total.`,
            },
          ];
          void usersSeries;
          return (
            <Card className="border-border/40">
              <CardHeader className="pb-1 px-4 pt-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-accent" />
                  {isRTL ? 'ملخص النظام — قراءة ذكية' : 'System Summary — smart read'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {sysCards.map((c) => (
                    <SmartMetricCard
                      key={c.label}
                      icon={c.icon}
                      label={c.label}
                      value={c.value}
                      series={c.series}
                      tone={c.tone}
                      to={c.to}
                      insight={c.insight}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }
      default:
        return null;
    }
  }, [
    isRTL, profile, user, stats, contractStatusData, animatedUsers, animatedRevenue, animatedContracts, svcCounters,
    isFetching, layout,
  ]);

  // Sections that participate in the customizable grid (charts).
  // They keep their lg:grid-cols-3 / lg:grid-cols-2 layout when shown
  // together, but are still individually hideable.
  const CHART_IDS = new Set([
    'monthly-contracts-chart', 'contract-status-chart', 'user-growth-chart',
  ]);
  const ACTIVITY_PAIR_IDS = new Set(['recent-activity', 'recent-users']);

  return (
    <div className="space-y-5" ref={ref} data-admin-dashboard-edit={layout.editMode ? 'true' : 'false'}>
      {layout.visibleOrder.map((id, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === layout.visibleOrder.length - 1;
        // Group adjacent charts into the lg:grid-cols-3 row (legacy layout parity).
        if (CHART_IDS.has(id)) {
          const prevId = layout.visibleOrder[idx - 1];
          if (prevId && CHART_IDS.has(prevId)) return null; // already rendered by group head
          const groupIds = layout.visibleOrder.slice(idx).filter((g, i, arr) => CHART_IDS.has(g) && (i === 0 || CHART_IDS.has(arr[i - 1])));
          // collect the contiguous run starting at idx
          const run: string[] = [];
          for (let k = idx; k < layout.visibleOrder.length; k++) {
            if (CHART_IDS.has(layout.visibleOrder[k])) run.push(layout.visibleOrder[k]);
            else break;
          }
          void groupIds;
          return (
            <div key={`charts-${idx}`} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {run.map((rid, rIdx) => (
                <AdminWidgetShell
                  key={rid}
                  widgetId={rid}
                  editMode={layout.editMode}
                  isHidden={layout.isHidden(rid)}
                  onToggle={() => layout.toggleHidden(rid)}
                  onMoveUp={() => layout.moveUp(rid)}
                  onMoveDown={() => layout.moveDown(rid)}
                  canMoveUp={!(idx === 0 && rIdx === 0)}
                  canMoveDown={!(idx + run.length >= layout.visibleOrder.length && rIdx === run.length - 1)}
                  isRTL={isRTL}
                >
                  {renderWidget(rid)}
                </AdminWidgetShell>
              ))}
            </div>
          );
        }
        // Group adjacent recent-activity + recent-users into lg:grid-cols-2 row.
        if (ACTIVITY_PAIR_IDS.has(id)) {
          const prevId = layout.visibleOrder[idx - 1];
          if (prevId && ACTIVITY_PAIR_IDS.has(prevId)) return null;
          const run: string[] = [];
          for (let k = idx; k < layout.visibleOrder.length; k++) {
            if (ACTIVITY_PAIR_IDS.has(layout.visibleOrder[k])) run.push(layout.visibleOrder[k]);
            else break;
          }
          return (
            <div key={`activity-${idx}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {run.map((rid, rIdx) => (
                <AdminWidgetShell
                  key={rid}
                  widgetId={rid}
                  editMode={layout.editMode}
                  isHidden={layout.isHidden(rid)}
                  onToggle={() => layout.toggleHidden(rid)}
                  onMoveUp={() => layout.moveUp(rid)}
                  onMoveDown={() => layout.moveDown(rid)}
                  canMoveUp={!(idx === 0 && rIdx === 0)}
                  canMoveDown={!(idx + run.length >= layout.visibleOrder.length && rIdx === run.length - 1)}
                  isRTL={isRTL}
                >
                  {renderWidget(rid)}
                </AdminWidgetShell>
              ))}
            </div>
          );
        }
        return (
          <AdminWidgetShell
            key={id}
            widgetId={id}
            editMode={layout.editMode}
            isHidden={layout.isHidden(id)}
            onToggle={() => layout.toggleHidden(id)}
            onMoveUp={() => layout.moveUp(id)}
            onMoveDown={() => layout.moveDown(id)}
            canMoveUp={!isFirst}
            canMoveDown={!isLast}
            isRTL={isRTL}
          >
            {renderWidget(id)}
          </AdminWidgetShell>
        );
      })}
    </div>
  );
}