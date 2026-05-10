import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Clock, AlertTriangle, CheckCircle2, TrendingUp, Calendar, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Bucket = {
  key: string;
  name?: string;
  total: number;
  replied: number;
  avg_response_hours: number | null;
  response_compliance_pct: number | null;
  resolution_compliance_pct: number | null;
  stale_open: number;
};

type SlaResult = {
  window_start: string;
  window_end: string;
  thresholds: { stale_hours: number; target_response_hours: number; target_resolution_hours: number };
  overall: {
    total: number; replied: number; closed: number;
    avg_response_hours: number | null; avg_resolution_hours: number | null;
    sla_response_compliance_pct: number | null; sla_resolution_compliance_pct: number | null;
    stale_open: number;
  };
  by_category: Bucket[];
  by_assignee: Bucket[];
  by_day: Array<{ key: string; total: number; replied: number; response_compliance_pct: number | null }>;
};

const presetRanges = (isRTL: boolean) => ([
  { id: '7d',  label: { ar: 'آخر 7 أيام', en: 'Last 7 days' },  days: 7 },
  { id: '30d', label: { ar: 'آخر 30 يوم', en: 'Last 30 days' }, days: 30 },
  { id: '90d', label: { ar: 'آخر 90 يوم', en: 'Last 90 days' }, days: 90 },
]);

export default function AdminContactSlaDashboard() {
  useNoIndex();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 30 * 86400000);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [tab, setTab] = useState<'category' | 'assignee'>('category');

  const fromIso = useMemo(() => new Date(from + 'T00:00:00Z').toISOString(), [from]);
  const toIso = useMemo(() => new Date(to + 'T23:59:59Z').toISOString(), [to]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['contact-sla-compliance', fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (n: string, a: unknown) => Promise<{ data: SlaResult | null; error: Error | null }>)(
        'get_contact_sla_compliance', { _from: fromIso, _to: toIso, _group_by: 'overall' },
      );
      if (error) throw error;
      return data as SlaResult;
    },
  });

  const setPreset = (days: number) => {
    const t = new Date();
    setTo(t.toISOString().slice(0, 10));
    setFrom(new Date(t.getTime() - days * 86400000).toISOString().slice(0, 10));
  };

  const overall = data?.overall;
  const dayChart = (data?.by_day ?? []).map((d) => ({
    day: d.key, total: d.total, compliance: d.response_compliance_pct ?? 0,
  }));

  const buckets = tab === 'category' ? (data?.by_category ?? []) : (data?.by_assignee ?? []);

  const fmt = (n: number | null | undefined) => n == null ? '—' : `${n}%`;
  const fmtH = (n: number | null | undefined) => n == null ? '—' : `${n}h`;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? 'لوحة امتثال SLA' : 'SLA Compliance Dashboard'}</h1>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'مؤشرات الامتثال والتأخر، حسب الفئة والموظف' : 'Compliance and staleness, by category and assignee'}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'من' : 'From'}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-12 rounded-xl tech-content w-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isRTL ? 'إلى' : 'To'}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-12 rounded-xl tech-content w-44" />
            </div>
            <div className="flex items-end gap-2">
              {presetRanges(isRTL).map((p) => (
                <Button key={p.id} size="sm" variant="outline" className="rounded-lg" onClick={() => setPreset(p.days)}>
                  <Calendar className="w-3 h-3 me-1" />
                  {isRTL ? p.label.ar : p.label.en}
                </Button>
              ))}
            </div>
            <Button onClick={() => refetch()} disabled={isFetching} className="h-12 rounded-xl ms-auto">
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'تحديث' : 'Refresh')}
            </Button>
          </CardContent>
        </Card>

        {isLoading || !data ? (
          <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<Clock className="w-4 h-4" />} label={isRTL ? 'إجمالي الرسائل' : 'Total messages'} value={String(overall?.total ?? 0)} />
              <KpiCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label={isRTL ? 'التزام الرد' : 'Response SLA'} value={fmt(overall?.sla_response_compliance_pct ?? null)} sub={`< ${data.thresholds.target_response_hours}h`} />
              <KpiCard icon={<TrendingUp className="w-4 h-4 text-sky-600" />} label={isRTL ? 'التزام الإغلاق' : 'Resolution SLA'} value={fmt(overall?.sla_resolution_compliance_pct ?? null)} sub={`< ${data.thresholds.target_resolution_hours}h`} />
              <KpiCard icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} label={isRTL ? 'متأخرة مفتوحة' : 'Stale open'} value={String(overall?.stale_open ?? 0)} sub={`> ${data.thresholds.stale_hours}h`} />
            </div>

            {/* Trend chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">{isRTL ? 'الاتجاه اليومي للامتثال' : 'Daily compliance trend'}</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dayChart}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="compliance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} name={isRTL ? 'الامتثال %' : 'Compliance %'} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={{ r: 2 }} name={isRTL ? 'الإجمالي' : 'Total'} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">{isRTL ? 'تفصيل الامتثال' : 'Compliance breakdown'}</CardTitle>
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'category' | 'assignee')}>
                  <TabsList className="rounded-lg">
                    <TabsTrigger value="category" className="text-xs"><Users className="w-3 h-3 me-1" />{isRTL ? 'حسب الفئة' : 'By category'}</TabsTrigger>
                    <TabsTrigger value="assignee" className="text-xs"><Users className="w-3 h-3 me-1" />{isRTL ? 'حسب الموظف' : 'By assignee'}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {buckets.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">{isRTL ? 'لا توجد بيانات في النطاق المحدد' : 'No data for this range'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-start p-2">{isRTL ? 'الاسم' : 'Name'}</th>
                          <th className="p-2 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                          <th className="p-2 text-end">{isRTL ? 'تم الرد' : 'Replied'}</th>
                          <th className="p-2 text-end">{isRTL ? 'متوسط الرد' : 'Avg resp'}</th>
                          <th className="p-2 text-end">{isRTL ? 'التزام الرد' : 'Resp SLA'}</th>
                          <th className="p-2 text-end">{isRTL ? 'التزام الإغلاق' : 'Res SLA'}</th>
                          <th className="p-2 text-end">{isRTL ? 'متأخرة' : 'Stale'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buckets.map((b) => (
                          <tr key={b.key} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="p-2 font-medium">{b.name ?? b.key}</td>
                            <td className="p-2 text-end tech-content">{b.total}</td>
                            <td className="p-2 text-end tech-content">{b.replied}</td>
                            <td className="p-2 text-end tech-content">{fmtH(b.avg_response_hours)}</td>
                            <td className="p-2 text-end"><ComplianceBadge value={b.response_compliance_pct} /></td>
                            <td className="p-2 text-end"><ComplianceBadge value={b.resolution_compliance_pct} /></td>
                            <td className="p-2 text-end">
                              {b.stale_open > 0
                                ? <Badge variant="destructive" className="rounded-md tech-content">{b.stale_open}</Badge>
                                : <span className="text-muted-foreground tech-content">0</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="p-4 space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold tech-content">{value}</div>
      {sub && <div className="text-xs text-muted-foreground tech-content">{sub}</div>}
    </CardContent></Card>
  );
}

function ComplianceBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground tech-content">—</span>;
  const cls = value >= 90 ? 'bg-emerald-100 text-emerald-700' :
              value >= 70 ? 'bg-sky-100 text-sky-700' :
              value >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700';
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium tech-content ${cls}`}>{value}%</span>;
}
