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
  DollarSign, Plus, Send, BarChart3, ArrowUpRight, ArrowDownRight,
  Activity, MessageSquare, Crown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const DashboardOverview = () => {
  const { t, isRTL } = useLanguage();
  const { user, profile, isAdmin } = useAuth();

  const isProvider = profile?.account_type === 'business' || profile?.account_type === 'company';

  // Fetch user's business
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const businessId = business?.id;

  // Real stats based on actual business_id
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id, businessId],
    queryFn: async () => {
      if (!user) return null;
      const bid = businessId;
      const [services, portfolio, reviews, contractsProvider, contractsClient, operations, messages] = await Promise.all([
        bid ? supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', bid) : { count: 0 },
        bid ? supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', bid) : { count: 0 },
        bid ? supabase.from('reviews').select('id, rating', { count: 'exact' }).eq('business_id', bid) : { count: 0, data: [] },
        supabase.from('contracts').select('id, total_amount, status, created_at', { count: 'exact' }).eq('provider_id', user.id),
        supabase.from('contracts').select('id, total_amount, status, created_at', { count: 'exact' }).eq('client_id', user.id),
        supabase.from('operations_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
      ]);

      const allContracts = [...(contractsProvider.data || []), ...(contractsClient.data || [])];
      const activeContracts = allContracts.filter(c => c.status === 'active' || c.status === 'in_progress');
      const totalRevenue = allContracts.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      
      const reviewsData = (reviews as any).data || [];
      const avgRating = reviewsData.length > 0 ? (reviewsData.reduce((s: number, r: any) => s + r.rating, 0) / reviewsData.length).toFixed(1) : '0.0';

      // Monthly chart data from contracts
      const monthlyMap = new Map<string, { views: number; contracts: number }>();
      const months = isRTL 
        ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = months[d.getMonth()];
        monthlyMap.set(key, { views: 0, contracts: 0 });
      }
      
      allContracts.forEach(c => {
        const d = new Date(c.created_at);
        const key = months[d.getMonth()];
        if (monthlyMap.has(key)) {
          const entry = monthlyMap.get(key)!;
          entry.contracts += 1;
        }
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
        monthlyData: Array.from(monthlyMap.entries()).map(([month, d]) => ({ month, ...d })),
      };
    },
    enabled: !!user,
  });

  if (isProvider) {
    return <DashboardLayout><ProviderDashboard /></DashboardLayout>;
  }

  const mainCards = [
    {
      icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts',
      value: String(stats?.activeContracts ?? 0),
      color: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400',
    },
    {
      icon: Star, label: isRTL ? 'متوسط التقييم' : 'Avg Rating',
      value: stats?.avgRating ?? '0.0',
      color: 'bg-accent/10 text-accent dark:bg-accent/20',
    },
    {
      icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}` : (isRTL ? '٠ ر.س' : '0 SAR'),
      color: 'bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400',
    },
    {
      icon: MessageSquare, label: isRTL ? 'المحادثات' : 'Conversations',
      value: String(stats?.messages ?? 0),
      color: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
    },
  ];

  const quickActions = [
    { icon: Plus, label: isRTL ? 'إضافة خدمة' : 'Add Service', to: '/dashboard/services' },
    { icon: Image, label: isRTL ? 'رفع مشروع' : 'Upload Project', to: '/dashboard/projects' },
    { icon: Send, label: isRTL ? 'إنشاء عرض' : 'Create Offer', to: '/dashboard/promotions' },
    { icon: BarChart3, label: isRTL ? 'إدارة العقود' : 'Manage Contracts', to: '/dashboard/contracts' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
              {t('dashboard.overview')}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {isRTL ? `مرحباً ${profile?.full_name || ''}` : `Welcome ${profile?.full_name || ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.ref_id && (
              <Badge variant="outline" className="text-xs">{profile.ref_id}</Badge>
            )}
            {business?.ref_id && (
              <Badge className="bg-accent/10 text-accent text-xs">{business.ref_id}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
          {mainCards.map((card, idx) => (
            <Card key={card.label} className="min-w-[160px] sm:min-w-0 flex-shrink-0 sm:flex-shrink border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm hover:shadow-md transition-all" style={{ animationDelay: `${idx * 0.06}s` }}>
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{card.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5 truncate">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card className="border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                </div>
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

          <Card className="border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                </div>
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

        <Card className="border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {quickActions.map(action => (
                <Link key={action.to} to={action.to}>
                  <Button variant="outline" className="w-full h-auto py-3.5 sm:py-4 flex flex-col gap-1.5 sm:gap-2 rounded-xl border-border/50 dark:border-border/30 hover:border-accent/50 hover:bg-accent/5 dark:hover:bg-accent/10 active:scale-[0.97] transition-all">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
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
    </DashboardLayout>
  );
};

export default DashboardOverview;
