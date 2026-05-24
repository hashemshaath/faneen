import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  countUnreadNotificationsForUser,
  listRecentNotificationsForUser,
} from '@/modules/notifications';
import { listContractsForCustomer } from '@/modules/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  FileText, MessageSquare, Bell, Bookmark, CreditCard, TrendingUp, DollarSign,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import {
  CHART_COLORS, getStatusLabel, getStatusColor,
  QuickAction, OverdueAlerts, TodaySummary, MembershipWidget,
  RefreshButton, getTimeGreeting,
} from '@/components/dashboard/overview/shared';
import { BentoTile } from '@/components/dashboard/overview/BentoTile';
import { useDashboardCustomization } from '@/hooks/useDashboardCustomization';
import { CustomizableGrid, CustomizationToolbar } from '@/components/dashboard/overview/CustomizableSection';
import { LiveActivityWidget } from '@/components/dashboard/overview/widgets/LiveActivityWidget';
import { SmartTasksWidget } from '@/components/dashboard/overview/widgets/SmartTasksWidget';
import { TrendsWidget } from '@/components/dashboard/overview/widgets/TrendsWidget';
import { KeyboardShortcuts } from '@/components/dashboard/overview/KeyboardShortcuts';
import { countConversationsForUser } from '@/modules/messaging';

const WIDGET_DEFAULTS = ['trends', 'activity', 'tasks', 'contracts', 'notifications', 'status', 'links'];

type UserProfile = {
  full_name?: string | null;
  ref_id?: string | null;
} | null | undefined;

export default function UserDashboardView({
  isRTL, user, profile,
}: { isRTL: boolean; user: { id: string }; profile: UserProfile }) {
  const qc = useQueryClient();

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

  const { data: recentNotifications } = useQuery({
    queryKey: ['user-recent-notifications', user?.id],
    queryFn: async () => {
      type Row = {
        id: string;
        title_ar: string | null;
        title_en: string | null;
        body_ar: string | null;
        body_en: string | null;
        notification_type: string | null;
        is_read: boolean | null;
        created_at: string;
        action_url: string | null;
      };
      const { data } = await listRecentNotificationsForUser<Row>({
        userId: user.id,
        select: 'id, title_ar, title_en, body_ar, body_en, notification_type, is_read, created_at, action_url',
        limit: 5,
      });
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

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['user-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['user-recent-notifications'] });
    qc.invalidateQueries({ queryKey: ['today-summary'] });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    qc.invalidateQueries({ queryKey: ['live-activity'] });
    qc.invalidateQueries({ queryKey: ['dashboard-trends'] });
    refetch();
  };

  const customization = useDashboardCustomization('user', WIDGET_DEFAULTS);
  const widgetLabels: Record<string, string> = {
    trends:        isRTL ? 'الاتجاهات'      : 'Trends',
    activity:      isRTL ? 'النشاط المباشر' : 'Live Activity',
    tasks:         isRTL ? 'المهام'         : 'Tasks',
    contracts:     isRTL ? 'العقود'         : 'Contracts',
    notifications: isRTL ? 'الإشعارات'      : 'Notifications',
    status:        isRTL ? 'حالة العقود'    : 'Status',
    links:         isRTL ? 'روابط سريعة'    : 'Links',
  };

  const widgetChildren: Record<string, React.ReactNode> = {
    trends:    <TrendsWidget         isRTL={isRTL} userId={user.id} />,
    activity:  <LiveActivityWidget   isRTL={isRTL} userId={user.id} />,
    tasks:     <SmartTasksWidget     isRTL={isRTL} userId={user.id} />,
    contracts: (
      <Card className="border-border/40 h-full">
        <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'أحدث العقود' : 'Recent Contracts'}</CardTitle>
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
              <FileText className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" /><p className="text-[10px]">{isRTL ? 'لا عقود بعد' : 'No contracts'}</p>
              <Link to="/search"><Button variant="outline" size="sm" className="mt-2 text-[10px] gap-1"><TrendingUp className="w-3 h-3" aria-hidden="true" />{isRTL ? 'ابحث عن مزود' : 'Find a provider'}</Button></Link>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    notifications: (
      <Card className="border-border/40 h-full">
        <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2"><Bell className="w-3.5 h-3.5 text-warning" aria-hidden="true" />{isRTL ? 'آخر الإشعارات' : 'Notifications'}</CardTitle>
          <Link to="/dashboard/notifications"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {recentNotifications?.length ? (
            <div className="space-y-1.5">
              {recentNotifications.map((n) => (
                <Link key={n.id} to={n.action_url || '/dashboard/notifications'}>
                  <div className={cn('flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors', !n.is_read && 'bg-accent/5')}>
                    <div className={cn('w-6 h-6 rounded-lg shrink-0 flex items-center justify-center', !n.is_read ? 'bg-accent/15' : 'bg-muted/50')}>
                      <Bell className={cn('w-3 h-3', !n.is_read ? 'text-accent' : 'text-muted-foreground')} aria-hidden="true" />
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
              <Bell className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" /><p className="text-[10px]">{isRTL ? 'لا إشعارات' : 'No notifications'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    status: contractStatusData.length > 0 ? (
      <Card className="border-border/40 h-full">
        <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><PieChartIcon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'حالة العقود' : 'Contract Status'}</CardTitle></CardHeader>
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
    ) : null,
    links: (
      <Card className="border-border/40 h-full">
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
            ].map((a) => <QuickAction key={a.to} {...a} />)}
          </div>
        </CardContent>
      </Card>
    ),
  };

  const itemSpan = (id: string) => (id === 'activity' || id === 'tasks' ? 'lg:col-span-1' : 'lg:col-span-1');

  return (
    <div className="space-y-5" ref={ref}>
      {/* Welcome — Emerald Prestige hero */}
      <div className="dash-hero p-5 sm:p-7">
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider dash-hero-chip rounded-full px-2.5 py-1 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--de-gold))]" aria-hidden="true" />
              {isRTL ? 'لوحة العميل' : 'Client Dashboard'}
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">
              {getTimeGreeting(isRTL)}{profile?.full_name ? `، ${profile.full_name}` : ''}
            </h1>
            <p className="dash-hero-sub text-xs sm:text-sm mt-1.5 max-w-md">
              {isRTL ? 'تتبع عقودك ورسائلك بأناقة — اضغط ؟ لعرض الاختصارات' : 'Track your contracts & messages — press ? for shortcuts'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CustomizationToolbar
              isRTL={isRTL}
              editMode={customization.editMode}
              onToggle={() => customization.setEditMode(!customization.editMode)}
              onReset={customization.reset}
            />
            <RefreshButton onClick={handleRefresh} isLoading={isFetching} isRTL={isRTL} />
            {profile?.ref_id && (
              <Badge className="dash-hero-chip tech-content text-[10px] h-6 px-2">{profile.ref_id}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OverdueAlerts isRTL={isRTL} userId={user.id} />
        <TodaySummary isRTL={isRTL} userId={user.id} />
        <MembershipWidget isRTL={isRTL} userId={user.id} />
      </div>

      {/* Bento KPI grid */}
      <div className="dash-bento">
        <BentoTile
          variant="feature"
          icon={DollarSign}
          accent="gold"
          label={isRTL ? 'إجمالي الإنفاق' : 'Total Spent'}
          value={`${animatedSpent.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`}
          sub={isRTL ? `${stats?.completedContracts ?? 0} عقد مكتمل` : `${stats?.completedContracts ?? 0} completed contracts`}
        />
        <BentoTile
          variant="wide"
          icon={FileText}
          label={isRTL ? 'العقود النشطة' : 'Active Contracts'}
          value={stats?.activeContracts ?? 0}
          sub={`${isRTL ? 'من أصل' : 'of'} ${stats?.totalContracts ?? 0}`}
          to="/dashboard/contracts"
        />
        <BentoTile
          variant="tile"
          icon={MessageSquare}
          label={isRTL ? 'المحادثات' : 'Conversations'}
          value={stats?.messages ?? 0}
          to="/dashboard/messages"
        />
        <BentoTile
          variant="tile"
          icon={Bell}
          label={isRTL ? 'إشعارات جديدة' : 'Unread'}
          value={stats?.unreadNotifications ?? 0}
          to="/dashboard/notifications"
        />
      </div>

      <CustomizableGrid
        order={customization.layout.order}
        hidden={customization.layout.hidden}
        editMode={customization.editMode}
        onReorder={customization.reorder}
        onToggleHidden={customization.toggleHidden}
        labels={widgetLabels}
        className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        itemClassName={itemSpan}
        children={widgetChildren}
      />

      <KeyboardShortcuts
        isRTL={isRTL}
        onCustomize={() => customization.setEditMode(!customization.editMode)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}