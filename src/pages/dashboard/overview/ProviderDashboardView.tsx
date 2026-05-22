import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness } from '@/modules/businesses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wrench, Image as ImageIcon, Star, FileText, TrendingUp, DollarSign,
  Plus, Send, MessageSquare, Crown, Building2, FolderOpen, Megaphone,
  Activity, CheckCircle2, Target,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import { ProviderReadinessCard } from '@/components/dashboard/ProviderReadinessCard';
import { ProviderMembershipCard } from '@/components/dashboard/ProviderMembershipCard';
import { ProviderCompletionSummary } from '@/components/dashboard/ProviderCompletionSummary';
import { ProviderEngagementPreviews } from '@/components/dashboard/ProviderEngagementPreviews';
import { BusinessBarcodeCard } from '@/components/business-profile/BusinessBarcodeCard';
import {
  ChartTooltipStyle, getStatusLabel, getStatusColor, getMonths,
  StatCard, QuickAction, OverdueAlerts, TodaySummary,
  RefreshButton, getTimeGreeting,
} from '@/components/dashboard/overview/shared';

type ProviderProfile = {
  full_name?: string | null;
  ref_id?: string | null;
  membership_tier?: string | null;
} | null | undefined;

type Review = { id: string; rating: number; content?: string | null; created_at: string };

export default function ProviderDashboardView({
  isRTL, user, profile,
}: { isRTL: boolean; user: { id: string }; profile: ProviderProfile }) {
  const qc = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await getOwnerBusiness<{
        id: string;
        logo_url: string | null;
        name_ar: string | null;
        name_en: string | null;
        is_verified: boolean | null;
        membership_tier: string | null;
        [key: string]: unknown;
      }>({
        userId: user.id,
        select: '*',
        limit: 1,
      });
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const businessId = business?.id;

  const { data: stats, isFetching, refetch } = useQuery({
    queryKey: ['provider-overview-stats', user?.id, businessId],
    queryFn: async () => {
      const [services, portfolio, reviews, allContracts, projects, operations, messages, promotions] = await Promise.all([
        businessId ? supabase.from('business_services').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('reviews').select('id, rating', { count: 'exact' }).eq('business_id', businessId) : { count: 0, data: [] },
        supabase.from('contracts').select('id, total_amount, status, created_at', { count: 'exact' }).eq('provider_id', user.id),
        businessId ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        supabase.from('operations_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
        businessId ? supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('is_active', true) : { count: 0 },
      ]);

      const contractsData = allContracts.data || [];
      const activeContracts = contractsData.filter((c) => c.status === 'active' || c.status === 'pending_approval');
      const completedContracts = contractsData.filter((c) => c.status === 'completed');
      const totalRevenue = completedContracts.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

      const reviewsData = ((reviews as { data?: { rating: number }[] }).data) || [];
      const avgRating = reviewsData.length > 0 ? (reviewsData.reduce((s, r) => s + r.rating, 0) / reviewsData.length).toFixed(1) : '0.0';
      const ratingDist = [0, 0, 0, 0, 0];
      reviewsData.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++; });

      const statusCounts: Record<string, number> = {};
      contractsData.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

      const months = getMonths(isRTL);
      const now = new Date();
      const revenueMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); revenueMap.set(months[d.getMonth()], 0); }
      completedContracts.forEach((c) => {
        const key = months[new Date(c.created_at).getMonth()];
        if (revenueMap.has(key)) revenueMap.set(key, (revenueMap.get(key) || 0) + Number(c.total_amount || 0));
      });

      const cnt = (x: unknown) => ((x as { count?: number }).count) ?? 0;
      return {
        services: cnt(services), portfolio: cnt(portfolio),
        reviews: reviewsData.length, avgRating, ratingDist,
        contracts: contractsData.length, activeContracts: activeContracts.length,
        completedContracts: completedContracts.length, totalRevenue,
        projects: cnt(projects), operations: cnt(operations),
        messages: cnt(messages), promotions: cnt(promotions),
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
      if (!businessId) return [] as Review[];
      const { data } = await supabase.from('reviews').select('id, rating, content, created_at')
        .eq('business_id', businessId).order('created_at', { ascending: false }).limit(4);
      return (data || []) as Review[];
    },
    enabled: !!businessId,
    staleTime: 60000,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, isVisible, 1500);
  const animatedContracts = useCountUp(stats?.contracts ?? 0, isVisible, 1200);
  const completionRate = stats?.contracts ? Math.round((stats.completedContracts / stats.contracts) * 100) : 0;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['provider-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['provider-recent-contracts'] });
    qc.invalidateQueries({ queryKey: ['provider-recent-reviews-overview'] });
    qc.invalidateQueries({ queryKey: ['today-summary'] });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    refetch();
  };

  return (
    <div className="space-y-5" ref={ref}>
      {/* Welcome */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 dark:from-card/80 dark:to-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-accent/20">
              {business?.logo_url
                ? <img src={business.logo_url} alt={isRTL ? business.name_ar : (business.name_en || business.name_ar)} className="w-full h-full object-cover" loading="lazy" />
                : <Building2 className="w-6 h-6 text-accent" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-lg sm:text-xl flex items-center gap-2 flex-wrap leading-tight">
                {getTimeGreeting(isRTL)}{profile?.full_name ? `، ${profile.full_name}` : ''}
                {business?.is_verified && (
                  <Badge variant="secondary" className="text-[11px] bg-success/10 text-success border border-success/20 gap-1 h-5 px-1.5">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    {isRTL ? 'موثق' : 'Verified'}
                  </Badge>
                )}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {isRTL ? 'لوحة مزود الخدمة' : 'Provider Dashboard'}
                {business && <> — <span className="text-foreground/80 font-medium">{isRTL ? business.name_ar : (business.name_en || business.name_ar)}</span></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <RefreshButton onClick={handleRefresh} isLoading={isFetching} isRTL={isRTL} />
            {profile?.ref_id && (
              <Badge variant="outline" className="text-[11px] h-6 px-2 tech-content border-border/60">
                {profile.ref_id}
              </Badge>
            )}
            {business?.membership_tier && (
              <Badge className="bg-accent/10 text-accent border border-accent/30 text-[11px] h-6 px-2 capitalize">
                {business.membership_tier}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ProviderCompletionSummary />

      {/* Widgets row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OverdueAlerts isRTL={isRTL} userId={user.id} />
        <TodaySummary isRTL={isRTL} userId={user.id} />
      </div>

      <ProviderMembershipCard
        userId={user.id}
        businessId={businessId ?? null}
        tier={business?.membership_tier ?? profile?.membership_tier ?? 'free'}
      />

      <div id="provider-readiness" className="scroll-mt-24">
        <ProviderReadinessCard />
      </div>

      <ProviderEngagementPreviews businessId={businessId ?? null} />

      {businessId && (
        <BusinessBarcodeCard
          businessId={businessId}
          businessName={isRTL ? business?.name_ar : (business?.name_en || business?.name_ar)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={DollarSign} label={isRTL ? 'إجمالي الإيرادات' : 'Revenue'} value={`${animatedRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`} color="bg-success/10 text-success" />
        <StatCard icon={FileText} label={isRTL ? 'العقود النشطة' : 'Active'} value={stats?.activeContracts ?? 0} sub={`${isRTL ? 'من' : 'of'} ${animatedContracts}`} color="bg-accent/10 text-accent" to="/dashboard/contracts" />
        <StatCard icon={Star} label={isRTL ? 'التقييم' : 'Rating'} value={stats?.avgRating ?? '0.0'} sub={`${stats?.reviews ?? 0} ${isRTL ? 'تقييم' : 'reviews'}`} color="bg-accent/10 text-accent" to="/dashboard/reviews" />
        <StatCard icon={Target} label={isRTL ? 'معدل الإنجاز' : 'Completion'} value={`${completionRate}%`} sub={`${stats?.completedContracts ?? 0} ${isRTL ? 'مكتمل' : 'done'}`} color="bg-primary/10 text-primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border/40 lg:col-span-2">
          <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-success" aria-hidden="true" />{isRTL ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</CardTitle></CardHeader>
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
          <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><Star className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'التقييمات' : 'Ratings'}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats?.ratingDist?.[star - 1] ?? 0;
              const pct = (stats?.reviews ?? 0) > 0 ? (count / stats!.reviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 text-muted-foreground">{star}</span>
                  <Star className="w-2.5 h-2.5 text-accent fill-accent" aria-hidden="true" />
                  <Progress value={pct} className="flex-1 h-1.5" aria-label={isRTL ? `${star} نجوم: ${count} تقييم` : `${star} stars: ${count} reviews`} />
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
            <CardTitle className="text-xs flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'أحدث العقود' : 'Recent Contracts'}</CardTitle>
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
                <FileText className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" /><p className="text-[10px]">{isRTL ? 'لا عقود بعد' : 'No contracts'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2"><Star className="w-3.5 h-3.5 text-accent" aria-hidden="true" />{isRTL ? 'أحدث التقييمات' : 'Recent Reviews'}</CardTitle>
            <Link to="/dashboard/reviews"><Button variant="ghost" size="sm" className="text-[10px] text-accent h-6">{isRTL ? 'الكل' : 'All'}</Button></Link>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {recentReviews && recentReviews.length > 0 ? (
              <div className="space-y-1.5">
                {recentReviews.map((review) => (
                  <div key={review.id} className="p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-1 mb-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn('w-2.5 h-2.5', i < review.rating ? 'text-accent fill-accent' : 'text-muted-foreground/20')} aria-hidden="true" />
                      ))}
                      <span className="text-[9px] text-muted-foreground ms-auto">{new Date(review.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {review.content && <p className="text-[10px] text-muted-foreground line-clamp-2">{review.content}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Star className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" /><p className="text-[10px]">{isRTL ? 'لا تقييمات' : 'No reviews'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/40">
        <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle></CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { icon: Plus, label: isRTL ? 'خدمة' : 'Service', to: '/dashboard/services' },
              { icon: ImageIcon, label: isRTL ? 'مشروع' : 'Project', to: '/dashboard/projects' },
              { icon: Send, label: isRTL ? 'عرض' : 'Offer', to: '/dashboard/promotions' },
              { icon: MessageSquare, label: isRTL ? 'رسائل' : 'Messages', to: '/dashboard/messages' },
              { icon: FileText, label: isRTL ? 'عقود' : 'Contracts', to: '/dashboard/contracts' },
              { icon: Crown, label: isRTL ? 'عضوية' : 'Membership', to: '/membership' },
            ].map((a) => <QuickAction key={a.to} {...a} />)}
          </div>
        </CardContent>
      </Card>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon: Wrench, label: isRTL ? 'خدمات' : 'Services', value: stats?.services ?? 0 },
          { icon: ImageIcon, label: isRTL ? 'معرض' : 'Portfolio', value: stats?.portfolio ?? 0 },
          { icon: FolderOpen, label: isRTL ? 'مشاريع' : 'Projects', value: stats?.projects ?? 0 },
          { icon: Megaphone, label: isRTL ? 'عروض' : 'Promos', value: stats?.promotions ?? 0 },
          { icon: MessageSquare, label: isRTL ? 'محادثات' : 'Chats', value: stats?.messages ?? 0 },
          { icon: Activity, label: isRTL ? 'عمليات' : 'Operations', value: stats?.operations ?? 0 },
        ].map((card) => (
          <Card key={card.label} className="border-border/40">
            <CardContent className="p-2 flex flex-col items-center text-center gap-0.5">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <card.icon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              </div>
              <span className="tech-content text-sm font-bold">{card.value}</span>
              <span className="text-[8px] text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}