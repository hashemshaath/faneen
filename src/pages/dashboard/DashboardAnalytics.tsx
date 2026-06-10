import React, { useMemo, useState } from 'react';
import { pickBi } from "@/components/common/Bilingual";
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  FileDown, X as XIcon, Filter,
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
import { ProviderAnalyticsCharts } from '@/components/dashboard/ProviderAnalyticsCharts';
import { listOverdueInstallmentPayments } from '@/modules/contracts';
import { exportAnalyticsPdf } from '@/lib/analytics-pdf-export';
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
    title: pickBi(isRTL, 'التحليلات | قِطاعات', 'Analytics | Qitaat'),
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
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
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

  // Previous-period range (for trend deltas) — computed alongside main range
  // so we can fetch current + previous data in a single batched query.
  const prevRange = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const span = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - span);
    return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
  }, [dateRange]);

  // Fetch current + previous + entity counts in ONE batched query.
  // Reduces React Query overhead (1 query instead of 2) and parallelizes all
  // 9 Supabase calls. Aggressive caching keeps the page snappy on revisit.
  const { data: bundle, isLoading } = useQuery({
    queryKey: ['provider-analytics', business?.id, period],
    queryFn: async () => {
      if (!business) return null;
      const { start } = dateRange;
      const prevStart = prevRange.start;
      const prevEnd = prevRange.end;

      const [
        contracts, bookings, reviews, services, projects, portfolio,
        prevContracts, prevBookings, prevReviews,
      ] = await Promise.all([
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
        listContractsForProviderOrBusiness<{ id: string; status: string; total_amount: number | null; created_at: string }>({
          userId: user!.id,
          businessId: business.id,
          select: 'id, status, total_amount, created_at',
          gteCreatedAt: prevStart,
        }).then((r) => ({ data: (r.data ?? []).filter((c) => c.created_at <= prevEnd) })),
        supabase.from('bookings').select('id, status, created_at')
          .eq('business_id', business.id)
          .gte('created_at', prevStart).lte('created_at', prevEnd),
        supabase.from('reviews').select('id, rating, created_at')
          .eq('business_id', business.id)
          .gte('created_at', prevStart).lte('created_at', prevEnd),
      ]);

      const prevContractsArr = prevContracts.data ?? [];
      const prevReviewsArr = prevReviews.data ?? [];
      const prevRevenue = prevContractsArr
        .filter((c) => ['completed', 'active'].includes(c.status))
        .reduce((s, c) => s + Number(c.total_amount || 0), 0);

      return {
        contracts: contracts.data || [],
        bookings: bookings.data || [],
        reviews: reviews.data || [],
        servicesCount: services.data?.length || 0,
        projectsCount: projects.data?.length || 0,
        portfolioCount: portfolio.data?.length || 0,
        prev: {
          revenue: prevRevenue,
          contracts: prevContractsArr.length,
          bookings: (prevBookings.data ?? []).length,
          avgRating: prevReviewsArr.length
            ? prevReviewsArr.reduce((s, r) => s + r.rating, 0) / prevReviewsArr.length
            : 0,
        },
      };
    },
    enabled: !!business,
    // Aggressive caching: 5 min fresh, 30 min in cache.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });

  const analytics = bundle;
  const prevAnalytics = bundle?.prev;

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
          date: format(m, pickBi(isRTL, 'MMM', 'MMM yy')),
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
      { name: pickBi(isRTL, 'مؤكد', 'Confirmed'),  key: 'confirmed', value: stats.confirmedBookings },
      { name: pickBi(isRTL, 'مكتمل', 'Completed'), key: 'completed', value: stats.completedBookings },
      { name: pickBi(isRTL, 'بانتظار', 'Pending'), key: 'pending',   value: stats.pendingBookings },
      { name: pickBi(isRTL, 'ملغي', 'Cancelled'),  key: 'cancelled', value: stats.cancelledBookings },
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
      name: labels[status]?.[pickBi(isRTL, 'ar', 'en')] || status,
      key: status,
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
          date: format(m, pickBi(isRTL, 'MMM', 'MMM yy')),
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
    { value: '7d', label: pickBi(isRTL, '7 أيام', '7d') },
    { value: '30d', label: pickBi(isRTL, '30 يوم', '30d') },
    { value: '90d', label: pickBi(isRTL, '90 يوم', '90d') },
    { value: '12m', label: pickBi(isRTL, '12 شهر', '12m') },
  ];

  const trend = (curr: number, prev: number | undefined): { up?: boolean; label: string } | undefined => {
    if (prev === undefined || prev === null) return undefined;
    // Suppress noisy "0%" badges when there's no baseline AND no current value —
    // showing "0%" on every tile when the account has no data yet looks broken.
    if (prev === 0 && curr === 0) return undefined;
    if (prev === 0) return { up: true, label: '+∞' };
    const pct = ((curr - prev) / prev) * 100;
    const sign = pct > 0 ? '+' : '';
    return { up: pct >= 0, label: `${sign}${pct.toFixed(0)}%` };
  };

  const qc = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date());
  const refetchAll = async () => {
    await qc.invalidateQueries({ queryKey: ['provider-analytics'] });
    setLastRefreshed(new Date());
  };

  // Overdue installments — real data for the analytics chart's KPI strip.
  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['provider-analytics-overdue', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await listOverdueInstallmentPayments(today, 50);
      return (data ?? []).length;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

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

  // PDF export — bilingual report with KPIs + breakdowns + revenue series.
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const downloadPdf = async () => {
    if (!analytics || !stats || !business) return;
    setIsExportingPdf(true);
    try {
      await exportAnalyticsPdf({
        isRTL,
        businessName: (isRTL ? business.name_ar : (business.name_en || business.name_ar)) ?? '—',
        periodLabel: periodOptions.find((o) => o.value === period)?.label ?? period,
        generatedAt: new Date(),
        stats,
        revenueSeries: revenueChartData,
        contractStatusBreakdown: contractPieData,
        bookingStatusBreakdown: bookingPieData,
        reviewsDistribution: reviewsDist,
        overdueCount,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── Drilldown: clicking a chart segment filters the analytics rows
  //    into an inline table (no popups, fully accessible).
  type DrillKind = 'contract' | 'booking' | 'rating';
  const [drill, setDrill] = useState<{ kind: DrillKind; key: string; label: string } | null>(null);

  const drillRows = useMemo(() => {
    if (!drill || !analytics) return [] as Array<Record<string, string | number | null>>;
    if (drill.kind === 'contract') {
      return analytics.contracts
        .filter((c) => c.status === drill.key)
        .map((c) => ({
          id: c.id, status: c.status,
          amount: Number(c.total_amount ?? 0),
          currency: c.currency_code ?? 'SAR',
          created_at: c.created_at,
        }));
    }
    if (drill.kind === 'booking') {
      return analytics.bookings
        .filter((b) => b.status === drill.key)
        .map((b) => ({
          id: b.id, status: b.status,
          created_at: b.created_at,
        }));
    }
    return analytics.reviews
      .filter((r) => String(r.rating) === drill.key)
      .map((r) => ({ id: r.id, rating: r.rating, created_at: r.created_at }));
  }, [drill, analytics]);

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
      {/* `.dash-emerald` activates the bento grid + tile design tokens
          (scoped in dashboard-emerald.css). Without it, .dash-bento /
          .dash-tile / .bento-feature lose their grid + surface styles. */}
      <div className="dash-emerald space-y-5">
        {/* Brand-aligned hero (Qitaat: primary green + info blue, no off-brand gold) */}
        <section
          aria-label={pickBi(isRTL, 'مركز التحليلات', 'Analytics center')}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/8 via-card to-info/5 p-5 sm:p-7 shadow-[var(--elev-1)]"
        >
          <div className="pointer-events-none absolute -top-24 -end-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1 bg-primary/10 text-primary border border-primary/15">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {pickBi(isRTL, 'مركز التحليلات', 'Analytics center')}
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
                {pickBi(isRTL, 'التحليلات والإحصائيات', 'Analytics & Insights')}
              </h1>
              <p className="text-xs sm:text-sm text-foreground/80 max-w-xl">
                {pickBi(isRTL, 'مؤشرات أداء حية، مقارنات بين الفترات، تسليم العقود، المتأخرات، وتصدير فوري للبيانات.', 'Live KPIs, period comparisons, contract delivery, overdue payments, and instant CSV export.')}
              </p>
              <p className="text-[10px] tech-content text-muted-foreground">
                {pickBi(isRTL, 'آخر تحديث', 'Updated')} · {format(lastRefreshed, 'HH:mm:ss')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex rounded-full bg-muted/40 border border-border/60 p-1" role="tablist" aria-label={pickBi(isRTL, 'اختيار الفترة', 'Select period')}>
                {periodOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={period === o.value}
                    onClick={() => setPeriod(o.value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition tech-content',
                      period === o.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={refetchAll}>
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} aria-hidden="true" />
                {pickBi(isRTL, 'تحديث', 'Refresh')}
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={downloadCsv} disabled={!stats}>
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {pickBi(isRTL, 'CSV', 'CSV')}
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={downloadPdf} disabled={!stats || isExportingPdf}>
                <FileDown className={cn('w-3.5 h-3.5', isExportingPdf && 'animate-pulse')} aria-hidden="true" />
                {isRTL ? (isExportingPdf ? 'جارٍ التصدير…' : 'تصدير PDF') : (isExportingPdf ? 'Exporting…' : 'Export PDF')}
              </Button>
            </div>
          </div>
        </section>

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
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-info/5 shadow-[var(--elev-1)]">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Sparkles className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {pickBi(isRTL, 'رؤية ذكية', 'Smart Insight')}
                    </p>
                    <p className="text-sm font-semibold">
                      {insight.bestDate ? (
                        pickBi(isRTL, `أعلى يوم إيراد كان ${insight.bestDate} بمبلغ ${insight.bestRevenue.toLocaleString()} ر.س`, `Top revenue day was ${insight.bestDate} with ${insight.bestRevenue.toLocaleString()} SAR`)
                      ) : pickBi(isRTL, 'لا توجد إيرادات في هذه الفترة بعد', 'No revenue in this period yet')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">
                      {pickBi(isRTL, 'معدل الإنجاز', 'Completion Rate')}
                    </p>
                    <p className="text-2xl font-bold tech-content text-success">
                      {insight.convRate}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty-state banner — surfaced when the account has zero activity
                in the selected period. Replaces noisy zeroed charts/badges with
                a clear, professional message and next-step CTAs. */}
            {stats.totalContracts === 0 && stats.totalBookings === 0 && stats.totalReviews === 0 && (
              <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-info/5">
                <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shrink-0">
                    <Sparkles className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm sm:text-base font-semibold">
                      {pickBi(isRTL, 'لا توجد نشاطات في هذه الفترة بعد', 'No activity in this period yet')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      {pickBi(isRTL, 'ستظهر مؤشرات الأداء والرسوم البيانية تلقائيًا فور توفر بيانات حقيقية من العقود والحجوزات والتقييمات.', 'KPIs and charts will appear automatically once real contract, booking, and review data is available.')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                      <a href="/dashboard/services">{pickBi(isRTL, 'إدارة الخدمات', 'Manage services')}</a>
                    </Button>
                    <Button asChild size="sm" className="h-8 text-xs">
                      <a href="/dashboard/business-completion">{pickBi(isRTL, 'أكمل ملفك', 'Complete profile')}</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bento KPI grid */}
            <div className="dash-bento">
              <BentoTile
                variant="feature"
                icon={DollarSign}
                label={pickBi(isRTL, 'إجمالي الإيرادات', 'Total Revenue')}
                value={
                  <>
                    {stats.totalRevenue.toLocaleString()}{' '}
                    <span className="text-base font-normal text-muted-foreground">{pickBi(isRTL, 'ر.س', 'SAR')}</span>
                  </>
                }
                sub={`${stats.activeContracts + stats.completedContracts} ${pickBi(isRTL, 'عقد مُولِّد', 'earning contracts')}`}
                trend={trend(stats.totalRevenue, prevAnalytics?.revenue)}
                accent="emerald"
              />
              <BentoTile
                icon={FileText}
                label={pickBi(isRTL, 'العقود', 'Contracts')}
                value={stats.totalContracts}
                sub={`${stats.activeContracts} ${pickBi(isRTL, 'نشط', 'active')} · ${stats.completedContracts} ${pickBi(isRTL, 'مكتمل', 'done')}`}
                trend={trend(stats.totalContracts, prevAnalytics?.contracts)}
              />
              <BentoTile
                icon={CalendarClock}
                label={pickBi(isRTL, 'الحجوزات', 'Bookings')}
                value={stats.totalBookings}
                sub={`${stats.confirmedBookings} ${pickBi(isRTL, 'مؤكد', 'confirmed')}`}
                trend={trend(stats.totalBookings, prevAnalytics?.bookings)}
              />
              <BentoTile
                icon={Star}
                label={pickBi(isRTL, 'متوسط التقييم', 'Avg. Rating')}
                value={stats.avgRating}
                sub={`${stats.totalReviews} ${pickBi(isRTL, 'تقييم', 'reviews')}`}
                trend={prevAnalytics ? trend(Number(stats.avgRating), prevAnalytics.avgRating) : undefined}
                accent="neutral"
              />
              <BentoTile
                icon={Briefcase}
                label={pickBi(isRTL, 'المشاريع', 'Projects')}
                value={stats.projectsCount}
              />
              <BentoTile
                icon={Activity}
                label={pickBi(isRTL, 'الخدمات النشطة', 'Active Services')}
                value={stats.servicesCount}
              />
              <BentoTile
                icon={Users}
                label={pickBi(isRTL, 'حجوزات مكتملة', 'Completed Bookings')}
                value={stats.completedBookings}
              />
              <BentoTile
                icon={TrendingUp}
                label={pickBi(isRTL, 'عقود مكتملة', 'Done Contracts')}
                value={stats.completedContracts}
              />
            </div>

            {/* Unified analytics charts (delivery, overdue, status, monthly sales) */}
            <ProviderAnalyticsCharts
              isRTL={isRTL}
              contracts={analytics?.contracts ?? []}
              monthlyRevenue={revenueChartData.map((d) => ({ month: d.date, revenue: d.revenue }))}
              overdueCount={overdueCount}
            />

            {/* Revenue Chart */}
            <Card className="border-border/40 shadow-elev-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    {pickBi(isRTL, 'تطور الإيرادات', 'Revenue Trend')}
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
                              {pickBi(isRTL, 'مقابل السابق', 'vs prev')}
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
                    {pickBi(isRTL, 'الحجوزات', 'Bookings')}
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
                    {pickBi(isRTL, 'حالة الحجوزات', 'Booking Status')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {bookingPieData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      {pickBi(isRTL, 'لا توجد بيانات', 'No data')}
                    </div>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={bookingPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                            className="cursor-pointer focus:outline-none"
                            onClick={(p: { key?: string; name?: string }) => p?.key && setDrill({ kind: 'booking', key: p.key, label: p.name ?? p.key })}>
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
                    {pickBi(isRTL, 'حالة العقود', 'Contract Status')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {contractPieData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      {pickBi(isRTL, 'لا توجد بيانات', 'No data')}
                    </div>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={contractPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                            className="cursor-pointer focus:outline-none"
                            onClick={(p: { key?: string; name?: string }) => p?.key && setDrill({ kind: 'contract', key: p.key, label: p.name ?? p.key })}>
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
                    {pickBi(isRTL, 'توزيع التقييمات', 'Rating Distribution')}
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
                       <Bar dataKey="count" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} className="cursor-pointer"
                         onClick={(p: { stars?: string }) => {
                           const m = typeof p?.stars === 'string' ? p.stars.match(/^(\d+)/) : null;
                           if (m) setDrill({ kind: 'rating', key: m[1], label: p.stars! });
                         }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Drilldown — inline table showing rows behind the clicked chart segment */}
            {drill && (
              <Card className="border-primary/30 shadow-[var(--elev-1)]" aria-live="polite">
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-heading flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" aria-hidden="true" />
                      {pickBi(isRTL, 'تفاصيل الفلتر', 'Filtered details')}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {pickBi(isRTL, 'البند:', 'Segment:')}{' '}
                      <span className="font-semibold text-foreground">{drill.label}</span>
                      {' · '}
                      <span className="tech-content">{drillRows.length}</span>{' '}
                      {pickBi(isRTL, 'سجل', 'rows')}
                      {' · '}
                      <span>{periodOptions.find((o) => o.value === period)?.label}</span>
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setDrill(null)}>
                    <XIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {pickBi(isRTL, 'إغلاق', 'Close')}
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {drillRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      {pickBi(isRTL, 'لا توجد سجلات في هذا الفلتر للفترة المحددة.', 'No records for this filter in the selected period.')}
                    </p>
                  ) : (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-start text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/40">
                            <th className="px-2 py-2 text-start">{pickBi(isRTL, 'المعرّف', 'ID')}</th>
                            {drill.kind === 'contract' && (
                              <th className="px-2 py-2 text-start">{pickBi(isRTL, 'المبلغ', 'Amount')}</th>
                            )}
                            <th className="px-2 py-2 text-start">
                              {drill.kind === 'rating' ? (pickBi(isRTL, 'التقييم', 'Rating')) : (pickBi(isRTL, 'الحالة', 'Status'))}
                            </th>
                            <th className="px-2 py-2 text-start">{pickBi(isRTL, 'التاريخ', 'Date')}</th>
                            <th className="px-2 py-2 text-end">{pickBi(isRTL, 'إجراء', 'Action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drillRows.slice(0, 100).map((row) => (
                            <tr key={String(row.id)} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                              <td className="px-2 py-2 tech-content text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {String(row.id).slice(0, 8)}…
                              </td>
                              {drill.kind === 'contract' && (
                                <td className="px-2 py-2 tech-content font-semibold">
                                  {Number(row.amount ?? 0).toLocaleString()} {String(row.currency ?? 'SAR')}
                                </td>
                              )}
                              <td className="px-2 py-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {String(row.status ?? row.rating ?? '—')}
                                </Badge>
                              </td>
                              <td className="px-2 py-2 tech-content text-[10px] text-muted-foreground whitespace-nowrap">
                                {row.created_at ? format(new Date(String(row.created_at)), 'yyyy-MM-dd') : '—'}
                              </td>
                              <td className="px-2 py-2 text-end">
                                {drill.kind === 'contract' && (
                                  <a href={`/contracts/${row.id}`} className="text-primary text-[11px] underline-offset-2 hover:underline">
                                    {pickBi(isRTL, 'فتح', 'Open')}
                                  </a>
                                )}
                                {drill.kind === 'booking' && (
                                  <a href={`/dashboard/bookings`} className="text-primary text-[11px] underline-offset-2 hover:underline">
                                    {pickBi(isRTL, 'فتح', 'Open')}
                                  </a>
                                )}
                                {drill.kind === 'rating' && (
                                  <a href={`/dashboard/reviews`} className="text-primary text-[11px] underline-offset-2 hover:underline">
                                    {pickBi(isRTL, 'فتح', 'Open')}
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {drillRows.length > 100 && (
                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                          {pickBi(isRTL, `عرض أول 100 من ${drillRows.length}`, `Showing first 100 of ${drillRows.length}`)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
