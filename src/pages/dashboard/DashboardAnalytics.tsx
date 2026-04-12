import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, TrendingUp, DollarSign, Users, FileText, Star,
  CalendarClock, Eye, ArrowUpRight, ArrowDownRight, Minus,
  PieChart as PieChartIcon, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

const CHART_COLORS = [
  'hsl(var(--accent))', 'hsl(270 50% 60%)', 'hsl(150 50% 50%)',
  'hsl(200 70% 55%)', 'hsl(0 60% 55%)', 'hsl(40 80% 55%)',
];

const tooltipStyle = {
  borderRadius: 12, fontSize: 11,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
};

type Period = '7d' | '30d' | '90d' | '12m';

const DashboardAnalytics = () => {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [period, setPeriod] = useState<Period>('30d');

  usePageMeta({
    title: isRTL ? 'التحليلات | فنيين' : 'Analytics | Faneen',
    noindex: true,
  });

  // Get business
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id, name_ar, name_en, created_at, rating_avg, rating_count')
        .eq('user_id', user!.id).eq('is_active', true).maybeSingle();
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
        supabase.from('contracts').select('id, status, total_amount, created_at, currency_code')
          .or(`provider_id.eq.${user!.id},business_id.eq.${business.id}`)
          .gte('created_at', start),
        supabase.from('bookings').select('id, status, booking_date, created_at')
          .eq('business_id', business.id)
          .gte('created_at', start),
        supabase.from('reviews').select('id, rating, created_at')
          .eq('business_id', business.id)
          .gte('created_at', start),
        supabase.from('business_services').select('id')
          .eq('business_id', business.id).eq('is_active', true),
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

  const periodOptions = [
    { value: '7d', label: isRTL ? '7 أيام' : '7 days' },
    { value: '30d', label: isRTL ? '30 يوم' : '30 days' },
    { value: '90d', label: isRTL ? '90 يوم' : '90 days' },
    { value: '12m', label: isRTL ? '12 شهر' : '12 months' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
              <BarChart3 className="inline-block w-6 h-6 me-2 text-accent" />
              {isRTL ? 'التحليلات والإحصائيات' : 'Analytics & Insights'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'نظرة شاملة على أداء منشأتك' : 'Comprehensive performance overview'}
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading || !stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: DollarSign, label: isRTL ? 'الإيرادات' : 'Revenue', value: `${stats.totalRevenue.toLocaleString()}`, sub: isRTL ? 'ر.س' : 'SAR', color: 'bg-emerald-500/10 text-emerald-600' },
                { icon: FileText, label: isRTL ? 'العقود' : 'Contracts', value: stats.totalContracts, sub: `${stats.activeContracts} ${isRTL ? 'نشط' : 'active'}`, color: 'bg-accent/10 text-accent' },
                { icon: CalendarClock, label: isRTL ? 'الحجوزات' : 'Bookings', value: stats.totalBookings, sub: `${stats.confirmedBookings} ${isRTL ? 'مؤكد' : 'confirmed'}`, color: 'bg-blue-500/10 text-blue-600' },
                { icon: Star, label: isRTL ? 'التقييم' : 'Rating', value: stats.avgRating, sub: `${stats.totalReviews} ${isRTL ? 'تقييم' : 'reviews'}`, color: 'bg-amber-500/10 text-amber-600' },
                { icon: Eye, label: isRTL ? 'المشاهدات' : 'Views', value: stats.totalViews.toLocaleString(), color: 'bg-purple-500/10 text-purple-600' },
                { icon: Activity, label: isRTL ? 'الخدمات' : 'Services', value: stats.servicesCount, color: 'bg-primary/10 text-primary' },
                { icon: Users, label: isRTL ? 'حجوزات مكتملة' : 'Completed', value: stats.completedBookings, color: 'bg-emerald-500/10 text-emerald-600' },
                { icon: TrendingUp, label: isRTL ? 'عقود مكتملة' : 'Done Contracts', value: stats.completedContracts, color: 'bg-accent/10 text-accent' },
              ].map((s, i) => (
                <Card key={i} className="border-border/40">
                  <CardContent className="p-3 sm:p-4">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', s.color)}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <p className="text-lg sm:text-xl font-bold leading-none tech-content">{s.value}</p>
                    {s.sub && <p className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Revenue Chart */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  {isRTL ? 'الإيرادات' : 'Revenue'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" fill="url(#revGrad)" strokeWidth={2} />
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
                    <CalendarClock className="w-4 h-4 text-blue-500" />
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
                        <Bar dataKey="count" fill="hsl(200 70% 55%)" radius={[4, 4, 0, 0]} />
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
                    <Star className="w-4 h-4 text-amber-500" />
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
                        <Bar dataKey="count" fill="hsl(40 80% 55%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalytics;
