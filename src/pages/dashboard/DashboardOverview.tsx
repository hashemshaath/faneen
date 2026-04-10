import React from 'react';
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
  Wrench, Image, Star, FileText, Shield, TrendingUp, Eye,
  DollarSign, Plus, Send, BarChart3, ArrowUpRight, ArrowDown, ArrowUp,
  Activity, MessageSquare, Crown, Users, Building2, Newspaper, CreditCard,
  Bookmark, FolderOpen, Bell, Clock, CheckCircle2, AlertCircle,
  ShieldAlert, Zap, CalendarDays, Hash, PieChart as PieChartIcon,
  TrendingDown, Percent, Target, Briefcase, Megaphone,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const CHART_COLORS = [
  'hsl(var(--accent))',
  'hsl(270 50% 60%)',
  'hsl(150 50% 50%)',
  'hsl(200 70% 55%)',
  'hsl(0 60% 55%)',
  'hsl(40 80% 55%)',
];

function getStatusLabel(status: string, isRTL: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    pending_approval: { ar: 'بانتظار الموافقة', en: 'Pending' },
    active: { ar: 'نشط', en: 'Active' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
    disputed: { ar: 'متنازع', en: 'Disputed' },
  };
  return map[status]?.[isRTL ? 'ar' : 'en'] ?? status;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'border-muted-foreground/30 text-muted-foreground',
    pending_approval: 'border-yellow-500/30 text-yellow-600',
    active: 'border-green-500/30 text-green-600',
    completed: 'border-blue-500/30 text-blue-600',
    cancelled: 'border-red-500/30 text-red-600',
    disputed: 'border-orange-500/30 text-orange-600',
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

const ChartTooltipStyle = {
  borderRadius: 12, fontSize: 11,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

/* ═══════════════════════════════════════════════════
   ADMIN Dashboard
   ═══════════════════════════════════════════════════ */
const AdminDashboardView = ({ isRTL }: { isRTL: boolean }) => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const [users, businesses, contracts, categories, messages, subscriptions, roles, recentUsers, recentActivity, blogPosts] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
        supabase.from('contracts').select('id, status, total_amount, created_at', { count: 'exact' }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('membership_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_roles').select('role'),
        supabase.from('profiles').select('id, full_name, avatar_url, email, account_type, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('admin_activity_log').select('id, action, entity_type, created_at, details').order('created_at', { ascending: false }).limit(8),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
      ]);

      const allContracts = contracts.data || [];
      const totalRevenue = allContracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      const activeContracts = allContracts.filter(c => c.status === 'active').length;

      // Contract status distribution
      const statusCounts: Record<string, number> = {};
      allContracts.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      // Role counts
      const roleCounts: Record<string, number> = {};
      (roles.data || []).forEach((r: any) => { roleCounts[r.role] = (roleCounts[r.role] || 0) + 1; });

      // Monthly users growth
      const monthlyUsers = buildMonthlyData(
        (recentUsers.data || []).map(u => ({ created_at: u.created_at })),
        isRTL
      );

      // Monthly contracts
      const monthlyContracts = buildMonthlyData(allContracts, isRTL);

      return {
        users: (users as any).count ?? 0,
        businesses: (businesses as any).count ?? 0,
        contracts: allContracts.length,
        activeContracts,
        totalRevenue,
        categories: (categories as any).count ?? 0,
        messages: (messages as any).count ?? 0,
        subscriptions: (subscriptions as any).count ?? 0,
        blogPosts: (blogPosts as any).count ?? 0,
        roleCounts,
        statusCounts,
        monthlyContracts,
        recentUsers: recentUsers.data || [],
        recentActivity: recentActivity.data || [],
      };
    },
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedUsers = useCountUp(stats?.users ?? 0, isVisible, 1200);
  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, isVisible, 1500);
  const animatedContracts = useCountUp(stats?.contracts ?? 0, isVisible, 1000);

  const contractStatusData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
        name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [];

  const adminCards = [
    { icon: Users, label: isRTL ? 'المستخدمين' : 'Users', value: animatedUsers, color: 'bg-blue-500/10 text-blue-500', to: '/admin/users' },
    { icon: Building2, label: isRTL ? 'المنشآت' : 'Businesses', value: stats?.businesses ?? 0, color: 'bg-green-500/10 text-green-500', to: '/admin/businesses' },
    { icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', value: `${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`, color: 'bg-emerald-500/10 text-emerald-500', to: '/dashboard/contracts' },
    { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: stats?.activeContracts ?? 0, sub: `${isRTL ? 'من' : 'of'} ${animatedContracts}`, color: 'bg-purple-500/10 text-purple-500', to: '/dashboard/contracts' },
    { icon: Crown, label: isRTL ? 'اشتراكات نشطة' : 'Active Subs', value: stats?.subscriptions ?? 0, color: 'bg-accent/10 text-accent', to: '/admin/memberships' },
    { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: stats?.messages ?? 0, color: 'bg-orange-500/10 text-orange-500', to: '/dashboard/messages' },
  ];

  return (
    <div className="space-y-6" ref={ref}>
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 dark:from-card/80 dark:to-accent/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg sm:text-xl text-foreground">
                  {isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'نظرة شاملة على النظام — مراقبة مباشرة' : 'System overview — live monitoring'}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 border-green-500/30 text-green-600">
            <Zap className="w-3 h-3" />
            {isRTL ? 'مباشر' : 'Live'}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {adminCards.map((card) => (
          <Link key={card.to + card.label} to={card.to}>
            <Card className="border-border/40 hover:shadow-md hover:border-accent/20 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-2xl font-bold"><span className="tech-content">{card.value}</span></p>
                {card.sub && <p className="text-[10px] text-muted-foreground">{card.sub}</p>}
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Contracts Chart */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              {isRTL ? 'العقود الشهرية' : 'Monthly Contracts'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyContracts || []}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={ChartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(270 50% 60%)" radius={[6, 6, 0, 0]} name={isRTL ? 'عقود' : 'Contracts'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Contract Status Pie */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-accent" />
              {isRTL ? 'توزيع حالة العقود' : 'Contract Status Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractStatusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contractStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={65} strokeWidth={0}>
                        {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {contractStatusData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-muted-foreground flex-1">{entry.name}</span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[140px] text-muted-foreground text-xs">
                {isRTL ? 'لا توجد بيانات' : 'No data yet'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity + Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              {isRTL ? 'آخر النشاطات' : 'Recent Activity'}
            </CardTitle>
            <Link to="/admin/activity-log">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">{isRTL ? 'عرض الكل' : 'View All'}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stats?.recentActivity || []).slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{item.action} — {item.entity_type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">{isRTL ? 'لا توجد نشاطات حديثة' : 'No recent activity'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              {isRTL ? 'أحدث المستخدمين' : 'Recent Users'}
            </CardTitle>
            <Link to="/admin/users">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">{isRTL ? 'عرض الكل' : 'View All'}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stats?.recentUsers || []).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent/10 text-accent text-xs font-bold">
                      {(u.full_name || '?').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{u.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">
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
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: Users, label: isRTL ? 'المستخدمين' : 'Users', to: '/admin/users' },
              { icon: Building2, label: isRTL ? 'المنشآت' : 'Businesses', to: '/admin/businesses' },
              { icon: Crown, label: isRTL ? 'العضويات' : 'Memberships', to: '/admin/memberships' },
              { icon: Newspaper, label: isRTL ? 'المدونة' : 'Blog', to: '/dashboard/blog' },
              { icon: Activity, label: isRTL ? 'سجل النشاط' : 'Activity Log', to: '/admin/activity-log' },
              { icon: ShieldAlert, label: isRTL ? 'إعدادات النظام' : 'System Settings', to: '/admin/system-settings' },
              { icon: BarChart3, label: isRTL ? 'التصنيفات' : 'Categories', to: '/admin/categories' },
              { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', to: '/dashboard/messages' },
            ].map(link => (
              <Link key={link.to} to={link.to}>
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <link.icon className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-[10px]">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Summary Row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[
          { icon: Activity, label: isRTL ? 'التصنيفات' : 'Categories', value: stats?.categories ?? 0, color: 'text-teal-500', bg: 'bg-teal-500/10' },
          { icon: Newspaper, label: isRTL ? 'المقالات' : 'Blog Posts', value: stats?.blogPosts ?? 0, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { icon: ShieldAlert, label: isRTL ? 'المشرفين' : 'Admins', value: (stats?.roleCounts?.admin ?? 0) + (stats?.roleCounts?.super_admin ?? 0), color: 'text-red-500', bg: 'bg-red-500/10' },
          { icon: FileText, label: isRTL ? 'إجمالي العقود' : 'Total Contracts', value: stats?.contracts ?? 0, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map(card => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className="tech-content text-xl font-bold">{card.value}</span>
              <span className="text-[10px] text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   PROVIDER Dashboard
   ═══════════════════════════════════════════════════ */
const ProviderDashboardView = ({ isRTL, user, profile }: { isRTL: boolean; user: any; profile: any }) => {
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const businessId = business?.id;

  const { data: stats } = useQuery({
    queryKey: ['provider-overview-stats', user?.id, businessId],
    queryFn: async () => {
      const [services, portfolio, reviews, allContracts, projects, operations, messages, promotions, warranties] = await Promise.all([
        businessId ? supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('reviews').select('id, rating', { count: 'exact' }).eq('business_id', businessId) : { count: 0, data: [] },
        supabase.from('contracts').select('id, total_amount, status, created_at', { count: 'exact' }).or(`provider_id.eq.${user.id},client_id.eq.${user.id}`),
        businessId ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        supabase.from('operations_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
        businessId ? supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('is_active', true) : { count: 0 },
        supabase.from('contracts').select('id').eq('provider_id', user.id).eq('status', 'completed'),
      ]);

      const contractsData = allContracts.data || [];
      const activeContracts = contractsData.filter(c => c.status === 'active' || c.status === 'pending_approval');
      const completedContracts = contractsData.filter(c => c.status === 'completed');
      const totalRevenue = completedContracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const reviewsData = (reviews as any).data || [];
      const avgRating = reviewsData.length > 0 ? (reviewsData.reduce((s: number, r: any) => s + r.rating, 0) / reviewsData.length).toFixed(1) : '0.0';

      const ratingDist = [0, 0, 0, 0, 0];
      reviewsData.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++; });

      const statusCounts: Record<string, number> = {};
      contractsData.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      const monthlyContracts = buildMonthlyData(contractsData, isRTL);

      // Monthly revenue
      const months = getMonths(isRTL);
      const now = new Date();
      const revenueMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        revenueMap.set(months[d.getMonth()], 0);
      }
      completedContracts.forEach(c => {
        const key = months[new Date(c.created_at).getMonth()];
        if (revenueMap.has(key)) revenueMap.set(key, (revenueMap.get(key) || 0) + Number(c.total_amount || 0));
      });

      return {
        services: (services as any).count ?? 0,
        portfolio: (portfolio as any).count ?? 0,
        reviews: reviewsData.length,
        avgRating,
        ratingDist,
        contracts: contractsData.length,
        activeContracts: activeContracts.length,
        completedContracts: completedContracts.length,
        totalRevenue,
        projects: (projects as any).count ?? 0,
        operations: (operations as any).count ?? 0,
        messages: (messages as any).count ?? 0,
        promotions: (promotions as any).count ?? 0,
        statusCounts,
        monthlyContracts,
        monthlyRevenue: Array.from(revenueMap.entries()).map(([month, revenue]) => ({ month, revenue })),
      };
    },
    enabled: !!user,
  });

  // Recent contracts
  const { data: recentContracts } = useQuery({
    queryKey: ['provider-recent-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at')
        .eq('provider_id', user.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  // Recent reviews
  const { data: recentReviews } = useQuery({
    queryKey: ['provider-recent-reviews-overview', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase.from('reviews').select('id, rating, content, created_at')
        .eq('business_id', businessId).order('created_at', { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!businessId,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, isVisible, 1500);
  const animatedContracts = useCountUp(stats?.contracts ?? 0, isVisible, 1200);

  const contractStatusData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
        name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [];

  const completionRate = stats?.contracts ? Math.round((stats.completedContracts / stats.contracts) * 100) : 0;

  return (
    <div className="space-y-6" ref={ref}>
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 dark:from-card/80 dark:to-accent/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
              {business?.logo_url ? (
                <img src={business.logo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-accent" />
              )}
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg sm:text-xl text-foreground flex items-center gap-2">
                {isRTL ? 'لوحة مزود الخدمة' : 'Provider Dashboard'}
            {business?.is_verified && (
              <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-0">
                <CheckCircle2 className="w-3 h-3 me-1" />{isRTL ? 'موثق' : 'Verified'}
              </Badge>
            )}
          </h1>
              <p className="text-xs text-muted-foreground">
                {isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}
                {business && <> — {isRTL ? business.name_ar : (business.name_en || business.name_ar)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          {profile?.ref_id && <Badge variant="outline" className="text-xs">{profile.ref_id}</Badge>}
          {business?.membership_tier && (
            <Badge className="bg-accent/10 text-accent border-accent/30">
              {business.membership_tier === 'free' ? (isRTL ? 'مجاني' : 'Free') :
               business.membership_tier === 'basic' ? (isRTL ? 'أساسي' : 'Basic') :
               business.membership_tier === 'premium' ? (isRTL ? 'بريميوم' : 'Premium') : (isRTL ? 'مؤسسات' : 'Enterprise')}
            </Badge>
          )}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', value: `${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`, color: 'bg-green-500/10 text-green-500' },
          { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: stats?.activeContracts ?? 0, sub: `${isRTL ? 'من' : 'of'} ${animatedContracts}`, color: 'bg-purple-500/10 text-purple-500' },
          { icon: Star, label: isRTL ? 'التقييم العام' : 'Overall Rating', value: stats?.avgRating ?? '0.0', sub: `${stats?.reviews ?? 0} ${isRTL ? 'تقييم' : 'reviews'}`, color: 'bg-accent/10 text-accent' },
          { icon: Target, label: isRTL ? 'معدل الإنجاز' : 'Completion Rate', value: `${completionRate}%`, sub: `${stats?.completedContracts ?? 0} ${isRTL ? 'مكتمل' : 'completed'}`, color: 'bg-blue-500/10 text-blue-500' },
        ].map((card) => (
          <Card key={card.label} className="border-border/40 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-2.5`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-xl sm:text-2xl font-bold leading-none"><span className="tech-content">{card.value}</span></p>
              {card.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>}
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="border-border/40 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              {isRTL ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyRevenue || []}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(150 50% 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(150 50% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={ChartTooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(150 50% 50%)" fill="url(#revenueGrad)" strokeWidth={2} name={isRTL ? 'إيرادات' : 'Revenue'} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-accent" />
              {isRTL ? 'توزيع التقييمات' : 'Rating Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats?.ratingDist?.[star - 1] ?? 0;
              const total = stats?.reviews ?? 1;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted-foreground font-medium">{star}</span>
                  <Star className="w-3 h-3 text-accent fill-accent" />
                  <Progress value={pct} className="flex-1 h-2" />
                  <span className="w-6 text-end text-muted-foreground text-[10px]">{count}</span>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="text-center">
              <span className="tech-content text-3xl font-bold text-accent">{stats?.avgRating ?? '0.0'}</span>
              <p className="text-[10px] text-muted-foreground">{stats?.reviews ?? 0} {isRTL ? 'تقييم' : 'reviews'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Status + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contract Status Pie + Monthly Contracts */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              {isRTL ? 'حالة العقود' : 'Contract Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractStatusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[130px] h-[130px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contractStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={60} strokeWidth={0}>
                        {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {contractStatusData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-muted-foreground flex-1">{entry.name}</span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[130px] text-muted-foreground text-xs">
                {isRTL ? 'لا توجد عقود بعد' : 'No contracts yet'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Contracts */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              {isRTL ? 'أحدث العقود' : 'Recent Contracts'}
            </CardTitle>
            <Link to="/dashboard/contracts">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">{isRTL ? 'الكل' : 'All'}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentContracts && recentContracts.length > 0 ? (
              <div className="space-y-2">
                {recentContracts.map(c => (
                  <Link key={c.id} to={`/contracts/${c.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{isRTL ? c.title_ar : (c.title_en || c.title_ar)}</p>
                        <p className="tech-content text-[10px] text-muted-foreground">{c.contract_number}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] ${getStatusColor(c.status)}`}>
                          {getStatusLabel(c.status, isRTL)}
                        </Badge>
                        <span className="tech-content text-xs font-semibold whitespace-nowrap">
                          {Number(c.total_amount).toLocaleString()} {c.currency_code}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">{isRTL ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reviews + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Reviews */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-accent" />
              {isRTL ? 'أحدث التقييمات' : 'Recent Reviews'}
            </CardTitle>
            <Link to="/dashboard/reviews">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">{isRTL ? 'الكل' : 'All'}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReviews && recentReviews.length > 0 ? (
              <div className="space-y-2">
                {recentReviews.map(review => (
                  <div key={review.id} className="p-2.5 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground ms-auto">
                        {new Date(review.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {review.content && <p className="text-xs text-muted-foreground line-clamp-2">{review.content}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Star className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">{isRTL ? 'لا توجد تقييمات' : 'No reviews yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Plus, label: isRTL ? 'إضافة خدمة' : 'Add Service', to: '/dashboard/services' },
                { icon: Image, label: isRTL ? 'رفع مشروع' : 'Upload Project', to: '/dashboard/projects' },
                { icon: Send, label: isRTL ? 'إنشاء عرض' : 'Create Offer', to: '/dashboard/promotions' },
                { icon: MessageSquare, label: isRTL ? 'الرسائل' : 'Messages', to: '/dashboard/messages' },
                { icon: FileText, label: isRTL ? 'إدارة العقود' : 'Contracts', to: '/dashboard/contracts' },
                { icon: Crown, label: isRTL ? 'العضوية' : 'Membership', to: '/membership' },
              ].map(action => (
                <Link key={action.to} to={action.to}>
                  <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <action.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-[10px]">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { icon: Wrench, label: isRTL ? 'خدمات' : 'Services', value: stats?.services ?? 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Image, label: isRTL ? 'معرض' : 'Portfolio', value: stats?.portfolio ?? 0, color: 'text-green-500', bg: 'bg-green-500/10' },
          { icon: FolderOpen, label: isRTL ? 'مشاريع' : 'Projects', value: stats?.projects ?? 0, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { icon: Megaphone, label: isRTL ? 'عروض' : 'Promos', value: stats?.promotions ?? 0, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { icon: MessageSquare, label: isRTL ? 'محادثات' : 'Chats', value: stats?.messages ?? 0, color: 'text-teal-500', bg: 'bg-teal-500/10' },
          { icon: Activity, label: isRTL ? 'عمليات' : 'Operations', value: stats?.operations ?? 0, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map(card => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className="tech-content text-lg font-bold">{card.value}</span>
              <span className="text-[10px] text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   USER Dashboard
   ═══════════════════════════════════════════════════ */
const UserDashboardView = ({ isRTL, user, profile }: { isRTL: boolean; user: any; profile: any }) => {
  const { data: stats } = useQuery({
    queryKey: ['user-overview-stats', user?.id],
    queryFn: async () => {
      const [contracts, messages, bookmarks, notifications, recentContracts] = await Promise.all([
        supabase.from('contracts').select('id, status, total_amount, created_at', { count: 'exact' }).eq('client_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
        supabase.from('blog_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('contracts').select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at')
          .eq('client_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const allContracts = contracts.data || [];
      const activeContracts = allContracts.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
      const completedContracts = allContracts.filter(c => c.status === 'completed');
      const totalSpent = completedContracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const statusCounts: Record<string, number> = {};
      allContracts.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      return {
        totalContracts: allContracts.length,
        activeContracts: activeContracts.length,
        completedContracts: completedContracts.length,
        totalSpent,
        messages: (messages as any).count ?? 0,
        bookmarks: (bookmarks as any).count ?? 0,
        unreadNotifications: (notifications as any).count ?? 0,
        recentContracts: recentContracts.data || [],
        statusCounts,
      };
    },
    enabled: !!user,
  });

  // Recent notifications
  const { data: recentNotifications } = useQuery({
    queryKey: ['user-recent-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('id, title_ar, title_en, body_ar, body_en, notification_type, is_read, created_at, action_url')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedSpent = useCountUp(stats?.totalSpent ?? 0, isVisible, 1500);

  const contractStatusData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
        name: getStatusLabel(name, isRTL), value, color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [];

  return (
    <div className="space-y-6" ref={ref}>
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-accent/5 p-5 sm:p-6 dark:from-card/80 dark:to-accent/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-lg sm:text-xl text-foreground">
              {isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? 'لوحة التحكم الخاصة بك — تتبع عقودك ورسائلك' : 'Your personal dashboard — track contracts & messages'}
            </p>
          </div>
          {profile?.ref_id && <Badge variant="outline" className="tech-content text-xs">{profile.ref_id}</Badge>}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: stats?.activeContracts ?? 0, sub: `${isRTL ? 'من' : 'of'} ${stats?.totalContracts ?? 0}`, color: 'bg-purple-500/10 text-purple-500' },
          { icon: DollarSign, label: isRTL ? 'إجمالي الإنفاق' : 'Total Spent', value: `${animatedSpent.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`, color: 'bg-green-500/10 text-green-500' },
          { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: stats?.messages ?? 0, color: 'bg-blue-500/10 text-blue-500' },
          { icon: Bell, label: isRTL ? 'إشعارات جديدة' : 'New Notifications', value: stats?.unreadNotifications ?? 0, color: 'bg-orange-500/10 text-orange-500' },
        ].map((card) => (
          <Card key={card.label} className="border-border/40 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-2.5`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-xl sm:text-2xl font-bold leading-none"><span className="tech-content">{card.value}</span></p>
              {card.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>}
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contracts + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Contracts */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              {isRTL ? 'أحدث العقود' : 'Recent Contracts'}
            </CardTitle>
            <Link to="/dashboard/contracts">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">{isRTL ? 'الكل' : 'All'}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentContracts && stats.recentContracts.length > 0 ? (
              <div className="space-y-2">
                {stats.recentContracts.map((c: any) => (
                  <Link key={c.id} to={`/contracts/${c.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{isRTL ? c.title_ar : (c.title_en || c.title_ar)}</p>
                        <p className="tech-content text-[10px] text-muted-foreground">{c.contract_number}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] ${getStatusColor(c.status)}`}>
                          {getStatusLabel(c.status, isRTL)}
                        </Badge>
                        <span className="tech-content text-xs font-semibold whitespace-nowrap">
                          {Number(c.total_amount).toLocaleString()} {c.currency_code}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-xs">{isRTL ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
                <Link to="/search">
                  <Button variant="outline" size="sm" className="mt-3 text-xs gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {isRTL ? 'ابحث عن مزود خدمة' : 'Find a provider'}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              {isRTL ? 'آخر الإشعارات' : 'Recent Notifications'}
            </CardTitle>
            <Link to="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">{isRTL ? 'الكل' : 'All'}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentNotifications && recentNotifications.length > 0 ? (
              <div className="space-y-2">
                {recentNotifications.map(n => (
                  <Link key={n.id} to={n.action_url || '/dashboard/notifications'}>
                    <div className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-accent/5' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${!n.is_read ? 'bg-accent/15' : 'bg-muted/50'}`}>
                        <Bell className={`w-3.5 h-3.5 ${!n.is_read ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${!n.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                          {isRTL ? n.title_ar : (n.title_en || n.title_ar)}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {isRTL ? n.body_ar : (n.body_en || n.body_ar)}
                        </p>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-xs">{isRTL ? 'لا توجد إشعارات' : 'No notifications'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contract Status + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contract Status */}
        {contractStatusData.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-500" />
                {isRTL ? 'حالة العقود' : 'Contract Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-[120px] h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contractStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={0}>
                        {contractStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {contractStatusData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-muted-foreground flex-1">{entry.name}</span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isRTL ? 'روابط سريعة' : 'Quick Links'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', to: '/dashboard/contracts' },
                { icon: MessageSquare, label: isRTL ? 'الرسائل' : 'Messages', to: '/dashboard/messages' },
                { icon: Bookmark, label: isRTL ? 'المفضلة' : 'Bookmarks', to: '/dashboard/bookmarks' },
                  { icon: CreditCard, label: isRTL ? 'الأقساط' : 'Installments', to: '/dashboard/installments' },
                  { icon: Bell, label: isRTL ? 'الإشعارات' : 'Notifications', to: '/dashboard/notifications' },
                { icon: TrendingUp, label: isRTL ? 'البحث' : 'Find Providers', to: '/search' },
              ].map(link => (
                <Link key={link.to} to={link.to}>
                  <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <link.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-[10px]">{link.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

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
