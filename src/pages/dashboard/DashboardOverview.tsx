import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProviderDashboard } from '@/components/dashboard/ProviderDashboard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wrench, Image, Star, FileText, Shield, TrendingUp, Eye,
  DollarSign, Plus, Send, BarChart3, ArrowUpRight,
  Activity, MessageSquare, Crown, Users, Building2, Newspaper,
  Bookmark, FolderOpen, Bell,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

/* ═══════════════════════════════════════════════════
   Admin Dashboard
   ═══════════════════════════════════════════════════ */
const AdminDashboardView = ({ isRTL }: { isRTL: boolean }) => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const [users, businesses, contracts, categories, messages, subscriptions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
        supabase.from('contracts').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('membership_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      return {
        users: (users as any).count ?? 0,
        businesses: (businesses as any).count ?? 0,
        contracts: (contracts as any).count ?? 0,
        categories: (categories as any).count ?? 0,
        messages: (messages as any).count ?? 0,
        subscriptions: (subscriptions as any).count ?? 0,
      };
    },
  });

  const adminCards = [
    { icon: Users, label: isRTL ? 'المستخدمين' : 'Users', value: stats?.users ?? 0, color: 'bg-blue-500/10 text-blue-500', to: '/admin/users' },
    { icon: Building2, label: isRTL ? 'المنشآت' : 'Businesses', value: stats?.businesses ?? 0, color: 'bg-green-500/10 text-green-500', to: '/admin/businesses' },
    { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', value: stats?.contracts ?? 0, color: 'bg-purple-500/10 text-purple-500', to: '/dashboard/contracts' },
    { icon: Crown, label: isRTL ? 'الاشتراكات النشطة' : 'Active Subscriptions', value: stats?.subscriptions ?? 0, color: 'bg-accent/10 text-accent', to: '/admin/memberships' },
    { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: stats?.messages ?? 0, color: 'bg-orange-500/10 text-orange-500', to: '/dashboard/messages' },
    { icon: Activity, label: isRTL ? 'التصنيفات' : 'Categories', value: stats?.categories ?? 0, color: 'bg-teal-500/10 text-teal-500', to: '/admin/categories' },
  ];

  const quickLinks = [
    { icon: Users, label: isRTL ? 'إدارة المستخدمين' : 'Manage Users', to: '/admin/users' },
    { icon: Building2, label: isRTL ? 'إدارة المنشآت' : 'Manage Businesses', to: '/admin/businesses' },
    { icon: Crown, label: isRTL ? 'إدارة العضويات' : 'Manage Memberships', to: '/admin/memberships' },
    { icon: Newspaper, label: isRTL ? 'إدارة المدونة' : 'Manage Blog', to: '/dashboard/blog' },
    { icon: Activity, label: isRTL ? 'سجل النشاط' : 'Activity Log', to: '/admin/activity-log' },
    { icon: Shield, label: isRTL ? 'إعدادات النظام' : 'System Settings', to: '/admin/system-settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {adminCards.map((card) => (
          <Link key={card.to} to={card.to}>
            <Card className="border-border/40 dark:border-border/20 dark:bg-card/80 hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-border/40 dark:border-border/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickLinks.map(link => (
              <Link key={link.to} to={link.to}>
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <link.icon className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xs">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Provider Dashboard
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
    queryKey: ['provider-stats', user?.id, businessId],
    queryFn: async () => {
      const [services, portfolio, reviews, contracts, operations, messages] = await Promise.all([
        businessId ? supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('reviews').select('id, rating', { count: 'exact' }).eq('business_id', businessId) : { count: 0, data: [] },
        supabase.from('contracts').select('id, total_amount, status, created_at', { count: 'exact' }).or(`provider_id.eq.${user.id},client_id.eq.${user.id}`),
        supabase.from('operations_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
      ]);

      const allContracts = contracts.data || [];
      const activeContracts = allContracts.filter(c => c.status === 'pending_approval' || c.status === 'draft' || c.status === 'active');
      const totalRevenue = allContracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const reviewsData = (reviews as any).data || [];
      const avgRating = reviewsData.length > 0 ? (reviewsData.reduce((s: number, r: any) => s + r.rating, 0) / reviewsData.length).toFixed(1) : '0.0';

      // Monthly chart data
      const months = isRTL
        ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthlyMap = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyMap.set(months[d.getMonth()], 0);
      }
      allContracts.forEach(c => {
        const key = months[new Date(c.created_at).getMonth()];
        if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      });

      return {
        services: (services as any).count ?? 0,
        portfolio: (portfolio as any).count ?? 0,
        reviews: reviewsData.length,
        avgRating,
        contracts: allContracts.length,
        activeContracts: activeContracts.length,
        totalRevenue,
        operations: (operations as any).count ?? 0,
        messages: (messages as any).count ?? 0,
        monthlyData: Array.from(monthlyMap.entries()).map(([month, contracts]) => ({ month, contracts })),
      };
    },
    enabled: !!user,
  });

  const mainCards = [
    { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: String(stats?.activeContracts ?? 0), color: 'bg-purple-500/10 text-purple-500' },
    { icon: Star, label: isRTL ? 'متوسط التقييم' : 'Avg Rating', value: stats?.avgRating ?? '0.0', color: 'bg-accent/10 text-accent' },
    { icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', value: stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}` : (isRTL ? '٠ ر.س' : '0 SAR'), color: 'bg-green-500/10 text-green-500' },
    { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: String(stats?.messages ?? 0), color: 'bg-blue-500/10 text-blue-500' },
  ];

  const quickActions = [
    { icon: Plus, label: isRTL ? 'إضافة خدمة' : 'Add Service', to: '/dashboard/services' },
    { icon: Image, label: isRTL ? 'رفع مشروع' : 'Upload Project', to: '/dashboard/projects' },
    { icon: Send, label: isRTL ? 'إنشاء عرض' : 'Create Offer', to: '/dashboard/promotions' },
    { icon: BarChart3, label: isRTL ? 'إدارة العقود' : 'Manage Contracts', to: '/dashboard/contracts' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
            {isRTL ? 'نظرة عامة' : 'Overview'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.ref_id && <Badge variant="outline" className="text-xs">{profile.ref_id}</Badge>}
          {business?.ref_id && <Badge className="bg-accent/10 text-accent text-xs">{business.ref_id}</Badge>}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
        {mainCards.map((card, idx) => (
          <Card key={card.label} className="min-w-[160px] sm:min-w-0 flex-shrink-0 sm:flex-shrink border-border/40 dark:border-border/20 dark:bg-card/80 hover:shadow-md transition-all">
            <CardContent className="p-3.5 sm:p-4">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.color} flex items-center justify-center mb-2.5`}>
                <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{card.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="border-border/40 dark:border-border/20">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              {isRTL ? 'العقود الشهرية' : 'Monthly Contracts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
            <div className="h-[180px] sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyData || []}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="contracts" fill="hsl(270 50% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 dark:border-border/20">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-accent" />
              {isRTL ? 'ملخص الحساب' : 'Account Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Wrench, label: isRTL ? 'الخدمات' : 'Services', value: stats?.services ?? 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { icon: Image, label: isRTL ? 'معرض الأعمال' : 'Portfolio', value: stats?.portfolio ?? 0, color: 'text-green-500', bg: 'bg-green-500/10' },
                { icon: Star, label: isRTL ? 'التقييمات' : 'Reviews', value: stats?.reviews ?? 0, color: 'text-accent', bg: 'bg-accent/10' },
                { icon: Activity, label: isRTL ? 'العمليات' : 'Operations', value: stats?.operations ?? 0, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 dark:border-border/20">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {quickActions.map(action => (
              <Link key={action.to} to={action.to}>
                <Button variant="outline" className="w-full h-auto py-3.5 sm:py-4 flex flex-col gap-1.5 sm:gap-2 rounded-xl border-border/50 hover:border-accent/50 hover:bg-accent/5 active:scale-[0.97] transition-all">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-body">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Regular User Dashboard
   ═══════════════════════════════════════════════════ */
const UserDashboardView = ({ isRTL, user, profile }: { isRTL: boolean; user: any; profile: any }) => {
  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      const [contracts, messages, bookmarks, notifications] = await Promise.all([
        supabase.from('contracts').select('id, status, total_amount', { count: 'exact' }).eq('client_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
        supabase.from('blog_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
      ]);

      const allContracts = contracts.data || [];
      const activeContracts = allContracts.filter(c => c.status !== 'completed' && c.status !== 'cancelled');

      return {
        totalContracts: allContracts.length,
        activeContracts: activeContracts.length,
        messages: (messages as any).count ?? 0,
        bookmarks: (bookmarks as any).count ?? 0,
        unreadNotifications: (notifications as any).count ?? 0,
      };
    },
    enabled: !!user,
  });

  const userCards = [
    { icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts', value: String(stats?.activeContracts ?? 0), color: 'bg-purple-500/10 text-purple-500' },
    { icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations', value: String(stats?.messages ?? 0), color: 'bg-blue-500/10 text-blue-500' },
    { icon: Bookmark, label: isRTL ? 'المقالات المحفوظة' : 'Saved Articles', value: String(stats?.bookmarks ?? 0), color: 'bg-accent/10 text-accent' },
    { icon: Bell, label: isRTL ? 'إشعارات جديدة' : 'New Notifications', value: String(stats?.unreadNotifications ?? 0), color: 'bg-orange-500/10 text-orange-500' },
  ];

  const quickLinks = [
    { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', to: '/dashboard/contracts' },
    { icon: MessageSquare, label: isRTL ? 'الرسائل' : 'Messages', to: '/dashboard/messages' },
    { icon: Bookmark, label: isRTL ? 'المفضلة' : 'Bookmarks', to: '/dashboard/bookmarks' },
    { icon: FolderOpen, label: isRTL ? 'تصفح المشاريع' : 'Browse Projects', to: '/projects' },
    { icon: Newspaper, label: isRTL ? 'المدونة' : 'Blog', to: '/blog' },
    { icon: TrendingUp, label: isRTL ? 'البحث عن مزودين' : 'Find Providers', to: '/search' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-xl sm:text-2xl">
          {isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {isRTL ? 'لوحة التحكم الخاصة بك' : 'Your personal dashboard'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {userCards.map((card) => (
          <Card key={card.label} className="border-border/40 dark:border-border/20 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 dark:border-border/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isRTL ? 'روابط سريعة' : 'Quick Links'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickLinks.map(link => (
              <Link key={link.to} to={link.to}>
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl hover:border-accent/50 hover:bg-accent/5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <link.icon className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xs">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Main Component - Route by role
   ═══════════════════════════════════════════════════ */
const DashboardOverview = () => {
  const { isRTL } = useLanguage();
  const { user, profile, isAdmin } = useAuth();

  const isProvider = profile?.account_type === 'provider';

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
