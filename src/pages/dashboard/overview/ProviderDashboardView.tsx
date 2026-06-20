import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerBusiness } from '@/modules/businesses';
import { countConversationsForUser } from '@/modules/messaging';
import { listContractsForOwner } from '@/modules/contracts';
import { countServicesByBusiness } from '@/modules/catalog';
import { countLeadsForBusiness } from '@/modules/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wrench, Image as ImageIcon, Star, FileText, TrendingUp,
  Plus, Send, MessageSquare, Crown, Building2,
  CheckCircle2, ExternalLink, Sparkles, ArrowLeft, ArrowRight, Eye, Inbox, MapPin,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import { ProviderReadinessCard } from '@/components/dashboard/ProviderReadinessCard';
import { ProviderHealthScoreCard } from '@/components/dashboard/ProviderHealthScoreCard';
import { ProviderVisibilityStatusCard } from '@/components/dashboard/ProviderVisibilityStatusCard';
import { ProviderMembershipCard } from '@/components/dashboard/ProviderMembershipCard';
import { ProviderEngagementPreviews } from '@/components/dashboard/ProviderEngagementPreviews';
import { ProviderTipsCard } from '@/components/dashboard/ProviderTipsCard';
import { ProviderServicesStatusCard } from '@/components/dashboard/ProviderServicesStatusCard';
import { ProviderSmartActionFooter } from '@/components/dashboard/ProviderSmartActionFooter';
import { ProviderStatsOverview } from '@/components/dashboard/ProviderStatsOverview';
import { FreeLaunchBadge } from '@/components/dashboard/FreeLaunchBadge';
import { ProviderAnalyticsCharts } from '@/components/dashboard/ProviderAnalyticsCharts';
import { listOverdueInstallmentPayments } from '@/modules/contracts';
import { useMembershipVisibility } from '@/hooks/useMembershipVisibility';
import { BusinessBarcodeCard } from '@/components/business-profile/BusinessBarcodeCard';
import {
  ChartTooltipStyle, getStatusLabel, getStatusColor, getMonths,
  QuickAction, OverdueAlerts, TodaySummary,
} from '@/components/dashboard/overview/shared';
import {
  UnifiedDashboardHero,
  formatLastUpdated,
} from '@/components/dashboard/overview/UnifiedDashboardHero';
import {
  DashboardActionCenter,
  type DashboardAction,
} from '@/components/dashboard/overview/DashboardActionCenter';


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
  const membershipVisibility = useMembershipVisibility();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { BUSINESS_SAFE_COLUMNS_SELECT } = await import('@/modules/businesses');
      const { data } = await getOwnerBusiness<{
        id: string;
        logo_url: string | null;
        name_ar: string | null;
        name_en: string | null;
        username: string | null;
        is_verified: boolean | null;
        membership_tier: string | null;
        [key: string]: unknown;
      }>({
        userId: user.id,
        // Avoid `*` because sensitive cols (CR/ID/notes) are blocked at
        // column-level for the authenticated role.
        select: BUSINESS_SAFE_COLUMNS_SELECT,
        limit: 1,
      });
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const businessId = business?.id;
  const publicUsername = (business?.username as string | null) ?? null;
  const isPublished = !!business?.is_verified;

  const { data: stats, isFetching, refetch } = useQuery({
    queryKey: ['provider-overview-stats', user?.id, businessId],
    queryFn: async () => {
      const [services, portfolio, reviews, allContracts, projects, operations, messages, promotions, leads] = await Promise.all([
        businessId ? countServicesByBusiness({ businessId }) : { count: 0 },
        businessId ? supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        businessId ? supabase.from('reviews').select('id, rating', { count: 'exact' }).eq('business_id', businessId) : { count: 0, data: [] },
        listContractsForOwner<{ id: string; total_amount: number | null; status: string; created_at: string }>({
          providerId: user.id,
          select: 'id, total_amount, status, created_at',
          count: { mode: 'exact' },
        }),
        businessId ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('business_id', businessId) : { count: 0 },
        supabase.from('operations_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        countConversationsForUser({ userId: user.id }),
        businessId ? supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('is_active', true) : { count: 0 },
        businessId ? countLeadsForBusiness(businessId) : { count: 0 },
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
        messages: cnt(messages), promotions: cnt(promotions), leads: cnt(leads),
        statusCounts,
        monthlyRevenue: Array.from(revenueMap.entries()).map(([month, revenue]) => ({ month, revenue })),
        contractsRaw: contractsData,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: recentContracts } = useQuery({
    queryKey: ['provider-recent-contracts', user?.id],
    queryFn: async () => {
      const { data } = await listContractsForOwner({
        providerId: user.id,
        select: 'id, contract_number, title_ar, title_en, status, total_amount, currency_code, created_at',
        orderBy: { column: 'created_at', ascending: false },
        limit: 5,
      });
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

  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['provider-overdue-count', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await listOverdueInstallmentPayments(today, 50);
      return (data ?? []).length;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const { ref, isVisible } = useScrollAnimation(0.1);
  const animatedRevenue = useCountUp(stats?.totalRevenue ?? 0, isVisible, 1500);
  const [lastRefresh, setLastRefresh] = React.useState<Date>(() => new Date());

  const completionRate = stats?.contracts ? Math.round((stats.completedContracts / stats.contracts) * 100) : 0;
  const hasRevenueData = (stats?.completedContracts ?? 0) > 0 && (stats?.totalRevenue ?? 0) > 0;
  const membershipTier = (business?.membership_tier ?? profile?.membership_tier ?? 'free') as string;
  const isFreePlan = membershipTier === 'free';

  /**
   * Profile completion — five required fields scored equally. Pure
   * derivation from the already-loaded `business` row; no extra reads.
   */
  const profileCompletion = React.useMemo(() => {
    if (!business) return 0;
    const b = business as Record<string, unknown>;
    const has = (k: string) => {
      const v = b[k];
      return typeof v === 'string' ? v.trim().length > 0 : !!v;
    };
    const checks = [
      has('name_ar') || has('name_en'),
      has('logo_url'),
      has('description_ar') || has('description_en'),
      has('phone') || has('email'),
      has('region') || has('city_id'),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [business]);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['provider-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['provider-recent-contracts'] });
    qc.invalidateQueries({ queryKey: ['provider-recent-reviews-overview'] });
    qc.invalidateQueries({ queryKey: ['today-summary'] });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    setLastRefresh(new Date());
    refetch();
  };

  return (
    <div className="space-y-5" ref={ref}>
      {/* A — Unified Hero (Phase A) */}
      <UnifiedDashboardHero
        isRTL={isRTL}
        roleLabel={{ ar: 'لوحة مزود الخدمة', en: 'Provider Dashboard' }}
        fullName={profile?.full_name ?? null}
        refId={profile?.ref_id ?? null}
        lastUpdated={formatLastUpdated(lastRefresh, isRTL)}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        subline={
          business
            ? (isRTL ? (business.name_ar ?? '') : (business.name_en || business.name_ar || ''))
            : (isRTL ? 'ابدأ بإعداد ملف منشأتك' : 'Set up your business profile')
        }
        rightSlot={
          <>
            {isPublished && (
              <Badge variant="outline" className="h-6 px-2 text-[10px] gap-1 border-success/30 text-success">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                {isRTL ? 'موثق' : 'Verified'}
              </Badge>
            )}
            <FreeLaunchBadge tier={membershipTier} />
            {membershipTier && (
              <Badge className="text-[10px] h-6 px-2 capitalize bg-info/10 text-info border border-info/20">
                {membershipTier}
              </Badge>
            )}
          </>
        }
      />

      {/* A2 — Primary CTAs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/dashboard/business-completion">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            {isRTL ? 'أكمل ملفك' : 'Complete profile'}
            <Arrow className="w-3.5 h-3.5" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/dashboard/services">
            <Wrench className="w-3.5 h-3.5" aria-hidden />
            {isRTL ? 'إدارة الخدمات' : 'Manage services'}
          </Link>
        </Button>
        {publicUsername && (
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link to={`/${publicUsername}`}>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              {isRTL ? 'مشاهدة الصفحة العامة' : 'View public page'}
            </Link>
          </Button>
        )}
      </div>

      {/* Action Center — role-aware provider CTAs (Phase B2) */}
      {/* AUTH-14E · State-aware "Next Step" guidance header above the
          existing action center. Pure presentation; readiness/approval
          logic and visibility logic are NOT touched. */}
      <div data-testid="provider-next-step-guidance" className="space-y-1">
        <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-gold" aria-hidden />
          {isRTL ? 'الخطوة التالية' : 'Next step'}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isPublished
            ? (isRTL
                ? 'منشأتك ظاهرة للعملاء. تابع طلبات العملاء وحدّث الخدمات والصور بانتظام.'
                : 'Your business is visible to customers. Track customer requests and keep services and images up to date.')
            : business
              ? (isRTL
                  ? 'أكمل ملف منشأتك وأضف الخدمات والصور، ثم انتظر مراجعة فريق قطاعات قبل الظهور العام.'
                  : 'Complete your business profile and add services & images, then wait for the Qitaat team to review your visibility.')
              : (isRTL
                  ? 'ابدأ بإعداد ملف منشأتك لتفعيل خطة الإطلاق المجانية واستقبال الطلبات.'
                  : 'Start by setting up your business profile to activate the Free Launch plan and receive requests.')}
        </p>
      </div>
      <DashboardActionCenter
        isRTL={isRTL}
        role="provider"
        actions={[
          {
            id: 'complete-profile',
            label: { ar: 'أكمل ملفك', en: 'Complete profile' },
            description: {
              ar: 'استكمل الحقول لزيادة فرص الظهور',
              en: 'Finish required fields to improve visibility',
            },
            to: '/dashboard/business-completion',
            icon: Sparkles,
            primary: true,
          },
          {
            id: 'services-images',
            label: { ar: 'أضف الخدمات والصور', en: 'Add services & images' },
            to: '/dashboard/services',
            icon: ImageIcon,
          },
          {
            id: 'visibility',
            label: { ar: 'راجع حالة الظهور', en: 'Review visibility' },
            to: '/dashboard/business-visibility',
            icon: Eye,
          },
          {
            id: 'leads',
            label: { ar: 'تابع طلبات العملاء', en: 'Customer requests' },
            to: '/dashboard/leads',
            icon: Inbox,
          },
          {
            id: 'service-areas',
            label: { ar: 'حدّث مناطق الخدمة', en: 'Update service areas' },
            to: '/dashboard/provider/service-areas',
            icon: MapPin,
          },
        ] satisfies DashboardAction[]}
      />

      {/* B3 — Public visibility status (presentational, reads existing state) */}
      <ProviderVisibilityStatusCard />

      {/* B0 — Provider health score (executive composite, live data) */}
      <ProviderHealthScoreCard
        isRTL={isRTL}
        input={{
          isVerified: isPublished,
          profileCompletion,
          totalContracts: stats?.contracts ?? 0,
          completedContracts: stats?.completedContracts ?? 0,
          services: stats?.services ?? 0,
          portfolio: stats?.portfolio ?? 0,
          avgRating: Number(stats?.avgRating ?? 0),
          reviews: stats?.reviews ?? 0,
        }}
      />

      {/* B — Performance overview (KPIs + secondary metrics, professional B2B) */}
      <ProviderStatsOverview
        isRTL={isRTL}
        activeContracts={stats?.activeContracts ?? 0}
        totalContracts={stats?.contracts ?? 0}
        services={stats?.services ?? 0}
        avgRating={stats?.avgRating ?? '0.0'}
        reviews={stats?.reviews ?? 0}
        completionRate={completionRate}
        completedContracts={stats?.completedContracts ?? 0}
        portfolio={stats?.portfolio ?? 0}
        projects={stats?.projects ?? 0}
        promotions={stats?.promotions ?? 0}
        messages={stats?.messages ?? 0}
        operations={stats?.operations ?? 0}
      />

      {/* B2 — Analytics & insights (sales, contracts, delivery, overdue) */}
      <ProviderAnalyticsCharts
        isRTL={isRTL}
        contracts={stats?.contractsRaw ?? []}
        monthlyRevenue={stats?.monthlyRevenue ?? []}
        overdueCount={overdueCount}
      />

      {/* Widgets row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OverdueAlerts isRTL={isRTL} userId={user.id} />
        <TodaySummary isRTL={isRTL} userId={user.id} />
      </div>

      {/* C — Profile readiness (single strong card) */}
      <div id="provider-readiness" className="scroll-mt-24">
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
          {isRTL
            ? 'كلما اكتمل ملفك زادت فرصة ظهورك واستقبال طلبات مناسبة. أكمل البيانات الناقصة قبل طلب الظهور العام.'
            : 'The more complete your profile, the more visible you are and the better the matching. Finish the missing fields before requesting public visibility.'}
        </p>
        <ProviderReadinessCard />
      </div>

      {/* D — Smart tips (deterministic, derived from current state) */}
      <ProviderTipsCard businessId={businessId} />

      {/* F — Services status */}
      <ProviderServicesStatusCard businessId={businessId ?? null} />

      {/* E + I — Opportunities, messages, notifications */}
      <ProviderEngagementPreviews businessId={businessId ?? null} />

      {/* G — Membership / access */}
      <ProviderMembershipCard
        userId={user.id}
        businessId={businessId ?? null}
        tier={membershipTier}
      />

      {businessId && (
        <BusinessBarcodeCard
          businessId={businessId}
          businessName={isRTL ? business?.name_ar : (business?.name_en || business?.name_ar)}
        />
      )}

      {/* Charts — only when real revenue data exists */}
      {hasRevenueData && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border/40 lg:col-span-2">
          <CardHeader className="pb-1 px-4 pt-3"><CardTitle className="text-xs flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-success" aria-hidden="true" />{isRTL ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="sr-only">{animatedRevenue.toLocaleString()}</p>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyRevenue || []}>
                  <defs><linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={ChartTooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" strokeWidth={2} name={isRTL ? 'إيرادات' : 'Revenue'} />
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
      )}

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
              ...(membershipVisibility.membershipPathOrNull
                ? [{ icon: Crown, label: isRTL ? 'عضوية' : 'Membership', to: membershipVisibility.membershipPathOrNull }]
                : []),
            ].map((a) => <QuickAction key={a.to} {...a} />)}
          </div>
        </CardContent>
      </Card>

      {/* J — Final dynamic CTA */}
      <ProviderSmartActionFooter
        servicesCount={stats?.services ?? 0}
        portfolioCount={(stats?.portfolio ?? 0) + (stats?.projects ?? 0)}
        leadsCount={stats?.leads ?? 0}
        isFreePlan={isFreePlan}
        publicUsername={publicUsername}
      />
    </div>
  );
}