import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  countUnreadNotificationsForUser,
} from '@/modules/notifications';
import { listContractsForCustomer } from '@/modules/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  FileText, MessageSquare, Bell, Bookmark, CreditCard, TrendingUp, DollarSign,
  PieChart as PieChartIcon, Send, Search as SearchIcon, Link as LinkIcon,
  LayoutDashboard, Activity, BarChart3,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import {
  CHART_COLORS, getStatusLabel, getStatusColor,
  OverdueAlerts,
  SectionHeader, SectionLinkAction, SectionEmpty,
  SECTION_CARD_CLASS, SECTION_CONTENT_CLASS,
} from '@/components/dashboard/overview/shared';
import {
  UnifiedDashboardHero,
  formatLastUpdated,
} from '@/components/dashboard/overview/UnifiedDashboardHero';
import {
  UnifiedKpiGrid,
  type UnifiedKpiTile,
} from '@/components/dashboard/overview/UnifiedKpiGrid';
import { LiveActivityWidget } from '@/components/dashboard/overview/widgets/LiveActivityWidget';
import { SmartTasksWidget } from '@/components/dashboard/overview/widgets/SmartTasksWidget';
import { TrendsWidget } from '@/components/dashboard/overview/widgets/TrendsWidget';
import { KeyboardShortcuts } from '@/components/dashboard/overview/KeyboardShortcuts';
import {
  DashboardActionCenter,
  type DashboardAction,
} from '@/components/dashboard/overview/DashboardActionCenter';
import { countConversationsForUser } from '@/modules/messaging';

const TAB_KEYS = ['overview', 'activity', 'performance'] as const;
type TabKey = typeof TAB_KEYS[number];

type UserProfile = {
  full_name?: string | null;
  ref_id?: string | null;
} | null | undefined;

export default function UserDashboardView({
  isRTL, user, profile,
}: { isRTL: boolean; user: { id: string }; profile: UserProfile }) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = (TAB_KEYS as readonly string[]).includes(tabParam ?? '')
    ? (tabParam as TabKey)
    : 'overview';
  const onTabChange = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'overview') sp.delete('tab'); else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  const { data: stats, isFetching, refetch } = useQuery({
    queryKey: ['user-overview-stats', user?.id],
    queryFn: async () => {
      const [contracts, messages, bookmarks, notifications] = await Promise.all([
        listContractsForCustomer({
          clientId: user.id,
          select: 'id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at',
          count: { mode: 'exact' },
          orderBy: { column: 'created_at', ascending: false },
          limit: 5,
        }),
        countConversationsForUser({ userId: user.id }),
        supabase.from('blog_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        countUnreadNotificationsForUser({ userId: user.id }),
      ]);

      const allContracts = contracts.data || [];
      const activeContracts = allContracts.filter((c) => c.status !== 'completed' && c.status !== 'cancelled');
      const completedContracts = allContracts.filter((c) => c.status === 'completed');
      const totalSpent = completedContracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const statusCounts: Record<string, number> = {};
      allContracts.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      const cnt = (x: unknown) => ((x as { count?: number }).count) ?? 0;
      return {
        totalContracts: cnt(contracts) || allContracts.length,
        activeContracts: activeContracts.length, completedContracts: completedContracts.length,
        totalSpent, messages: cnt(messages),
        bookmarks: cnt(bookmarks), unreadNotifications: cnt(notifications),
        recentContracts: allContracts.slice(0, 5), statusCounts,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedSpent = useCountUp(stats?.totalSpent ?? 0, isVisible, 1500);

  const [lastRefresh, setLastRefresh] = React.useState<Date>(() => new Date());

  const contractStatusData = useMemo(() =>
    stats?.statusCounts ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
      name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
    })) : [],
    [stats?.statusCounts, isRTL]
  );

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['user-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['today-summary'] });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    qc.invalidateQueries({ queryKey: ['live-activity'] });
    qc.invalidateQueries({ queryKey: ['dashboard-trends'] });
    setLastRefresh(new Date());
    refetch();
  };

  const widgetChildren: Record<string, React.ReactNode> = {
    trends:    <TrendsWidget         isRTL={isRTL} userId={user.id} />,
    activity:  <LiveActivityWidget   isRTL={isRTL} userId={user.id} />,
    tasks:     <SmartTasksWidget     isRTL={isRTL} userId={user.id} />,
    contracts: (
      <Card className={cn(SECTION_CARD_CLASS, 'h-full')}>
        <CardContent className={SECTION_CONTENT_CLASS}>
          <SectionHeader
            icon={FileText}
            tone="accent"
            title={isRTL ? 'أحدث العقود' : 'Recent Contracts'}
            right={<SectionLinkAction to="/dashboard/contracts" label={isRTL ? 'الكل' : 'View all'} />}
          />
          {stats?.recentContracts?.length ? (
            <div className="space-y-1.5">
              {stats.recentContracts.map((c) => (
                <Link key={c.id} to={`/contracts/${c.id}`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate text-foreground">{isRTL ? c.title_ar : (c.title_en || c.title_ar)}</p>
                      <p className="tech-content text-[10px] text-muted-foreground mt-0.5">{c.contract_number}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[9px] h-5 px-1.5', getStatusColor(c.status))}>{getStatusLabel(c.status, isRTL)}</Badge>
                      <span className="tech-content text-[11px] font-semibold whitespace-nowrap text-foreground">{Number(c.total_amount).toLocaleString()} {c.currency_code}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <SectionEmpty
              icon={FileText}
              message={isRTL ? 'لا عقود بعد' : 'No contracts yet'}
              action={
                <Link to="/search">
                  <Button variant="outline" size="sm" className="text-[11px] gap-1 h-8">
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                    {isRTL ? 'ابحث عن مزود' : 'Find a provider'}
                  </Button>
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>
    ),
    status: contractStatusData.length > 0 ? (
      <Card className={cn(SECTION_CARD_CLASS, 'h-full')}>
        <CardContent className={SECTION_CONTENT_CLASS}>
          <SectionHeader
            icon={PieChartIcon}
            tone="accent"
            title={isRTL ? 'حالة العقود' : 'Contract status'}
          />
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
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                  <span className="text-muted-foreground flex-1">{entry.name}</span>
                  <span className="font-bold text-foreground tech-content">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    ) : null,
  };

  const kpiTiles: UnifiedKpiTile[] = [
    {
      id: 'spent',
      label: isRTL ? 'إجمالي الإنفاق' : 'Total Spent',
      value: `${animatedSpent.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`,
      sub: isRTL
        ? `${stats?.completedContracts ?? 0} عقد مكتمل`
        : `${stats?.completedContracts ?? 0} completed`,
      icon: DollarSign,
    },
    {
      id: 'active',
      label: isRTL ? 'العقود النشطة' : 'Active Contracts',
      value: stats?.activeContracts ?? 0,
      sub: `${isRTL ? 'من أصل' : 'of'} ${stats?.totalContracts ?? 0}`,
      to: '/dashboard/contracts',
      icon: FileText,
    },
    {
      id: 'messages',
      label: isRTL ? 'المحادثات' : 'Conversations',
      value: stats?.messages ?? 0,
      to: '/dashboard/messages',
      icon: MessageSquare,
    },
    {
      id: 'unread',
      label: isRTL ? 'إشعارات جديدة' : 'Unread',
      value: stats?.unreadNotifications ?? 0,
      to: '/dashboard/notifications',
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-5" ref={ref}>
      <UnifiedDashboardHero
        isRTL={isRTL}
        roleLabel={{ ar: 'لوحة العميل', en: 'Client Dashboard' }}
        fullName={profile?.full_name ?? null}
        refId={profile?.ref_id ?? null}
        lastUpdated={formatLastUpdated(lastRefresh, isRTL)}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        subline={
          isRTL
            ? 'مساحة عمل واحدة: الأرقام، الإجراءات، النشاط، والأداء'
            : 'One workspace: numbers, actions, activity, performance'
        }
      />

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar h-auto p-1 bg-card border border-border/60 rounded-xl">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-accent/10 data-[state=active]:text-accent rounded-lg">
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            {isRTL ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2 data-[state=active]:bg-accent/10 data-[state=active]:text-accent rounded-lg">
            <Activity className="w-4 h-4" aria-hidden="true" />
            {isRTL ? 'النشاط' : 'Activity'}
            {(stats?.unreadNotifications ?? 0) > 0 && (
              <Badge variant="outline" className="ms-1 h-4 px-1 text-[9px] border-accent/40 text-accent">
                {stats?.unreadNotifications}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2 data-[state=active]:bg-accent/10 data-[state=active]:text-accent rounded-lg">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            {isRTL ? 'الأداء' : 'Performance'}
          </TabsTrigger>
        </TabsList>

        {/* Overview — Stats + Quick Actions merged */}
        <TabsContent value="overview" className="mt-5 space-y-5 focus-visible:outline-none">
          <UnifiedKpiGrid tiles={kpiTiles} isRTL={isRTL} />
          <DashboardActionCenter
            isRTL={isRTL}
            role="user"
            className="border-primary/15 bg-gradient-to-br from-primary/[0.04] to-accent/[0.03]"
            title={{ ar: 'الإجراءات الموصى بها', en: 'Recommended actions' }}
            actions={[
              {
                id: 'request-quote',
                label: { ar: 'اطلب عرض سعر', en: 'Request a quote' },
                description: {
                  ar: 'أرسل طلبك للمزودين المناسبين خلال دقائق',
                  en: 'Send your RFQ to matching providers in minutes',
                },
                to: '/rfq/new',
                icon: Send,
                primary: true,
              },
              {
                id: 'my-requests',
                label: { ar: 'تابع طلباتك', en: 'Track requests' },
                description: {
                  ar: 'حالة العروض الواردة والردود',
                  en: 'Status of incoming quotes and replies',
                },
                to: '/dashboard/my-requests',
                icon: FileText,
              },
              {
                id: 'browse-providers',
                label: { ar: 'استعرض المزودين', en: 'Browse providers' },
                description: {
                  ar: 'اكتشف موردين موثوقين حسب القطاع',
                  en: 'Discover trusted suppliers by sector',
                },
                to: '/search',
                icon: SearchIcon,
              },
            ] satisfies DashboardAction[]}
          />
          <OverdueAlerts isRTL={isRTL} userId={user.id} />
        </TabsContent>

        {/* Activity — live + notifications + recent contracts */}
        <TabsContent value="activity" className="mt-5 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {widgetChildren.activity}
            {widgetChildren.status}
          </div>
        </TabsContent>

        {/* Performance — trends + tasks */}
        <TabsContent value="performance" className="mt-5 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {widgetChildren.trends}
            {widgetChildren.tasks}
          </div>
        </TabsContent>
      </Tabs>

      <KeyboardShortcuts isRTL={isRTL} onCustomize={() => overviewLayout.setEditMode((value) => !value)} onRefresh={handleRefresh} />
    </div>
  );
}