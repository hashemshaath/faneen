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
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Link } from 'react-router-dom';

const mockMonthlyData = [
  { month: 'يناير', views: 120, contracts: 2 },
  { month: 'فبراير', views: 180, contracts: 3 },
  { month: 'مارس', views: 250, contracts: 5 },
  { month: 'أبريل', views: 320, contracts: 4 },
  { month: 'مايو', views: 280, contracts: 6 },
  { month: 'يونيو', views: 450, contracts: 8 },
];

const DashboardOverview = () => {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuth();

  const isProvider = profile?.account_type === 'business' || profile?.account_type === 'company';

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [services, portfolio, reviews, contracts, warranties] = await Promise.all([
        supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', user.id),
        supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', user.id),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('business_id', user.id),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('provider_id', user.id),
        supabase.from('warranties').select('id, contract_id', { count: 'exact', head: true }),
      ]);
      return {
        services: services.count ?? 0,
        portfolio: portfolio.count ?? 0,
        reviews: reviews.count ?? 0,
        contracts: contracts.count ?? 0,
        warranties: 0,
      };
    },
    enabled: !!user && !isProvider,
  });

  // Provider gets a completely different dashboard
  if (isProvider) {
    return (
      <DashboardLayout>
        <ProviderDashboard />
      </DashboardLayout>
    );
  }

  const mainCards = [
    {
      icon: Eye, label: isRTL ? 'الزيارات الشهرية' : 'Monthly Views',
      value: '450', change: '+18%', positive: true,
      color: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
    },
    {
      icon: FileText, label: isRTL ? 'العقود النشطة' : 'Active Contracts',
      value: String(stats?.contracts ?? 0), change: '+2', positive: true,
      color: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400',
    },
    {
      icon: Star, label: isRTL ? 'متوسط التقييم' : 'Avg Rating',
      value: '5.0', change: '+0.2', positive: true,
      color: 'bg-accent/10 text-accent dark:bg-accent/20',
    },
    {
      icon: DollarSign, label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: isRTL ? '٠ ر.س' : '0 SAR', change: '', positive: true,
      color: 'bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400',
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
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
            {t('dashboard.overview')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {isRTL ? 'نظرة عامة على حسابك وأنشطتك' : 'Overview of your account and activities'}
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
          {mainCards.map((card, idx) => (
            <Card
              key={card.label}
              className="min-w-[160px] sm:min-w-0 flex-shrink-0 sm:flex-shrink border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all active:scale-[0.98]"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  {card.change && (
                    <span className={`text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
                      card.positive
                        ? 'text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/15'
                        : 'text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/15'
                    }`}>
                      {card.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {card.change}
                    </span>
                  )}
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
                <div className="w-7 h-7 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" />
                </div>
                {isRTL ? 'الزيارات الشهرية' : 'Monthly Views'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
              <div className="h-[180px] sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockMonthlyData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(42 85% 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(42 85% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, fontSize: 11,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)',
                      }}
                    />
                    <Area type="monotone" dataKey="views" stroke="hsl(42 85% 55%)" fill="url(#colorViews)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                </div>
                {isRTL ? 'العقود' : 'Contracts'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
              <div className="h-[180px] sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockMonthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, fontSize: 11,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)',
                      }}
                    />
                    <Bar dataKey="contracts" fill="hsl(270 50% 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                  <Button
                    variant="outline"
                    className="w-full h-auto py-3.5 sm:py-4 flex flex-col gap-1.5 sm:gap-2 rounded-xl border-border/50 dark:border-border/30 hover:border-accent/50 hover:bg-accent/5 dark:hover:bg-accent/10 active:scale-[0.97] transition-all"
                  >
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

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-3 md:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
          {[
            { icon: Wrench, label: isRTL ? 'الخدمات' : 'Services', value: stats?.services ?? 0, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-500/20' },
            { icon: Image, label: isRTL ? 'معرض الأعمال' : 'Portfolio', value: stats?.portfolio ?? 0, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-500/20' },
            { icon: Star, label: isRTL ? 'التقييمات' : 'Reviews', value: stats?.reviews ?? 0, color: 'text-accent', bg: 'bg-accent/10 dark:bg-accent/20' },
            { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', value: stats?.contracts ?? 0, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-500/20' },
            { icon: Shield, label: isRTL ? 'الضمانات' : 'Warranties', value: stats?.warranties ?? 0, color: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-500/20' },
          ].map((card) => (
            <Card key={card.label} className="min-w-[110px] sm:min-w-0 flex-shrink-0 sm:flex-shrink border-border/40 dark:border-border/20 dark:bg-card/80">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-foreground">{card.value}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{card.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
