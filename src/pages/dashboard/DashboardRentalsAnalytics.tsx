/**
 * Rentals Performance & Revenue Analytics (Phase 2)
 * -----------------------------------------------------------------------------
 * - KPIs: total revenue, orders count, occupancy %, avg duration, avg ticket
 * - Charts: revenue trend (line), revenue by status (bar), status breakdown (pie),
 *           daily bookings (area)
 * - Top 10 items by revenue / orders / days
 * - Time-range filter (30 / 90 / 180 / 365 days) + CSV export
 * - RTL/LTR aware, .tech-content for numbers, inline (no popups).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, TrendingUp, DollarSign, Clock, Package,
  Download, Loader2, Percent, ShoppingCart,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import { RentalItems, RentalOrders } from '@/modules/rentals';
import type { RentalItem, RentalOrder, RentalOrderStatus } from '@/modules/rentals';
import { toast } from 'sonner';

/* ---------- helpers ---------- */
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
const fmtMoney = (n: number, ccy = 'SAR') =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${ccy}`;

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

type Range = '30' | '90' | '180' | '365';
const RANGE_DAYS: Record<Range, number> = { '30': 30, '90': 90, '180': 180, '365': 365 };

const DashboardRentalsAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const bi = useBi();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [range, setRange] = useState<Range>('90');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data: biz } = await supabase
        .from('businesses').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      const bizId = biz?.id ?? null;
      setBusinessId(bizId);
      if (bizId) {
        const [it, ord] = await Promise.all([
          RentalItems.listProviderItems(bizId),
          RentalOrders.listOrdersForProvider(bizId),
        ]);
        setItems(it.data ?? []);
        setOrders(ord.data ?? []);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const since = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - RANGE_DAYS[range]); return d;
  }, [range]);

  const scoped = useMemo(
    () => orders.filter(o => parseYmd(o.start_date) >= since && o.status !== 'cancelled'),
    [orders, since],
  );

  const currency = scoped[0]?.currency ?? items[0]?.currency ?? 'SAR';

  /* ---------- KPI ---------- */
  const kpi = useMemo(() => {
    const revenue = scoped.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalDays = scoped.reduce((s, o) => s + Math.max(1, o.total_days), 0);
    const avgDuration = scoped.length ? totalDays / scoped.length : 0;
    const avgTicket = scoped.length ? revenue / scoped.length : 0;
    const itemsCount = items.length || 1;
    const windowDays = RANGE_DAYS[range];
    const occupancyPct = Math.min(100, Math.round((totalDays / (itemsCount * windowDays)) * 100));
    return {
      revenue,
      orders: scoped.length,
      avgDuration,
      avgTicket,
      occupancyPct,
    };
  }, [scoped, items.length, range]);

  /* ---------- Revenue trend (per week bucket) ---------- */
  const trendData = useMemo(() => {
    const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
    const days = RANGE_DAYS[range];
    const bucketSize = days <= 30 ? 1 : days <= 90 ? 7 : 14;
    for (let i = days - 1; i >= 0; i -= bucketSize) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = ymd(d);
      buckets.set(key, { date: key, revenue: 0, orders: 0 });
    }
    const keys = Array.from(buckets.keys()).sort();
    scoped.forEach(o => {
      const s = parseYmd(o.start_date);
      const target = keys.find(k => parseYmd(k).getTime() >= s.getTime()) ?? keys[keys.length - 1];
      const b = buckets.get(target);
      if (b) { b.revenue += Number(o.total_amount || 0); b.orders += 1; }
    });
    return keys.map(k => buckets.get(k)!);
  }, [scoped, range]);

  /* ---------- Status breakdown ---------- */
  const statusData = useMemo(() => {
    const map = new Map<RentalOrderStatus, { count: number; revenue: number }>();
    scoped.forEach(o => {
      const cur = map.get(o.status) ?? { count: 0, revenue: 0 };
      cur.count += 1; cur.revenue += Number(o.total_amount || 0);
      map.set(o.status, cur);
    });
    return Array.from(map.entries()).map(([status, v]) => ({
      status,
      name: bi(STATUS_LABEL[status].ar, STATUS_LABEL[status].en),
      color: STATUS_LABEL[status].color,
      count: v.count,
      revenue: Math.round(v.revenue),
    }));
  }, [scoped, bi]);

  /* ---------- Daily bookings ---------- */
  const dailyBookings = useMemo(() => {
    const days = RANGE_DAYS[range];
    const buckets: { date: string; bookings: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets.push({ date: ymd(d), bookings: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.date, i]));
    scoped.forEach(o => {
      const k = o.start_date.slice(0, 10);
      const i = idx.get(k);
      if (i !== undefined) buckets[i].bookings += 1;
    });
    return buckets;
  }, [scoped, range]);

  /* ---------- Top items ---------- */
  const topItems = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; days: number }>();
    scoped.forEach(o => {
      const cur = map.get(o.rental_item_id) ?? { orders: 0, revenue: 0, days: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.total_amount || 0);
      cur.days += Math.max(1, o.total_days);
      map.set(o.rental_item_id, cur);
    });
    return Array.from(map.entries())
      .map(([itemId, v]) => {
        const it = items.find(x => x.id === itemId);
        return {
          id: itemId,
          name: it ? bi(it.name_ar, it.name_en || it.name_ar) : itemId,
          orders: v.orders,
          revenue: Math.round(v.revenue),
          days: v.days,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [scoped, items, bi]);

  /* ---------- CSV export ---------- */
  const exportCsv = () => {
    const headers = ['ref_id', 'item', 'start_date', 'end_date', 'days', 'status', 'amount', 'currency'];
    const rows = scoped.map(o => {
      const it = items.find(i => i.id === o.rental_item_id);
      const itemName = it ? (it.name_en || it.name_ar) : '';
      return [
        o.ref_id,
        itemName.replace(/[",\n]/g, ' '),
        o.start_date,
        o.end_date,
        o.total_days,
        o.status,
        o.total_amount,
        o.currency,
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!businessId) {
    return (
      <DashboardLayout>
        <PageHeader icon={BarChart3} title={bi('تحليلات التأجير', 'Rentals Analytics')} />
        <Card className="p-8 text-center text-muted-foreground">
          {bi('لا توجد منشأة مرتبطة بحسابك.', 'No business linked to your account.')}
        </Card>
      </DashboardLayout>
    );
  }

  const tickFmt = (v: string) => v.slice(5);

  return (
    <DashboardLayout>
      <PageHeader
        icon={BarChart3}
        title={bi('تحليلات التأجير والإيرادات', 'Rentals Performance & Revenue')}
        subtitle={bi('متابعة الأداء، الإيرادات، ومعدّل الإشغال', 'Track performance, revenue, and occupancy')}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="30">{bi('30 يوم', '30d')}</TabsTrigger>
            <TabsTrigger value="90">{bi('90 يوم', '90d')}</TabsTrigger>
            <TabsTrigger value="180">{bi('180 يوم', '180d')}</TabsTrigger>
            <TabsTrigger value="365">{bi('سنة', '1y')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" className="h-12 rounded-xl" onClick={exportCsv}>
          <Download className="size-4 me-2" />
          {bi('تصدير CSV', 'Export CSV')}
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiTile icon={DollarSign} tone="emerald"
          label={bi('الإيرادات', 'Revenue')}
          value={<span className="tech-content">{fmtMoney(kpi.revenue, currency)}</span>} />
        <KpiTile icon={ShoppingCart} tone="sky"
          label={bi('الطلبات', 'Orders')}
          value={<span className="tech-content">{kpi.orders}</span>} />
        <KpiTile icon={Percent} tone="amber"
          label={bi('الإشغال', 'Occupancy')}
          value={<span className="tech-content">{kpi.occupancyPct}%</span>} />
        <KpiTile icon={Clock} tone="indigo"
          label={bi('متوسط المدة', 'Avg duration')}
          value={<span className="tech-content">{kpi.avgDuration.toFixed(1)} {bi('يوم', 'd')}</span>} />
        <KpiTile icon={TrendingUp} tone="rose"
          label={bi('متوسط الطلب', 'Avg ticket')}
          value={<span className="tech-content">{fmtMoney(kpi.avgTicket, currency)}</span>} />
      </div>

      {/* Revenue trend */}
      <Card className="p-4 mb-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{bi('اتجاه الإيرادات', 'Revenue trend')}</h3>
          <Badge variant="secondary">{bi('عبر الزمن', 'Over time')}</Badge>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" reversed={isRTL} tickFormatter={tickFmt} fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                formatter={(v: number) => fmtMoney(v, currency)}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" name={bi('الإيرادات', 'Revenue')} stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Status breakdown — bar */}
        <Card className="p-4 rounded-xl">
          <h3 className="font-semibold mb-3">{bi('الإيرادات حسب الحالة', 'Revenue by status')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" reversed={isRTL} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                  formatter={(v: number) => fmtMoney(v, currency)}
                />
                <Bar dataKey="revenue" name={bi('الإيرادات', 'Revenue')} radius={[6, 6, 0, 0]}>
                  {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status breakdown — pie */}
        <Card className="p-4 rounded-xl">
          <h3 className="font-semibold mb-3">{bi('توزيع الطلبات', 'Orders distribution')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Daily bookings area */}
      <Card className="p-4 rounded-xl mb-4">
        <h3 className="font-semibold mb-3">{bi('الحجوزات اليومية', 'Daily bookings')}</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyBookings} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bkg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" reversed={isRTL} tickFormatter={tickFmt} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="bookings" name={bi('الحجوزات', 'Bookings')} stroke="#0ea5e9" fill="url(#bkg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top items */}
      <Card className="p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="size-4" />
            {bi('أعلى 10 أصول حسب الإيرادات', 'Top 10 items by revenue')}
          </h3>
        </div>
        {topItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {bi('لا توجد بيانات في الفترة المحددة', 'No data in the selected range')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-start py-2 px-2">#</th>
                  <th className="text-start py-2 px-2">{bi('الأصل', 'Item')}</th>
                  <th className="text-end py-2 px-2">{bi('الطلبات', 'Orders')}</th>
                  <th className="text-end py-2 px-2">{bi('الأيام', 'Days')}</th>
                  <th className="text-end py-2 px-2">{bi('الإيرادات', 'Revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((row, i) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 px-2 tech-content">{i + 1}</td>
                    <td className="py-2 px-2">{row.name}</td>
                    <td className="py-2 px-2 text-end tech-content">{row.orders}</td>
                    <td className="py-2 px-2 text-end tech-content">{row.days}</td>
                    <td className="py-2 px-2 text-end tech-content font-medium">
                      {fmtMoney(row.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
};

/* ---------- Small KPI tile ---------- */
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
}> = ({ icon: Icon, tone, label, value }) => (
  <Card className="p-3 rounded-xl hover-lift">
    <div className="flex items-center gap-3">
      <div className={`size-10 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-base font-semibold leading-tight truncate">{value}</div>
      </div>
    </div>
  </Card>
);

export default DashboardRentalsAnalytics;