/**
 * Rentals Performance & Revenue Analytics — v2 (professional UX)
 * -----------------------------------------------------------------------------
 * - Sticky filter bar: range (30/90/180/365), item, status, search, refresh, export
 * - 5 KPI tiles with vs-previous-period delta
 * - Combined revenue + orders trend (LineChart, dual axis)
 * - Status: bar (revenue) + pie (orders) side by side
 * - Daily bookings area
 * - Top 10 items with normalized progress bars + link to item detail
 * - Friendly empty state, skeleton loaders, print-friendly
 * - Fully RTL/LTR aware, semantic headings, a11y labels, no popups.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Clock, Package,
  Download, Loader2, Percent, ShoppingCart, Search, RefreshCw,
  Printer, ArrowUpRight, Sparkles, X, AlertTriangle, FileText,
  FileSpreadsheet, Bell, BellOff,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { RentalItems, RentalOrders } from '@/modules/rentals';
import type { RentalItem, RentalOrder, RentalOrderStatus } from '@/modules/rentals';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/* ---------------- helpers ---------------- */
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const fmtMoney = (n: number, ccy = 'SAR') =>
  `${Math.round(n).toLocaleString('en-US')} ${ccy}`;
const fmtCompact = (n: number) =>
  Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const STATUS_LABEL: Record<RentalOrderStatus, { ar: string; en: string; color: string }> = {
  draft:         { ar: 'مسودة',        en: 'Draft',     color: '#94a3b8' },
  active:        { ar: 'نشط',          en: 'Active',    color: '#10b981' },
  expiring_soon: { ar: 'قرب الانتهاء', en: 'Expiring',  color: '#f59e0b' },
  expired:       { ar: 'منتهي',        en: 'Expired',   color: '#ef4444' },
  extended:      { ar: 'ممدد',         en: 'Extended',  color: '#0ea5e9' },
  renewed:       { ar: 'مجدد',         en: 'Renewed',   color: '#6366f1' },
  closed:        { ar: 'مغلق',         en: 'Closed',    color: '#71717a' },
  cancelled:     { ar: 'ملغى',         en: 'Cancelled', color: '#f43f5e' },
};
const STATUS_KEYS: RentalOrderStatus[] =
  ['draft','active','expiring_soon','expired','extended','renewed','closed','cancelled'];

type Range = '30' | '90' | '180' | '365';
const RANGE_DAYS: Record<Range, number> = { '30': 30, '90': 90, '180': 180, '365': 365 };

/* ---------- persisted filter state ---------- */
const FILTERS_KEY = 'qitaat_rentals_analytics_filters_v1';
const ALERTS_MUTED_KEY = 'qitaat_rentals_analytics_alerts_muted_v1';
type PersistedFilters = { range: Range; itemFilter: string; statusFilter: 'all' | RentalOrderStatus; search: string };
const loadFilters = (): Partial<PersistedFilters> => {
  try { return JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}'); } catch { return {}; }
};

/* ---------- alert type ---------- */
type AlertItem = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: { ar: string; en: string };
  detail: { ar: string; en: string };
};

/* ---------------- page ---------------- */
const DashboardRentalsAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);

  const initial = loadFilters();
  const [range, setRange] = useState<Range>((initial.range as Range) ?? '90');
  const [itemFilter, setItemFilter] = useState<string>(initial.itemFilter ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | RentalOrderStatus>(initial.statusFilter ?? 'all');
  const [search, setSearch] = useState<string>(initial.search ?? '');
  const [alertsMuted, setAlertsMuted] = useState<boolean>(() => {
    try { return localStorage.getItem(ALERTS_MUTED_KEY) === '1'; } catch { return false; }
  });
  const [detail, setDetail] = useState<
    | { kind: 'item'; id: string }
    | { kind: 'status'; status: RentalOrderStatus }
    | null
  >(null);

  /* persist filters */
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({ range, itemFilter, statusFilter, search }));
    } catch { /* ignore */ }
  }, [range, itemFilter, statusFilter, search]);

  const fetchAll = async (bizId: string) => {
    const [it, ord] = await Promise.all([
      RentalItems.listProviderItems(bizId),
      RentalOrders.listOrdersForProvider(bizId),
    ]);
    setItems(it.data ?? []);
    setOrders(ord.data ?? []);
  };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data: biz } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      const bizId = biz?.id ?? null;
      setBusinessId(bizId);
      if (bizId) await fetchAll(bizId);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!businessId) return;
    setRefreshing(true);
    await fetchAll(businessId);
    setRefreshing(false);
    toast.success(bi('تم تحديث البيانات', 'Data refreshed'));
  };

  /* -------- windows: current & previous (same length) -------- */
  const { since, prevSince, prevEnd } = useMemo(() => {
    const today = new Date();
    const span = RANGE_DAYS[range];
    const s = new Date(today); s.setDate(s.getDate() - span);
    const ps = new Date(s);    ps.setDate(ps.getDate() - span);
    const pe = new Date(s);    pe.setDate(pe.getDate() - 1);
    return { since: s, prevSince: ps, prevEnd: pe };
  }, [range]);

  const matchesFilters = (o: RentalOrder) => {
    if (itemFilter !== 'all' && o.rental_item_id !== itemFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim() && !o.ref_id.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  };

  const scoped = useMemo(
    () => orders.filter(o => {
      const d = parseYmd(o.start_date);
      if (d < since) return false;
      if (o.status === 'cancelled' && statusFilter !== 'cancelled' && statusFilter !== 'all') return false;
      return matchesFilters(o);
    }),
    [orders, since, itemFilter, statusFilter, search],
  );

  const prevScoped = useMemo(
    () => orders.filter(o => {
      const d = parseYmd(o.start_date);
      if (d < prevSince || d > prevEnd) return false;
      return matchesFilters(o);
    }),
    [orders, prevSince, prevEnd, itemFilter, statusFilter, search],
  );

  const currency = scoped[0]?.currency ?? items[0]?.currency ?? 'SAR';

  /* -------- KPIs with deltas -------- */
  const calcKpis = (list: RentalOrder[]) => {
    const revenue = list.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const days = list.reduce((s, o) => s + Math.max(1, o.total_days), 0);
    const avgDuration = list.length ? days / list.length : 0;
    const avgTicket = list.length ? revenue / list.length : 0;
    return { revenue, count: list.length, days, avgDuration, avgTicket };
  };
  const cur = useMemo(() => calcKpis(scoped), [scoped]);
  const prv = useMemo(() => calcKpis(prevScoped), [prevScoped]);
  const itemsCount = items.length || 1;
  const occupancyPct = Math.min(100, Math.round((cur.days / (itemsCount * RANGE_DAYS[range])) * 100));
  const prevOccupancyPct = Math.min(100, Math.round((prv.days / (itemsCount * RANGE_DAYS[range])) * 100));

  const delta = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

  /* -------- trend (current + previous overlay) -------- */
  const trend = useMemo(() => {
    const days = RANGE_DAYS[range];
    const bucketSize = days <= 30 ? 1 : days <= 90 ? 7 : 14;
    const buckets: { date: string; revenue: number; orders: number; previous: number }[] = [];
    for (let i = days - 1; i >= 0; i -= bucketSize) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets.push({ date: ymd(d), revenue: 0, orders: 0, previous: 0 });
    }
    const keys = buckets.map(b => b.date);
    const targetKey = (s: string) => keys.find(k => parseYmd(k).getTime() >= parseYmd(s).getTime()) ?? keys[keys.length - 1];
    scoped.forEach(o => {
      const b = buckets.find(x => x.date === targetKey(o.start_date));
      if (b) { b.revenue += Number(o.total_amount || 0); b.orders += 1; }
    });
    // previous overlay aligned by index
    prevScoped.forEach(o => {
      const s = parseYmd(o.start_date);
      const diff = Math.floor((s.getTime() - prevSince.getTime()) / (24 * 3600 * 1000));
      const i = Math.min(buckets.length - 1, Math.max(0, Math.floor(diff / bucketSize)));
      buckets[i].previous += Number(o.total_amount || 0);
    });
    return buckets;
  }, [scoped, prevScoped, range, prevSince]);

  /* -------- status data -------- */
  const statusData = useMemo(() => {
    const map = new Map<RentalOrderStatus, { count: number; revenue: number }>();
    scoped.forEach(o => {
      const c = map.get(o.status) ?? { count: 0, revenue: 0 };
      c.count += 1; c.revenue += Number(o.total_amount || 0);
      map.set(o.status, c);
    });
    return STATUS_KEYS.filter(k => map.has(k)).map(k => {
      const v = map.get(k)!;
      return {
        status: k,
        name: bi(STATUS_LABEL[k].ar, STATUS_LABEL[k].en),
        color: STATUS_LABEL[k].color,
        count: v.count,
        revenue: Math.round(v.revenue),
      };
    });
  }, [scoped, bi]);

  /* -------- daily bookings -------- */
  const daily = useMemo(() => {
    const days = RANGE_DAYS[range];
    const arr: { date: string; bookings: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      arr.push({ date: ymd(d), bookings: 0 });
    }
    const idx = new Map(arr.map((b, i) => [b.date, i]));
    scoped.forEach(o => {
      const i = idx.get(o.start_date.slice(0, 10));
      if (i !== undefined) arr[i].bookings += 1;
    });
    return arr;
  }, [scoped, range]);

  /* -------- top items -------- */
  const topItems = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; days: number }>();
    scoped.forEach(o => {
      const c = map.get(o.rental_item_id) ?? { orders: 0, revenue: 0, days: 0 };
      c.orders += 1; c.revenue += Number(o.total_amount || 0); c.days += Math.max(1, o.total_days);
      map.set(o.rental_item_id, c);
    });
    const rows = Array.from(map.entries())
      .map(([id, v]) => {
        const it = items.find(x => x.id === id);
        return {
          id,
          name: it ? bi(it.name_ar, it.name_en || it.name_ar) : id,
          slug: it?.seo_slug ?? null,
          orders: v.orders,
          revenue: Math.round(v.revenue),
          days: v.days,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const max = Math.max(1, ...rows.map(r => r.revenue));
    return rows.map(r => ({ ...r, pct: Math.round((r.revenue / max) * 100) }));
  }, [scoped, items, bi]);

  /* -------- CSV export -------- */
  const exportCsv = () => {
    const headers = ['ref_id', 'item', 'start_date', 'end_date', 'days', 'status', 'amount', 'currency'];
    const rows = scoped.map(o => {
      const it = items.find(i => i.id === o.rental_item_id);
      const itemName = it ? (it.name_en || it.name_ar) : '';
      return [
        o.ref_id, itemName.replace(/[",\n]/g, ' '),
        o.start_date, o.end_date, o.total_days, o.status, o.total_amount, o.currency,
      ];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rentals-analytics-${range}d-${ymd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(bi('تم تصدير الملف', 'CSV exported'));
  };

  const resetFilters = () => { setItemFilter('all'); setStatusFilter('all'); setSearch(''); };
  const hasActiveFilters = itemFilter !== 'all' || statusFilter !== 'all' || search.trim().length > 0;

  /* ---------------- render ---------------- */
  if (loading) return <PageSkeleton />;

  if (!businessId) {
    return (
      <DashboardLayout>
        <PageHeader icon={BarChart3} title={bi('تحليلات التأجير', 'Rentals Analytics')} />
        <Card className="p-10 text-center text-muted-foreground rounded-xl">
          {bi('لا توجد منشأة مرتبطة بحسابك.', 'No business linked to your account.')}
        </Card>
      </DashboardLayout>
    );
  }

  const tickFmt = (v: string) => v.slice(5);
  const noData = orders.length === 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <PageHeader
        icon={BarChart3}
        title={bi('تحليلات التأجير والإيرادات', 'Rentals Performance & Revenue')}
        subtitle={bi('متابعة الأداء، الإيرادات، ومعدّل الإشغال', 'Track performance, revenue, and occupancy')}
      />

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-4 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList aria-label={bi('الفترة الزمنية', 'Time range')}>
              <TabsTrigger value="30">{bi('30 يوم', '30d')}</TabsTrigger>
              <TabsTrigger value="90">{bi('90 يوم', '90d')}</TabsTrigger>
              <TabsTrigger value="180">{bi('180 يوم', '180d')}</TabsTrigger>
              <TabsTrigger value="365">{bi('سنة', '1y')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger className="h-10 rounded-xl w-[180px]" aria-label={bi('فلتر حسب الأصل', 'Filter by item')}>
              <SelectValue placeholder={bi('كل الأصول', 'All items')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bi('كل الأصول', 'All items')}</SelectItem>
              {items.map(i => (
                <SelectItem key={i.id} value={i.id}>{bi(i.name_ar, i.name_en || i.name_ar)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | RentalOrderStatus)}>
            <SelectTrigger className="h-10 rounded-xl w-[160px]" aria-label={bi('فلتر حسب الحالة', 'Filter by status')}>
              <SelectValue placeholder={bi('كل الحالات', 'All statuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bi('كل الحالات', 'All statuses')}</SelectItem>
              {STATUS_KEYS.map(k => (
                <SelectItem key={k} value={k}>{bi(STATUS_LABEL[k].ar, STATUS_LABEL[k].en)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" aria-hidden />
            <Input
              dir="auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={bi('بحث بالرقم المرجعي…', 'Search by ref id…')}
              className="h-10 rounded-xl ps-9 w-[200px]"
              aria-label={bi('بحث', 'Search')}
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-10 rounded-xl">
              <X className="size-4 me-1" /> {bi('مسح', 'Clear')}
            </Button>
          )}

          <div className="ms-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-10 rounded-xl" aria-label={bi('تحديث', 'Refresh')}>
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-10 rounded-xl hidden sm:inline-flex" aria-label={bi('طباعة', 'Print')}>
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-10 rounded-xl">
              <Download className="size-4 me-2" />
              {bi('تصدير CSV', 'Export CSV')}
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Sparkles className="size-3" aria-hidden />
            {bi('عرض', 'Showing')} <strong className="tech-content">{scoped.length}</strong> {bi('من أصل', 'of')} <strong className="tech-content">{orders.length}</strong>
          </div>
        )}
      </div>

      {/* Empty state */}
      {noData ? (
        <Card className="p-10 text-center rounded-xl">
          <div className="mx-auto size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <BarChart3 className="size-7" />
          </div>
          <h2 className="text-lg font-semibold mb-1">{bi('لا توجد بيانات تأجير بعد', 'No rental data yet')}</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            {bi('ستظهر التحليلات تلقائيًا فور إنشاء أول طلب تأجير. ابدأ بإضافة أصولك وعروضك.', 'Analytics will appear automatically once you receive your first rental order.')}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link to="/dashboard/rentals">
              <Button className="h-11 rounded-xl">
                <Package className="size-4 me-2" />
                {bi('فتح مركز التأجير', 'Open Rentals Hub')}
                <ArrowUpRight className="size-4 ms-1" />
              </Button>
            </Link>
            <Link to="/dashboard/rentals/calendar">
              <Button variant="outline" className="h-11 rounded-xl">
                {bi('عرض التقويم', 'Open Calendar')}
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
            <KpiTile icon={DollarSign} tone="emerald"
              label={bi('الإيرادات', 'Revenue')}
              value={<span className="tech-content">{fmtMoney(cur.revenue, currency)}</span>}
              delta={delta(cur.revenue, prv.revenue)} />
            <KpiTile icon={ShoppingCart} tone="sky"
              label={bi('الطلبات', 'Orders')}
              value={<span className="tech-content">{cur.count}</span>}
              delta={delta(cur.count, prv.count)} />
            <KpiTile icon={Percent} tone="amber"
              label={bi('الإشغال', 'Occupancy')}
              value={<span className="tech-content">{occupancyPct}%</span>}
              delta={delta(occupancyPct, prevOccupancyPct)} unit="pp" />
            <KpiTile icon={Clock} tone="indigo"
              label={bi('متوسط المدة', 'Avg duration')}
              value={<span className="tech-content">{cur.avgDuration.toFixed(1)} {bi('يوم', 'd')}</span>}
              delta={delta(Math.round(cur.avgDuration), Math.round(prv.avgDuration))} />
            <KpiTile icon={TrendingUp} tone="rose"
              label={bi('متوسط الطلب', 'Avg ticket')}
              value={<span className="tech-content">{fmtMoney(cur.avgTicket, currency)}</span>}
              delta={delta(Math.round(cur.avgTicket), Math.round(prv.avgTicket))} />
          </div>

          {/* Trend */}
          <Card className="p-4 mb-4 rounded-xl">
            <SectionHead
              title={bi('اتجاه الإيرادات', 'Revenue trend')}
              hint={bi('الفترة الحالية مقابل السابقة', 'Current vs previous period')}
            />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" reversed={isRTL} tickFormatter={tickFmt} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tickFormatter={fmtCompact} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation={isRTL ? 'left' : 'right'} allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }}
                    formatter={(v: number, n: string) =>
                      n === 'orders' ? [v, bi('الطلبات', 'Orders')]
                      : [fmtMoney(v, currency), n === 'previous' ? bi('السابقة', 'Previous') : bi('الإيرادات', 'Revenue')]
                    }
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="previous" name={bi('السابقة', 'Previous')} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue"  name={bi('الإيرادات', 'Revenue')} stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="orders"  name={bi('الطلبات', 'Orders')} stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Status row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card className="p-4 rounded-xl">
              <SectionHead title={bi('الإيرادات حسب الحالة', 'Revenue by status')} />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" reversed={isRTL} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={fmtCompact} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }}
                      formatter={(v: number) => fmtMoney(v, currency)}
                    />
                    <Bar dataKey="revenue" name={bi('الإيرادات', 'Revenue')} radius={[6, 6, 0, 0]}>
                      {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 rounded-xl">
              <SectionHead title={bi('توزيع الطلبات', 'Orders distribution')} />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Legend />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Daily bookings */}
          <Card className="p-4 rounded-xl mb-4">
            <SectionHead title={bi('الحجوزات اليومية', 'Daily bookings')} />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bkg-rentals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" reversed={isRTL} tickFormatter={tickFmt} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Area type="monotone" dataKey="bookings" name={bi('الحجوزات', 'Bookings')} stroke="#0ea5e9" fill="url(#bkg-rentals)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top items */}
          <Card className="p-4 rounded-xl">
            <SectionHead
              icon={<Package className="size-4" />}
              title={bi('أعلى 10 أصول حسب الإيرادات', 'Top 10 items by revenue')}
              hint={<Badge variant="secondary" className="rounded-full">{cur.count} {bi('طلب', 'orders')}</Badge>}
            />
            {topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {bi('لا توجد بيانات في الفترة المحددة', 'No data in the selected range')}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {topItems.map((row, i) => (
                  <li key={row.id} className="py-3 flex items-center gap-3 hover-lift rounded-lg px-2 -mx-2">
                    <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold tech-content">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="font-medium truncate">
                          {row.slug ? (
                            <Link to={`/rentals/${row.slug}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                              {row.name}
                            </Link>
                          ) : row.name}
                        </div>
                        <div className="text-sm font-semibold tech-content whitespace-nowrap">
                          {fmtMoney(row.revenue, currency)}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={row.pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full bg-emerald-500" style={{ width: `${row.pct}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="tech-content">{row.orders} {bi('طلب', 'orders')}</span>
                        <span>·</span>
                        <span className="tech-content">{row.days} {bi('يوم', 'days')}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  );
};

/* ---------------- Sub-components ---------------- */
const TONES: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sky:     'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  indigo:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  rose:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const KpiTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: number;
  unit?: 'pp';
}> = ({ icon: Icon, tone, label, value, delta, unit }) => {
  const showDelta = typeof delta === 'number' && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="p-3 rounded-xl hover-lift">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-xl flex items-center justify-center ${TONES[tone]}`} aria-hidden>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-base font-semibold leading-tight truncate">{value}</div>
          {showDelta && (
            <div className={`mt-0.5 inline-flex items-center gap-1 text-[11px] tech-content ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(delta!)}{unit === 'pp' ? 'pp' : '%'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const SectionHead: React.FC<{
  title: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, hint, icon }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-semibold text-sm flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const PageSkeleton: React.FC = () => (
  <DashboardLayout>
    <div className="space-y-3">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  </DashboardLayout>
);

export default DashboardRentalsAnalytics;