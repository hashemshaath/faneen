import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listContractsForProviderOrBusiness } from '@/modules/contracts';
import { listServicesByBusiness } from '@/modules/catalog';
import { useAuth } from '@/contexts/AuthContext';
import { getOwnerBusiness } from '@/modules/businesses';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3, TrendingUp, DollarSign, Users, FileText, Star,
  CalendarClock, Eye, ArrowUpRight, ArrowDownRight, Minus,
  PieChart as PieChartIcon, Activity, Download, RefreshCw, Sparkles, Briefcase,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { useNoIndex } from "@/hooks/useNoIndex";
import { ProviderLeadAnalytics } from '@/components/dashboard/ProviderLeadAnalytics';
import { ProviderTipsCard } from '@/components/dashboard/ProviderTipsCard';
import { BentoTile } from '@/components/dashboard/overview/BentoTile';
import '@/styles/dashboard-emerald.css';

// Brand-aligned chart palette — sourced from central design tokens.
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

const tooltipStyle = {
  borderRadius: 12, fontSize: 11,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

type Period = '7d' | '30d' | '90d' | '12m';

const DashboardAnalytics = () => {
  useNoIndex();
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [period, setPeriod] = useState<Period>('30d');

  usePageMeta({
    title: isRTL ? 'التحليلات | قِطاعات' : 'Analytics | Qitaat',
    noindex: true,
  });

  // Get business
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await getOwnerBusiness<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        created_at: string;
        rating_avg: number | null;
        rating_count: number | null;
      }>({
        userId: user!.id,
        select: 'id, name_ar, name_en, created_at, rating_avg, rating_count',
        activeOnly: true,
      });
      return data;
    },
    enabled: !!user,
  });

  const dateRange = useMemo(() => {
    const end = new Date();
    let start: Date;
    switch (period) {
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      case '90d': start = subDays(end, 90); break;
      case '12m': start = subMonths(end, 12); break;
    }
    return { start: start.toISOString(), end: end.toISOString(), startDate: start, endDate: end };
  }, [period]);

  // Fetch all analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['provider-analytics', business?.id, period],
    queryFn: async () => {
      if (!business) return null;
      const { start } = dateRange;

      const [contracts, bookings, reviews, services, projects, portfolio] = await Promise.all([
        listContractsForProviderOrBusiness<{ id: string; status: string; total_amount: number | null; created_at: string; currency_code: string | null }>({
          userId: user!.id,
          businessId: business.id,
          select: 'id, status, total_amount, created_at, currency_code',
          gteCreatedAt: start,
        }),
        supabase.from('bookings').select('id, status, booking_date, created_at')
          .eq('business_id', business.id)
          .gte('created_at', start),
        supabase.from('reviews').select('id, rating, created_at')
          .eq('business_id', business.id)
          .gte('created_at', start),
        listServicesByBusiness({
          businessId: business.id,
          select: 'id',
          activeOnly: true,
          order: null,
        }),
        supabase.from('projects').select('id, status, created_at')
          .eq('business_id', business.id),
        supabase.from('portfolio_items').select('id')
          .eq('business_id', business.id),
      ]);

      return {
        contracts: contracts.data || [],
        bookings: bookings.data || [],
        reviews: reviews.data || [],
        servicesCount: services.data?.length || 0,
        projectsCount: projects.data?.length || 0,
        portfolioCount: portfolio.data?.length || 0,
      };
    },
    enabled: !!business,
    staleTime: 60000,
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!analytics) return null;
    const { contracts, bookings, reviews } = analytics;

    const totalRevenue = contracts
      .filter(c => ['completed', 'active'].includes(c.status))
      .reduce((s, c) => s + Number(c.total_amount || 0), 0);

    const completedContracts = contracts.filter(c => c.status === 'completed').length;
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const avgRating = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '0';

    return {
      totalRevenue, completedContracts, activeContracts, totalContracts: contracts.length,
      totalBookings: bookings.length, pendingBookings, confirmedBookings, completedBookings, cancelledBookings,
      totalReviews: reviews.length, avgRating,
      projectsCount: analytics.projectsCount, servicesCount: analytics.servicesCount,
    };
  }, [analytics]);

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    if (!analytics) return [];
    const { contracts } = analytics;
    const { startDate, endDate } = dateRange;

    if (period === '12m') {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      return months.map(m => {
        const monthStr = format(m, 'yyyy-MM');
        const monthContracts = contracts.filter(c =>
          ['completed', 'active'].includes(c.status) && c.created_at.startsWith(monthStr)
        );
        return {
          date: format(m, isRTL ? 'MMM' : 'MMM yy'),
          revenue: monthContracts.reduce((s, c) => s + Number(c.total_amount || 0), 0),
          count: monthContracts.length,
        };
      });
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const grouped = new Map<string, { revenue: number; count: number }>();
    days.forEach(d => grouped.set(format(d, 'yyyy-MM-dd'), { revenue: 0, count: 0 }));
    contracts.filter(c => ['completed', 'active'].includes(c.status)).forEach(c => {
      const key = c.created_at.split('T')[0];
      if (grouped.has(key)) {
        const v = grouped.get(key)!;
        v.revenue += Number(c.total_amount || 0);
        v.count += 1;
      }
    });

    return Array.from(grouped.entries()).map(([date, val]) => ({
      date: period === '7d' ? format(new Date(date), 'EEE') : format(new Date(date), 'dd/MM'),
      ...val,
    }));
  }, [analytics, dateRange, period, isRTL]);

  // Booking status pie
  const bookingPieData = useMemo(() => {
    if (!stats) return [];
    const items = [
      { name: isRTL ? 'مؤكد' : 'Confirmed', value: stats.confirmedBookings },
      { name: isRTL ? 'مكتمل' : 'Completed', value: stats.completedBookings },
      { name: isRTL ? 'بانتظار' : 'Pending', value: stats.pendingBookings },
      { name: isRTL ? 'ملغي' : 'Cancelled', value: stats.cancelledBookings },
    ];
    return items.filter(i => i.value > 0);
  }, [stats, isRTL]);

  // Contract status pie
  const contractPieData = useMemo(() => {
    if (!analytics) return [];
    const statusMap: Record<string, number> = {};
    analytics.contracts.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' }, pending_approval: { ar: 'بانتظار', en: 'Pending' },
      active: { ar: 'نشط', en: 'Active' }, completed: { ar: 'مكتمل', en: 'Completed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    };
    return Object.entries(statusMap).map(([status, value]) => ({
      name: labels[status]?.[isRTL ? 'ar' : 'en'] || status,
      value,
    }));
  }, [analytics, isRTL]);

  // Bookings timeline
  const bookingsChartData = useMemo(() => {
    if (!analytics) return [];
    const { bookings } = analytics;
    const { startDate, endDate } = dateRange;

    if (period === '12m') {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      return months.map(m => {
        const monthStr = format(m, 'yyyy-MM');
        return {
          date: format(m, isRTL ? 'MMM' : 'MMM yy'),
          count: bookings.filter(b => b.created_at.startsWith(monthStr)).length,
        };
      });
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const grouped = new Map<string, number>();
    days.forEach(d => grouped.set(format(d, 'yyyy-MM-dd'), 0));
    bookings.forEach(b => {
      const key = b.created_at.split('T')[0];
      if (grouped.has(key)) grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([date, count]) => ({
      date: period === '7d' ? format(new Date(date), 'EEE') : format(new Date(date), 'dd/MM'),
      count,
    }));
  }, [analytics, dateRange, period, isRTL]);

  // Reviews distribution
  const reviewsDist = useMemo(() => {
    if (!analytics) return [];
    const dist = [0, 0, 0, 0, 0];
    analytics.reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    return [5, 4, 3, 2, 1].map(stars => ({
      stars: `${stars} ★`,
      count: dist[stars - 1],
    }));
  }, [analytics]);

  const periodOptions: { value: Period; label: string }[] = [
    { value: '7d', label: isRTL ? '7 أيام' : '7d' },
    { value: '30d', label: isRTL ? '30 يوم' : '30d' },
    { value: '90d', label: isRTL ? '90 يوم' : '90d' },
    { value: '12m', label: isRTL ? '12 شهر' : '12m' },
  ];

  // Previous-period comparison fetch (for trend deltas).
  const prevRange = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const span = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - span);
    return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
  }, [dateRange]);

  const { data: prevAnalytics } = useQuery({
    queryKey: ['provider-analytics-prev', business?.id, period],
    queryFn: async () => {
      if (!business) return null;
      const [contracts, bookings, reviews] = await Promise.all([
        listContractsForProviderOrBusiness<{ id: string; status: string; total_amount: number | null; created_at: string }>({
          userId: user!.id,
          businessId: business.id,
          select: 'id, status, total_amount, created_at',
          gteCreatedAt: prevRange.start,
        }).then((r) => ({ data: (r.data ?? []).filter((c) => c.created_at <= prevRange.end) })),
        supabase.from('bookings').select('id, status, created_at')
          .eq('business_id', business.id)
          .gte('created_at', prevRange.start).lte('created_at', prevRange.end),
        supabase.from('reviews').select('id, rating, created_at')
          .eq('business_id', business.id)
          .gte('created_at', prevRange.start).lte('created_at', prevRange.end),
      ]);
      const cs = contracts.data ?? [];
      const revenue = cs.filter((c) => ['completed', 'active'].includes(c.status))
        .reduce((s, c) => s + Number(c.total_amount || 0), 0);
      const ratings = (reviews.data ?? []);
      return {
        revenue,
        contracts: cs.length,
        bookings: (bookings.data ?? []).length,
        avgRating: ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0,
      };
    },
    enabled: !!business,
    staleTime: 60000,
  });

  const trend = (curr: number, prev: number | undefined): { up?: boolean; label: string } | undefined => {
    if (prev === undefined || prev === null) return undefined;
    if (prev === 0 && curr === 0) return { up: undefined, label: '0%' };
    if (prev === 0) return { up: true, label: '+∞' };
    const pct = ((curr - prev) / prev) * 100;
    const sign = pct > 0 ? '+' : '';
    return { up: pct >= 0, label: `${sign}${pct.toFixed(0)}%` };
  };

  const qc = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date());
  const refetchAll = async () => {
    await qc.invalidateQueries({ queryKey: ['provider-analytics'] });
    await qc.invalidateQueries({ queryKey: ['provider-analytics-prev'] });
    setLastRefreshed(new Date());
  };

  const downloadCsv = () => {
    if (!analytics || !stats) return;
    const rows: string[] = [];
    rows.push(['Metric', 'Value'].join(','));
    rows.push(['Revenue', String(stats.totalRevenue)].join(','));
    rows.push(['Contracts (total)', String(stats.totalContracts)].join(','));
    rows.push(['Contracts (active)', String(stats.activeContracts)].join(','));
    rows.push(['Contracts (completed)', String(stats.completedContracts)].join(','));
    rows.push(['Bookings (total)', String(stats.totalBookings)].join(','));
    rows.push(['Bookings (confirmed)', String(stats.confirmedBookings)].join(','));
    rows.push(['Bookings (completed)', String(stats.completedBookings)].join(','));
    rows.push(['Bookings (cancelled)', String(stats.cancelledBookings)].join(','));
    rows.push(['Reviews (total)', String(stats.totalReviews)].join(','));
    rows.push(['Rating (avg)', String(stats.avgRating)].join(','));
    rows.push(['Projects', String(stats.projectsCount)].join(','));
    rows.push(['Services', String(stats.servicesCount)].join(','));
    rows.push('');
    rows.push(['Date', 'Revenue', 'Contracts'].join(','));
    revenueChartData.forEach((d) => rows.push([d.date, String(d.revenue), String(d.count)].join(',')));
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qitaat-analytics-${period}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Smart insight (best chart day / conversion ratio)
  const insight = useMemo(() => {
    if (!analytics || !stats) return null;
    const best = revenueChartData.reduce((m, d) => (d.revenue > m.revenue ? d : m), { date: '', revenue: 0, count: 0 });
    const convRate = stats.totalBookings > 0
      ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
      : 0;
    return { bestDate: best.date, bestRevenue: best.revenue, convRate };
  }, [analytics, stats, revenueChartData]);

  return (
    <DashboardLayout>
      <div className="dash-emerald space-y-6">
        {/* Hero header */}
        <div className="dash-hero p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative">
            <div className="space-y-2">
              <span className="dash-hero-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" />
                {isRTL ? 'مركز التحليلات الاحترافي' : 'Pro Analytics Center'}
              </span>
              <h1 className="ds-h2 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                {isRTL ? 'التحليلات والإحصائيات' : 'Analytics & Insights'}
              </h1>
              <p className="dash-hero-sub text-sm max-w-xl">
                {isRTL
                  ? 'لوحة احترافية بمؤشرات أداء حية، مقارنات بين الفترات، وتصدير فوري للبيانات.'
                  : 'Pro dashboard with live KPIs, period-over-period comparisons, and instant CSV export.'}
              </p>
              <p className="dash-hero-sub text-[11px] tech-content opacity-80">
                {isRTL ? 'آخر تحديث' : 'Updated'} · {format(lastRefreshed, 'HH:mm:ss')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Segmented period selector */}
              <div className="inline-flex rounded-full bg-white/10 border border-white/20 p-1 backdrop-blur-sm">
                {periodOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setPeriod(o.value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition tech-content',
                      period === o.value
                        ? 'bg-white text-emerald-900 shadow'
                        : 'text-white/80 hover:text-white',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="dash-hero-chip h-9 rounded-full"
                onClick={refetchAll}
              >
                <RefreshCw className={cn('w-3.5 h-3.5 me-1.5', isLoading && 'animate-spin')} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
              <Button
                size="sm"
                className="dash-hero-gold h-9 rounded-full"
                onClick={downloadCsv}
                disabled={!stats}
              >
                <Download className="w-3.5 h-3.5 me-1.5" />
                {isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </div>

        {isLoading || !stats ? (
          <div className="dash-bento">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Smart insight strip */}
            {insight && (
              <Card className="border-[hsl(var(--de-gold))]/40 bg-gradient-to-br from-[hsl(var(--de-emerald))]/5 to-[hsl(var(--de-gold))]/5">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-[hsl(var(--de-gold))]/20 text-[hsl(var(--de-emerald-deep))]">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {isRTL ? 'رؤية ذكية' : 'Smart Insight'}
                    </p>
                    <p className="text-sm font-semibold">
                      {insight.bestDate ? (
                        isRTL
                          ? `أعلى يوم إيراد كان ${insight.bestDate} بمبلغ ${insight.bestRevenue.toLocaleString()} ر.س`
                          : `Top revenue day was ${insight.bestDate} with ${insight.bestRevenue.toLocaleString()} SAR`
                      ) : isRTL ? 'لا توجد إيرادات في هذه الفترة بعد' : 'No revenue in this period yet'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">
                      {isRTL ? 'معدل الإنجاز' : 'Completion Rate'}
                    </p>
                    <p className="text-2xl font-bold tech-content text-[hsl(var(--de-emerald))]">
                      {insight.convRate}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bento KPI grid */}
            <div className="dash-bento">
              <BentoTile
                variant="feature"
                icon={DollarSign}
                label={isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}
                value={
                  <>
                    {stats.totalRevenue.toLocaleString()}{' '}
                    <span className="text-base font-normal text-muted-foreground">{isRTL ? 'ر.س' : 'SAR'}</span>
                  </>
                }
                sub={`${stats.activeContracts + stats.completedContracts} ${isRTL ? 'عقد مُولِّد' : 'earning contracts'}`}
                trend={trend(stats.totalRevenue, prevAnalytics?.revenue)}
                accent="gold"
              />
              <BentoTile
                icon={FileText}
                label={isRTL ? 'العقود' : 'Contracts'}
                value={stats.totalContracts}
                sub={`${stats.activeContracts} ${isRTL ? 'نشط' : 'active'} · ${stats.completedContracts} ${isRTL ? 'مكتمل' : 'done'}`}
                trend={trend(stats.totalContracts, prevAnalytics?.contracts)}
              />
              <BentoTile
                icon={CalendarClock}
                label={isRTL ? 'الحجوزات' : 'Bookings'}
                value={stats.totalBookings}
                sub={`${stats.confirmedBookings} ${isRTL ? 'مؤكد' : 'confirmed'}`}
                trend={trend(stats.totalBookings, prevAnalytics?.bookings)}
              />
              <BentoTile
                icon={Star}
                label={isRTL ? 'متوسط التقييم' : 'Avg. Rating'}
                value={stats.avgRating}
                sub={`${stats.totalReviews} ${isRTL ? 'تقييم' : 'reviews'}`}
                trend={prevAnalytics ? trend(Number(stats.avgRating), prevAnalytics.avgRating) : undefined}
                accent="gold"
              />
              <BentoTile
                icon={Briefcase}
                label={isRTL ? 'المشاريع' : 'Projects'}
                value={stats.projectsCount}
              />
              <BentoTile
                icon={Activity}
                label={isRTL ? 'الخدمات النشطة' : 'Active Services'}
                value={stats.servicesCount}
              />
              <BentoTile
                icon={Users}
                label={isRTL ? 'حجوزات مكتملة' : 'Completed Bookings'}
                value={stats.completedBookings}
              />
              <BentoTile
                icon={TrendingUp}
                label={isRTL ? 'عقود مكتملة' : 'Done Contracts'}
                value={stats.completedContracts}
              />
            </div>

            {/* Revenue Chart */}
            <Card className="border-border/40 shadow-elev-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[hsl(var(--de-emerald))]" />
                    {isRTL ? 'تطور الإيرادات' : 'Revenue Trend'}
                  </CardTitle>
                  {prevAnalytics && (
                    <Badge variant="outline" className="text-[10px] font-semibold gap-1">
                      {(() => {
                        const t = trend(stats.totalRevenue, prevAnalytics.revenue);
                        if (!t) return null;
                        const Icon = t.up === undefined ? Minus : t.up ? ArrowUpRight : ArrowDownRight;
                        return (
                          <>
                            <Icon className="w-3 h-3" />
                            <span className="tech-content">{t.label}</span>
                            <span className="text-muted-foreground">
                              {isRTL ? 'مقابل السابق' : 'vs prev'}
                            </span>
                          </>
                        );
                      })()}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--de-emerald))" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="hsl(var(--de-emerald))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--de-emerald))" fill="url(#revGrad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bookings Timeline */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-info" />
                    {isRTL ? 'الحجوزات' : 'Bookings'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bookingsChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Status Pie */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-accent" />
                    {isRTL ? 'حالة الحجوزات' : 'Booking Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {bookingPieData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      {isRTL ? 'لا توجد بيانات' : 'No data'}
                    </div>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={bookingPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {bookingPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contract Status Pie */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    {isRTL ? 'حالة العقود' : 'Contract Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {contractPieData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      {isRTL ? 'لا توجد بيانات' : 'No data'}
                    </div>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={contractPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {contractPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reviews Distribution */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <Star className="w-4 h-4 text-warning" />
                    {isRTL ? 'توزيع التقييمات' : 'Rating Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reviewsDist} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <YAxis type="category" dataKey="stars" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lead activity (P5.1) */}
            <ProviderLeadAnalytics businessId={business?.id} period={period} />

            {/* Actionable tips (P5.4) */}
            <ProviderTipsCard businessId={business?.id} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalytics;
