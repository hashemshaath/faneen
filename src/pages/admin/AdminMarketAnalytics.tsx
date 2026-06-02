import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Eye, Link2, Globe, BarChart3,
  ExternalLink,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ALL_SECTORS, SECTOR_KEYWORDS, type SectorSlug } from '@/lib/sector-keywords';
import { SA_CITIES } from '@/lib/sa-cities';

type Days = 7 | 30 | 90;

interface SectorCityRow {
  sector_slug: string;
  city_slug: string | null;
  visits_current: number;
  visits_previous: number;
  growth_pct: number | null;
  unique_referrers: number;
  backlink_visits: number;
}

interface ReferrerRow {
  referrer_host: string;
  sector_slug: string;
  visits: number;
  first_seen: string;
  last_seen: string;
}

interface TimeseriesRow {
  day: string;
  sector_slug: string;
  visits: number;
}

const sectorName = (slug: string, ar: boolean): string => {
  const s = SECTOR_KEYWORDS[slug as SectorSlug];
  if (!s) return slug;
  return ar ? s.name_ar : s.name_en;
};

const cityName = (slug: string | null, ar: boolean): string => {
  if (!slug) return ar ? 'كل المدن' : 'All cities';
  const c = SA_CITIES.find(x => x.slug === slug);
  if (!c) return slug;
  return ar ? c.nameAr : c.nameEn;
};

const GrowthCell: React.FC<{ pct: number | null }> = ({ pct }) => {
  if (pct == null) return <span className="text-xs text-muted-foreground">—</span>;
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tech-content">
        <Minus className="w-3 h-3" />0%
      </span>
    );
  }
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const cls = up ? 'text-success' : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${cls} tech-content`}>
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
};

const KpiCard: React.FC<{ label: string; value: string | number; icon: React.ElementType; hint?: string }> = ({
  label, value, icon: Icon, hint,
}) => (
  <Card className="hover-lift">
    <CardContent className="p-5 flex items-start justify-between gap-3">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tech-content">{value}</div>
        {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="p-2 rounded-xl bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </div>
    </CardContent>
  </Card>
);

const AdminMarketAnalytics: React.FC = () => {
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? 'تحليلات السوق | لوحة المشرف' : 'Market Analytics | Admin',
    noindex: true,
  });
  useNoIndex();

  const [days, setDays] = useState<Days>(30);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  // Sector × city aggregated stats
  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['market-stats', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('market_sector_city_stats' as never, { p_days: days } as never);
      if (error) throw error;
      return (data ?? []) as unknown as SectorCityRow[];
    },
  });

  // Top referrers (backlinks)
  const { data: referrers = [], isLoading: refLoading } = useQuery({
    queryKey: ['market-referrers', days, sectorFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('market_top_referrers' as never, {
        p_days: days,
        p_sector: sectorFilter === 'all' ? null : sectorFilter,
        p_limit: 50,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as ReferrerRow[];
    },
  });

  // Daily timeseries
  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['market-series', days, sectorFilter, cityFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('market_visits_timeseries' as never, {
        p_days: days,
        p_sector: sectorFilter === 'all' ? null : sectorFilter,
        p_city: cityFilter === 'all' ? null : cityFilter,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as TimeseriesRow[];
    },
  });

  // Filter table rows by sector/city dropdowns
  const filteredStats = useMemo(() => {
    return stats.filter(r =>
      (sectorFilter === 'all' || r.sector_slug === sectorFilter) &&
      (cityFilter === 'all' || (r.city_slug ?? '') === cityFilter),
    );
  }, [stats, sectorFilter, cityFilter]);

  // KPIs
  const totals = useMemo(() => {
    const cur = filteredStats.reduce((a, r) => a + Number(r.visits_current ?? 0), 0);
    const prev = filteredStats.reduce((a, r) => a + Number(r.visits_previous ?? 0), 0);
    const growth = prev === 0 ? null : ((cur - prev) / prev) * 100;
    const backlinks = filteredStats.reduce((a, r) => a + Number(r.backlink_visits ?? 0), 0);
    const uniqRef = new Set(referrers.map(r => r.referrer_host)).size;
    return { cur, prev, growth, backlinks, uniqRef };
  }, [filteredStats, referrers]);

  // Aggregate timeseries (sum across sectors per day for the chart)
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of series) {
      map.set(row.day, (map.get(row.day) ?? 0) + Number(row.visits ?? 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, visits]) => ({ day: day.slice(5), visits }));
  }, [series]);

  // Top keywords aggregated from sector-keywords lib (filtered by sector)
  const topKeywords = useMemo(() => {
    const sectors = sectorFilter === 'all'
      ? ALL_SECTORS
      : ALL_SECTORS.filter(s => s.slug === sectorFilter);
    const out: Array<{ keyword: string; sector: string; lang: 'ar' | 'en' }> = [];
    sectors.forEach(s => {
      s.keywords_ar.forEach(k => out.push({ keyword: k, sector: s.slug, lang: 'ar' }));
      s.keywords_en.forEach(k => out.push({ keyword: k, sector: s.slug, lang: 'en' }));
    });
    return out;
  }, [sectorFilter]);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <AdminPageHeader
          icon={BarChart3}
          tone="info"
          eyebrow={isRTL ? 'الإدارة' : 'Admin'}
          title={isRTL ? 'تحليلات السوق والقطاعات' : 'Market & Sector Analytics'}
          subtitle={isRTL
            ? 'نمو الزيارات والروابط المكتسبة وأهم الكلمات المفتاحية لكل قطاع ومدينة.'
            : 'Visit growth, acquired backlinks and top keywords per sector × city.'}
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'تحليلات السوق' : 'Market Analytics' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as Days)}>
              <SelectTrigger className="w-[140px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{isRTL ? 'آخر 7 أيام' : 'Last 7 days'}</SelectItem>
                <SelectItem value="30">{isRTL ? 'آخر 30 يوماً' : 'Last 30 days'}</SelectItem>
                <SelectItem value="90">{isRTL ? 'آخر 90 يوماً' : 'Last 90 days'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[160px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل القطاعات' : 'All sectors'}</SelectItem>
                {ALL_SECTORS.map(s => (
                  <SelectItem key={s.slug} value={s.slug}>{isRTL ? s.name_ar : s.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[160px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل المدن' : 'All cities'}</SelectItem>
                {SA_CITIES.map(c => (
                  <SelectItem key={c.slug} value={c.slug}>{isRTL ? c.nameAr : c.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label={isRTL ? 'الزيارات الحالية' : 'Visits (current)'}
            value={totals.cur.toLocaleString('en-US')}
            icon={Eye}
            hint={isRTL ? `السابق: ${totals.prev.toLocaleString('en-US')}` : `Previous: ${totals.prev.toLocaleString('en-US')}`}
          />
          <Card className="hover-lift">
            <CardContent className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">{isRTL ? 'النمو' : 'Growth'}</div>
                <div className="mt-1 text-2xl font-bold"><GrowthCell pct={totals.growth} /></div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {isRTL ? `مقارنة ${days} يوم سابقة` : `vs previous ${days} days`}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-success/10 text-success"><TrendingUp className="w-5 h-5" /></div>
            </CardContent>
          </Card>
          <KpiCard
            label={isRTL ? 'زيارات من روابط خارجية' : 'Backlink visits'}
            value={totals.backlinks.toLocaleString('en-US')}
            icon={Link2}
          />
          <KpiCard
            label={isRTL ? 'مواقع روابط فريدة' : 'Unique referring sites'}
            value={totals.uniqRef.toLocaleString('en-US')}
            icon={Globe}
          />
        </div>

        {/* Visits chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isRTL ? 'نمو الزيارات اليومية' : 'Daily visit growth'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seriesLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                {isRTL ? 'لا توجد بيانات بعد لهذه الفترة.' : 'No data for this period yet.'}
              </div>
            ) : (
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fill="url(#vGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: combos / referrers / keywords */}
        <Tabs defaultValue="combos">
          <TabsList>
            <TabsTrigger value="combos">{isRTL ? 'قطاع × مدينة' : 'Sector × City'}</TabsTrigger>
            <TabsTrigger value="referrers">{isRTL ? 'الروابط المكتسبة' : 'Acquired backlinks'}</TabsTrigger>
            <TabsTrigger value="keywords">{isRTL ? 'الكلمات المفتاحية' : 'Top keywords'}</TabsTrigger>
          </TabsList>

          {/* Sector × city */}
          <TabsContent value="combos" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {statsLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : filteredStats.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {isRTL ? 'لا توجد زيارات بعد ضمن المرشّحات الحالية.' : 'No visits yet for current filters.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRTL ? 'القطاع' : 'Sector'}</TableHead>
                        <TableHead>{isRTL ? 'المدينة' : 'City'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'الزيارات' : 'Visits'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'السابق' : 'Previous'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'النمو' : 'Growth'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'روابط فريدة' : 'Unique refs'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'زيارات روابط' : 'Backlink visits'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStats.map((r, i) => (
                        <TableRow key={`${r.sector_slug}-${r.city_slug ?? 'all'}-${i}`}>
                          <TableCell className="font-medium">{sectorName(r.sector_slug, isRTL)}</TableCell>
                          <TableCell>
                            {r.city_slug
                              ? cityName(r.city_slug, isRTL)
                              : <Badge variant="outline" className="text-[10px]">{isRTL ? 'صفحة القطاع' : 'Sector page'}</Badge>}
                          </TableCell>
                          <TableCell className="text-end tech-content">{Number(r.visits_current).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-end tech-content text-muted-foreground">{Number(r.visits_previous).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-end"><GrowthCell pct={r.growth_pct == null ? null : Number(r.growth_pct)} /></TableCell>
                          <TableCell className="text-end tech-content">{Number(r.unique_referrers).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-end tech-content">{Number(r.backlink_visits).toLocaleString('en-US')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrers */}
          <TabsContent value="referrers" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {refLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : referrers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {isRTL
                      ? 'لم يتم رصد روابط خارجية بعد. سيظهر هنا أي موقع يربط ويرسل زواراً.'
                      : 'No external referrers yet. Sites that link to you and send visits will appear here.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRTL ? 'الموقع' : 'Site'}</TableHead>
                        <TableHead>{isRTL ? 'القطاع' : 'Sector'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'الزيارات' : 'Visits'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'أول ظهور' : 'First seen'}</TableHead>
                        <TableHead className="text-end">{isRTL ? 'آخر ظهور' : 'Last seen'}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrers.map((r, i) => (
                        <TableRow key={`${r.referrer_host}-${r.sector_slug}-${i}`}>
                          <TableCell className="font-medium tech-content">{r.referrer_host}</TableCell>
                          <TableCell>{sectorName(r.sector_slug, isRTL)}</TableCell>
                          <TableCell className="text-end tech-content">{Number(r.visits).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-end tech-content text-xs text-muted-foreground">
                            {new Date(r.first_seen).toISOString().slice(0, 10)}
                          </TableCell>
                          <TableCell className="text-end tech-content text-xs text-muted-foreground">
                            {new Date(r.last_seen).toISOString().slice(0, 10)}
                          </TableCell>
                          <TableCell className="text-end">
                            <a
                              href={`https://${r.referrer_host}`}
                              target="_blank"
                              rel="noreferrer noopener nofollow"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {isRTL ? 'فتح' : 'Open'}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords */}
          <TabsContent value="keywords" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? 'الكلمات المفتاحية المستهدَفة' : 'Targeted keywords'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'مرجع الكلمات المفتاحية المستخدمة في ميتا OG و JSON-LD لكل قطاع. غيّر فلتر القطاع لتصفية القائمة.'
                    : 'Reference keywords used across OG meta and JSON-LD per sector. Filter by sector above.'}
                </p>
              </CardHeader>
              <CardContent>
                {topKeywords.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد كلمات.' : 'No keywords.'}</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topKeywords.map((k, i) => (
                      <Badge
                        key={`${k.sector}-${k.lang}-${i}`}
                        variant={k.lang === 'ar' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {k.keyword}
                        <span className="ms-1 opacity-60 tech-content">· {sectorName(k.sector, isRTL)}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminMarketAnalytics;
