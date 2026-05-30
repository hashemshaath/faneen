import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { defaultRange, type DateRange } from '@/lib/admin-reports-csv';
import { Loader2, TrendingUp, Users, FileText, DollarSign, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface Kpis {
  gmv: number;
  contracts: number;
  newUsers: number;
  activeBusinesses: number;
  mrr: number;
  churnPct: number;
  ltv: number;
}

interface DailyPoint {
  day: string;
  contracts: number;
  gmv: number;
  signups: number;
}

function bucketByDay<T extends { created_at: string }>(rows: T[], from: string, to: string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T23:59:59Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    map[d.toISOString().slice(0, 10)] = [];
  }
  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    if (map[key]) map[key].push(row);
  }
  return map;
}

export default function AdminKpis() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [range, setRange] = useState<DateRange>(() => defaultRange(30));
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fromIso = `${range.from}T00:00:00Z`;
        const toIso = `${range.to}T23:59:59Z`;

        const [contractsRes, usersRes, bizRes, paymentsRes] = await Promise.all([
          supabase
            .from('contracts')
            .select('id,status,total_amount,created_at')
            .gte('created_at', fromIso)
            .lte('created_at', toIso),
          supabase
            .from('profiles')
            .select('id,created_at')
            .gte('created_at', fromIso)
            .lte('created_at', toIso),
          supabase
            .from('businesses')
            .select('id,created_at,status')
            .gte('created_at', fromIso)
            .lte('created_at', toIso),
          supabase
            .from('membership_payments')
            .select('amount,created_at,status')
            .gte('created_at', fromIso)
            .lte('created_at', toIso),
        ]);

        if (cancelled) return;

        const contracts = (contractsRes.data ?? []) as Array<{ id: string; status: string | null; total_amount: number | null; created_at: string }>;
        const users = (usersRes.data ?? []) as Array<{ id: string; created_at: string }>;
        const biz = (bizRes.data ?? []) as Array<{ id: string; created_at: string; status: string | null }>;
        const payments = (paymentsRes.data ?? []) as Array<{ amount: number | null; created_at: string; status: string | null }>;

        const gmv = contracts.reduce((s, c) => s + Number(c.total_amount ?? 0), 0);
        const mrr = payments
          .filter((p) => (p.status ?? '').toLowerCase() === 'paid' || (p.status ?? '').toLowerCase() === 'completed')
          .reduce((s, p) => s + Number(p.amount ?? 0), 0);
        const activeBusinesses = biz.filter((b) => (b.status ?? '').toLowerCase() === 'active').length;
        const completed = contracts.filter((c) => (c.status ?? '') === 'completed').length;
        const cancelled_ = contracts.filter((c) => (c.status ?? '') === 'cancelled').length;
        const total = contracts.length || 1;
        const churnPct = (cancelled_ / total) * 100;
        const ltv = completed > 0 ? gmv / completed : 0;

        setKpis({
          gmv,
          contracts: contracts.length,
          newUsers: users.length,
          activeBusinesses,
          mrr,
          churnPct,
          ltv,
        });

        const buckets = bucketByDay(contracts, range.from, range.to);
        const userBuckets = bucketByDay(users, range.from, range.to);
        const points: DailyPoint[] = Object.keys(buckets)
          .sort()
          .map((day) => ({
            day: day.slice(5),
            contracts: buckets[day].length,
            gmv: buckets[day].reduce((s, c) => s + Number(c.total_amount ?? 0), 0),
            signups: (userBuckets[day] ?? []).length,
          }));
        setDaily(points);

        const statusMap: Record<string, number> = {};
        for (const c of contracts) {
          const k = c.status ?? 'unknown';
          statusMap[k] = (statusMap[k] ?? 0) + 1;
        }
        setStatusBreakdown(Object.entries(statusMap).map(([status, count]) => ({ status, count })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const cards = useMemo(
    () => [
      { key: 'gmv', icon: DollarSign, ar: 'إجمالي قيمة العقود (GMV)', en: 'GMV', value: kpis ? kpis.gmv.toLocaleString() : '—' },
      { key: 'mrr', icon: TrendingUp, ar: 'الإيرادات الشهرية (MRR)', en: 'MRR', value: kpis ? kpis.mrr.toLocaleString() : '—' },
      { key: 'contracts', icon: FileText, ar: 'العقود', en: 'Contracts', value: kpis ? kpis.contracts.toLocaleString() : '—' },
      { key: 'users', icon: Users, ar: 'مستخدمون جدد', en: 'New Users', value: kpis ? kpis.newUsers.toLocaleString() : '—' },
      { key: 'biz', icon: Activity, ar: 'منشآت نشطة', en: 'Active Businesses', value: kpis ? kpis.activeBusinesses.toLocaleString() : '—' },
      { key: 'churn', icon: Activity, ar: 'نسبة الإلغاء (Churn)', en: 'Churn %', value: kpis ? `${kpis.churnPct.toFixed(1)}%` : '—' },
      { key: 'ltv', icon: DollarSign, ar: 'متوسط القيمة لكل عقد (LTV)', en: 'LTV', value: kpis ? Math.round(kpis.ltv).toLocaleString() : '—' },
    ],
    [kpis],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              <Bi ar="لوحة المؤشرات المتقدمة" en="Advanced KPIs" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <Bi ar="GMV · MRR · Churn · LTV — في الفترة المختارة" en="GMV · MRR · Churn · LTV — in selected period" />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="h-10 w-auto" />
            <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-10 w-auto" />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {cards.map((c) => (
            <Card key={c.key} className="p-4 hover-lift">
              <div className="flex items-center justify-between">
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <Bi ar={c.ar} en={c.en} />
              </div>
              <div className="mt-1 text-xl font-bold tech-content">{c.value}</div>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            <Bi ar="العقود وقيمتها يومياً" en="Daily Contracts & GMV" />
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis yAxisId="left" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="contracts" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="gmv" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="signups" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            <Bi ar="توزيع حالات العقود" en="Contract Status Breakdown" />
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={statusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}