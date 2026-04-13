import React, { lazy, Suspense } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wrench, Image, Star, FileText, Shield, TrendingUp, Eye,
  DollarSign, Plus, Send, BarChart3, ArrowUpRight, ArrowDownRight,
  FolderOpen, Users, Clock, CheckCircle2, AlertCircle, MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const LazyRecharts = lazy(() => import('recharts').then(m => ({ default: () => null })));
// We import recharts components dynamically in the chart rendering sections
let rechartsModule: typeof import('recharts') | null = null;
const getRechartsModule = () => import('recharts').then(m => { rechartsModule = m; return m; });

const CHART_COLORS = [
  'hsl(42 85% 55%)',
  'hsl(270 50% 60%)',
  'hsl(150 50% 50%)',
  'hsl(200 70% 55%)',
  'hsl(0 60% 55%)',
];

export const ProviderDashboard: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  // Fetch business for this user
  const { data: business } = useQuery({
    queryKey: ['provider-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en, rating_avg, rating_count, membership_tier, is_verified')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch all stats in parallel
  const { data: stats } = useQuery({
    queryKey: ['provider-stats', business?.id, user?.id],
    queryFn: async () => {
      if (!business || !user) return null;
      const bId = business.id;
      const [services, portfolio, reviews, activeContracts, allContracts, projects, warranties, unreadMsgs] = await Promise.all([
        supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', bId).eq('is_active', true),
        supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', bId),
        supabase.from('reviews').select('id, rating').eq('business_id', bId),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('provider_id', user.id).eq('status', 'active'),
        supabase.from('contracts').select('id, status, total_amount, created_at').eq('provider_id', user.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('business_id', bId),
        supabase.from('warranties').select('id, status, contract_id').then(res => {
          // Filter warranties linked to provider's contracts
          return res;
        }),
        supabase.from('conversations').select('id').or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
      ]);

      const contractsData = allContracts.data || [];
      const totalRevenue = contractsData
        .filter(c => c.status === 'completed' || c.status === 'active')
        .reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);

      const reviewsData = reviews.data || [];
      const ratingDist = [0, 0, 0, 0, 0];
      reviewsData.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++;
      });

      // Contract status distribution
      const statusCounts: Record<string, number> = {};
      contractsData.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      });

      return {
        services: services.count ?? 0,
        portfolio: portfolio.count ?? 0,
        reviewsCount: reviewsData.length,
        activeContracts: activeContracts.count ?? 0,
        totalContracts: contractsData.length,
        projects: projects.count ?? 0,
        totalRevenue,
        ratingDist,
        statusCounts,
        conversations: unreadMsgs.data?.length ?? 0,
      };
    },
    enabled: !!business && !!user,
  });

  // Fetch recent reviews
  const { data: recentReviews } = useQuery({
    queryKey: ['provider-recent-reviews', business?.id],
    queryFn: async () => {
      if (!business) return [];
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, content, title, created_at, user_id')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!business,
  });

  // Fetch recent contracts
  const { data: recentContracts } = useQuery({
    queryKey: ['provider-recent-contracts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('contracts')
        .select('id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation(0.1);

  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, statsVisible, 1500);
  const animatedContracts = useCountUp(stats?.totalContracts ?? 0, statsVisible, 1200);
  const animatedReviews = useCountUp(stats?.reviewsCount ?? 0, statsVisible, 1000);
  const animatedProjects = useCountUp(stats?.projects ?? 0, statsVisible, 800);

  const contractStatusData = stats?.statusCounts
    ? Object.entries(stats.statusCounts).map(([name, value], i) => ({
        name: getStatusLabel(name, isRTL),
        value,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [];

  const mainCards = [
    {
      icon: DollarSign,
      label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: animatedRevenue + (isRTL ? ' ر.س' : ' SAR'),
      color: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    },
    {
      icon: FileText,
      label: isRTL ? 'العقود النشطة' : 'Active Contracts',
      value: String(stats?.activeContracts ?? 0),
      subLabel: `${isRTL ? 'من' : 'of'} ${animatedContracts}`,
      color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    },
    {
      icon: Star,
      label: isRTL ? 'التقييم العام' : 'Overall Rating',
      value: business?.rating_avg?.toFixed(1) ?? '0.0',
      subLabel: `${animatedReviews} ${isRTL ? 'تقييم' : 'reviews'}`,
      color: 'bg-accent/10 text-accent dark:bg-accent/20',
    },
    {
      icon: FolderOpen,
      label: isRTL ? 'المشاريع المنجزة' : 'Projects',
      value: animatedProjects,
      color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    },
  ];

  const quickActions = [
    { icon: Plus, label: isRTL ? 'إضافة خدمة' : 'Add Service', to: '/dashboard/services' },
    { icon: Image, label: isRTL ? 'رفع مشروع' : 'Upload Project', to: '/dashboard/projects' },
    { icon: Send, label: isRTL ? 'إنشاء عرض' : 'Create Offer', to: '/dashboard/promotions' },
    { icon: MessageSquare, label: isRTL ? 'الرسائل' : 'Messages', to: '/dashboard/messages' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6" ref={statsRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground flex items-center gap-2">
            {isRTL ? 'لوحة مزود الخدمة' : 'Provider Dashboard'}
            {business?.is_verified && (
              <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-0">
                <CheckCircle2 className="w-3 h-3 me-1" />
                {isRTL ? 'موثق' : 'Verified'}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {business
              ? (isRTL ? business.name_ar : (business.name_en || business.name_ar))
              : (isRTL ? 'أنشئ صفحة أعمالك للبدء' : 'Create your business page to get started')}
          </p>
        </div>
        {business?.membership_tier && (
          <Badge className="self-start sm:self-auto bg-accent/10 text-accent border-accent/30 hover:bg-accent/20">
            {business.membership_tier === 'free' ? (isRTL ? 'مجاني' : 'Free') :
             business.membership_tier === 'basic' ? (isRTL ? 'أساسي' : 'Basic') :
             business.membership_tier === 'premium' ? (isRTL ? 'بريميوم' : 'Premium') :
             (isRTL ? 'مؤسسات' : 'Enterprise')}
          </Badge>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {mainCards.map((card, idx) => (
          <Card
            key={card.label}
            className="border-border/40 dark:border-border/20 dark:bg-card/80 backdrop-blur-sm hover:shadow-md transition-all"
            style={{ animationDelay: `${idx * 0.06}s` }}
          >
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground leading-none">{card.value}</p>
              {card.subLabel && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.subLabel}</p>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Rating Distribution */}
        <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-accent" />
              </div>
              {isRTL ? 'توزيع التقييمات' : 'Rating Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-2.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats?.ratingDist?.[star - 1] ?? 0;
              const total = stats?.reviewsCount ?? 1;
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
          </CardContent>
        </Card>

        {/* Contract Status Pie */}
        <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              </div>
              {isRTL ? 'حالة العقود' : 'Contract Status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {contractStatusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[120px] h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contractStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={0}>
                        {contractStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 text-[10px] sm:text-xs flex-1">
                  {contractStatusData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold text-foreground ms-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
                {isRTL ? 'لا توجد عقود بعد' : 'No contracts yet'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => (
                <Link key={action.to} to={action.to}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-3 flex flex-col gap-1.5 rounded-xl border-border/50 dark:border-border/30 hover:border-accent/50 hover:bg-accent/5 dark:hover:bg-accent/10 active:scale-[0.97] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                      <action.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-[10px] font-body">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Recent Contracts */}
        <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              </div>
              {isRTL ? 'أحدث العقود' : 'Recent Contracts'}
            </CardTitle>
            <Link to="/dashboard/contracts">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">
                {isRTL ? 'عرض الكل' : 'View All'}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {recentContracts && recentContracts.length > 0 ? (
              <div className="space-y-2">
                {recentContracts.map(contract => (
                  <Link key={contract.id} to={`/contracts/${contract.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                          {isRTL ? contract.title_ar : (contract.title_en || contract.title_ar)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{contract.contract_number}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] ${getStatusColor(contract.status)}`}>
                          {getStatusLabel(contract.status, isRTL)}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                          {Number(contract.total_amount).toLocaleString()} {contract.currency_code}
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

        {/* Recent Reviews */}
        <Card className="border-border/40 dark:border-border/20 dark:bg-card/80">
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-accent" />
              </div>
              {isRTL ? 'أحدث التقييمات' : 'Recent Reviews'}
            </CardTitle>
            <Link to="/dashboard/reviews">
              <Button variant="ghost" size="sm" className="text-xs text-accent h-7">
                {isRTL ? 'عرض الكل' : 'View All'}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {recentReviews && recentReviews.length > 0 ? (
              <div className="space-y-2">
                {recentReviews.map(review => (
                  <div key={review.id} className="p-2.5 rounded-xl bg-muted/30 dark:bg-muted/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground ms-auto">
                        {new Date(review.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                    {review.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{review.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Star className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
        {[
          { icon: Wrench, label: isRTL ? 'خدمات' : 'Services', value: stats?.services ?? 0, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-500/20' },
          { icon: Image, label: isRTL ? 'معرض' : 'Portfolio', value: stats?.portfolio ?? 0, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-500/20' },
          { icon: MessageSquare, label: isRTL ? 'محادثات' : 'Chats', value: stats?.conversations ?? 0, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20' },
          { icon: Shield, label: isRTL ? 'ضمانات' : 'Warranties', value: 0, color: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-500/20' },
          { icon: Users, label: isRTL ? 'عملاء' : 'Clients', value: stats?.totalContracts ?? 0, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-500/20' },
        ].map(card => (
          <Card key={card.label} className="border-border/40 dark:border-border/20 dark:bg-card/80">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className="text-lg sm:text-xl font-bold text-foreground">{card.value}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

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
    pending_approval: 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
    active: 'border-green-500/30 text-green-600 dark:text-green-400',
    completed: 'border-blue-500/30 text-blue-600 dark:text-blue-400',
    cancelled: 'border-red-500/30 text-red-600 dark:text-red-400',
    disputed: 'border-orange-500/30 text-orange-600 dark:text-orange-400',
  };
  return map[status] ?? '';
}
