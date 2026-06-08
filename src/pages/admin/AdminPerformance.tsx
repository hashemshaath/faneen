/**
 * Admin → Performance audit dashboard.
 *
 * Aggregates RUM samples from `web_vitals_events` (populated by the
 * `ingest-web-vitals` edge function) and surfaces per-route averages and
 * sample counts for LCP / CLS / FCP / INP / TTFB and the IMG counter
 * (number of <img> rendered per page-view).
 *
 * Read-only — strictly admin-gated upstream via <ProtectedRoute requireAdmin>.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, Image as ImageIcon, RefreshCw } from 'lucide-react';

type Row = {
  metric_name: string;
  metric_value: number;
  route_key: string | null;
  page_path: string;
  image_count: number | null;
  lcp_url: string | null;
  device_type: string | null;
  created_at: string;
};

const WINDOWS: Array<{ key: '24h' | '7d' | '30d'; ar: string; en: string; hours: number }> = [
  { key: '24h', ar: 'آخر 24 ساعة', en: 'Last 24h', hours: 24 },
  { key: '7d',  ar: 'آخر 7 أيام',  en: 'Last 7 days', hours: 24 * 7 },
  { key: '30d', ar: 'آخر 30 يومًا', en: 'Last 30 days', hours: 24 * 30 },
];

const METRICS = ['LCP', 'CLS', 'FCP', 'INP', 'TTFB', 'IMG'] as const;

function fmt(metric: string, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (metric === 'CLS') return v.toFixed(3);
  if (metric === 'IMG') return Math.round(v).toString();
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
}

function ratingClass(metric: string, v: number): string {
  // Mobile thresholds aligned with web-vitals defaults.
  const good: Record<string, number> = { LCP: 2500, FCP: 1800, CLS: 0.1, INP: 200, TTFB: 800 };
  const poor: Record<string, number> = { LCP: 4000, FCP: 3000, CLS: 0.25, INP: 500, TTFB: 1800 };
  if (!(metric in good)) return '';
  if (v <= good[metric]) return 'text-success';
  if (v >= poor[metric]) return 'text-destructive';
  return 'text-warning';
}

export default function AdminPerformance() {
  const { isRTL } = useLanguage();
  useNoIndex();
  const [windowKey, setWindowKey] = useState<'24h' | '7d' | '30d'>('7d');
  const win = WINDOWS.find((w) => w.key === windowKey)!;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-perf-vitals', windowKey],
    queryFn: async (): Promise<Row[]> => {
      const since = new Date(Date.now() - win.hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('web_vitals_events')
        .select('metric_name,metric_value,route_key,page_path,image_count,lcp_url,device_type,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
  });

  const aggregates = useMemo(() => {
    const rows = data ?? [];
    const byRoute = new Map<string, Map<string, number[]>>();
    for (const r of rows) {
      const route = r.route_key || r.page_path || 'unknown';
      if (!byRoute.has(route)) byRoute.set(route, new Map());
      const m = byRoute.get(route)!;
      if (!m.has(r.metric_name)) m.set(r.metric_name, []);
      m.get(r.metric_name)!.push(Number(r.metric_value));
    }
    return Array.from(byRoute.entries()).map(([route, metrics]) => {
      const out: Record<string, { avg: number; p75: number; n: number }> = {};
      for (const [name, values] of metrics) {
        const sorted = [...values].sort((a, b) => a - b);
        const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
        const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1];
        out[name] = { avg, p75, n: sorted.length };
      }
      const samples = Array.from(metrics.values()).reduce((s, a) => s + a.length, 0);
      return { route, metrics: out, samples };
    }).sort((a, b) => b.samples - a.samples);
  }, [data]);

  const recentLcpImages = useMemo(() => {
    const rows = (data ?? []).filter((r) => r.metric_name === 'LCP' && r.lcp_url);
    const seen = new Map<string, { url: string; route: string; value: number; at: string }>();
    for (const r of rows.slice(0, 200)) {
      if (!r.lcp_url || seen.has(r.lcp_url)) continue;
      seen.set(r.lcp_url, {
        url: r.lcp_url,
        route: r.route_key || r.page_path,
        value: Number(r.metric_value),
        at: r.created_at,
      });
    }
    return Array.from(seen.values()).slice(0, 12);
  }, [data]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gauge className="w-6 h-6 text-primary" />
              {isRTL ? 'أداء الواجهة العامة' : 'Public Frontend Performance'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'متوسطات Core Web Vitals وعدد الصور المُحمَّلة لكل مسار، من بيانات RUM الحقيقية.'
                : 'Core Web Vitals averages and per-route image counts from real-user RUM data.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {WINDOWS.map((w) => (
              <Button
                key={w.key}
                size="sm"
                variant={windowKey === w.key ? 'default' : 'outline'}
                onClick={() => setWindowKey(w.key)}
              >
                {isRTL ? w.ar : w.en}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isRTL ? 'متوسطات Web Vitals لكل مسار' : 'Per-route Web Vitals averages'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : aggregates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {isRTL ? 'لا توجد عينات في هذه النافذة الزمنية بعد.' : 'No samples in this window yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'المسار' : 'Route'}</th>
                      {METRICS.map((m) => (
                        <th key={m} className="text-start py-2 px-2 font-medium">{m}</th>
                      ))}
                      <th className="text-start py-2 px-2 font-medium">{isRTL ? 'عينات' : 'Samples'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregates.map((row) => (
                      <tr key={row.route} className="border-b last:border-0">
                        <td className="py-2 px-2 font-medium tech-content">{row.route}</td>
                        {METRICS.map((m) => {
                          const a = row.metrics[m];
                          return (
                            <td key={m} className="py-2 px-2">
                              <span className={a ? ratingClass(m, a.p75) : ''}>
                                {a ? fmt(m, a.p75) : '—'}
                              </span>
                              {a && a.n > 1 && (
                                <span className="text-xs text-muted-foreground ms-1">(n={a.n})</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2"><Badge variant="secondary">{row.samples}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              {isRTL
                ? 'القيم المعروضة هي p75 (75% من الزيارات أسرع من هذه القيمة).'
                : 'Values shown are p75 (75% of visits are faster than this).'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {isRTL ? 'أحدث صور LCP المرصودة' : 'Recently observed LCP images'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLcpImages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {isRTL ? 'لم تُسجَّل بعد روابط صور LCP.' : 'No LCP image URLs captured yet.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {recentLcpImages.map((r) => (
                  <li key={r.url} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2">
                    <span className={`tech-content font-semibold ${ratingClass('LCP', r.value)}`}>{fmt('LCP', r.value)}</span>
                    <span className="text-muted-foreground tech-content">{r.route}</span>
                    <span className="tech-content truncate flex-1" title={r.url}>{r.url}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}