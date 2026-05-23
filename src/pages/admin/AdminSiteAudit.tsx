import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { runSiteAudit } from '@/modules/seo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Gauge, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Smartphone, FileSearch, Globe, ListTree, Activity, Loader2,
} from 'lucide-react';
import { TrendingUp, TrendingDown, Minus, Wrench, Lightbulb } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

import { useNoIndex } from "@/hooks/useNoIndex";
/* ─── Helpers ─── */
const fmtMs = (v: number | null | undefined) =>
  v == null ? '—' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`;
const fmtNum = (v: number | null | undefined, d = 2) =>
  v == null ? '—' : Number(v).toFixed(d);

function scoreBadge(score: number | null | undefined) {
  if (score == null) return { label: '—', cls: 'bg-muted text-muted-foreground' };
  if (score >= 90) return { label: String(score), cls: 'bg-success/15 text-success dark:text-success border border-success/30' };
  if (score >= 50) return { label: String(score), cls: 'bg-warning/15 text-warning dark:text-warning border border-warning/30' };
  return { label: String(score), cls: 'bg-destructive/15 text-destructive dark:text-destructive border border-destructive/30' };
}

function ratingClass(rating: string | null | undefined) {
  if (rating === 'good') return 'text-success dark:text-success';
  if (rating === 'needs-improvement') return 'text-warning dark:text-warning';
  if (rating === 'poor') return 'text-destructive dark:text-destructive';
  return 'text-muted-foreground';
}

/* ─── Page ─── */
const AdminSiteAudit = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [windowHours, setWindowHours] = useState<24 | 72 | 168>(24);

  /* RUM summary */
  const vitalsQuery = useQuery({
    queryKey: ['web-vitals-summary', windowHours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_vitals_summary', { _hours: windowHours });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  /* Latest perf rows (one per URL = newest) */
  const perfQuery = useQuery({
    queryKey: ['perf-audit-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perf_audit_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      // Keep latest + previous per (url, strategy) for comparison
      const grouped = new Map<string, typeof data>();
      for (const row of data ?? []) {
        const key = `${row.url}::${row.strategy}`;
        const arr = grouped.get(key) ?? [];
        if (arr.length < 2) arr.push(row);
        grouped.set(key, arr);
      }
      return Array.from(grouped.values()).map(([latest, previous]) => ({
        ...latest,
        previous: previous ?? null,
      }));
    },
    staleTime: 60_000,
  });

  /* Perf history for trend chart */
  const perfHistoryQuery = useQuery({
    queryKey: ['perf-audit-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perf_audit_runs')
        .select('created_at, performance_score, url')
        .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;
      // Average score per day
      const buckets = new Map<string, { sum: number; n: number }>();
      for (const r of data ?? []) {
        if (r.performance_score == null) continue;
        const day = new Date(r.created_at).toISOString().slice(0, 10);
        const b = buckets.get(day) ?? { sum: 0, n: 0 };
        b.sum += r.performance_score;
        b.n += 1;
        buckets.set(day, b);
      }
      return Array.from(buckets.entries())
        .map(([day, b]) => ({ day, score: Math.round(b.sum / b.n) }))
        .sort((a, b) => a.day.localeCompare(b.day));
    },
    staleTime: 60_000,
  });

  /* Latest SEO run */
  const seoQuery = useQuery({
    queryKey: ['seo-audit-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_audit_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  /* Run audit */
  const runMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await runSiteAudit();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم تشغيل التدقيق بنجاح' : 'Audit completed successfully');
      queryClient.invalidateQueries({ queryKey: ['perf-audit-latest'] });
      queryClient.invalidateQueries({ queryKey: ['perf-audit-history'] });
      queryClient.invalidateQueries({ queryKey: ['seo-audit-latest'] });
    },
    onError: (e: Error) => {
      toast.error((isRTL ? 'فشل التدقيق: ' : 'Audit failed: ') + e.message);
    },
  });

  const seoLatest = seoQuery.data;
  const pageResults = useMemo(() => {
    const arr = (seoLatest?.page_results as unknown);
    return Array.isArray(arr) ? arr as Array<Record<string, unknown>> : [];
  }, [seoLatest]);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Gauge className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              {isRTL ? 'تدقيق الأداء و SEO' : 'Performance & SEO Audit'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL
                ? 'بيانات حقيقية من الزوار + فحص PageSpeed + سلامة Sitemap و Robots'
                : 'Real-user metrics + PageSpeed lab data + Sitemap/Robots health'}
            </p>
          </div>
          <Button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="gap-2"
          >
            {runMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            {isRTL ? 'تشغيل تدقيق الآن' : 'Run audit now'}
          </Button>
        </div>

        {/* ─── RUM (Real Users) ─── */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                {isRTL ? 'مقاييس Core Web Vitals (زوار حقيقيون)' : 'Core Web Vitals (Real Users)'}
              </CardTitle>
              <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
                {([24, 72, 168] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setWindowHours(h)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                      windowHours === h
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {h === 24 ? (isRTL ? '24س' : '24h') : h === 72 ? (isRTL ? '3أيام' : '3d') : (isRTL ? '7أيام' : '7d')}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {vitalsQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : !vitalsQuery.data || vitalsQuery.data.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {isRTL
                  ? 'لا توجد عينات بعد. سيتم جمع البيانات تلقائياً عند زيارة الموقع المنشور.'
                  : 'No samples yet. Data is collected automatically from published-site visitors.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const).map(name => {
                  const row = vitalsQuery.data!.find(r => r.metric_name === name);
                  const isCls = name === 'CLS';
                  const value = row?.p75 != null
                    ? (isCls ? Number(row.p75).toFixed(3) : fmtMs(Number(row.p75)))
                    : '—';
                  return (
                    <div key={name} className="rounded-lg border border-border/40 bg-card p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">{name}</span>
                        {row?.good_pct != null && (
                          <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5', Number(row.good_pct) >= 75 ? 'border-success/30 text-success' : 'border-warning/30 text-warning')}>
                            {Math.round(Number(row.good_pct))}% {isRTL ? 'جيد' : 'good'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {isRTL ? 'p75 — ' : 'p75 — '}{row?.sample_count ?? 0} {isRTL ? 'عينة' : 'samples'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── PageSpeed Latest + Trend ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="border-border/40 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-accent" />
                {isRTL ? 'PageSpeed (آخر فحص لكل صفحة)' : 'PageSpeed (latest per page)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {perfQuery.isLoading ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : !perfQuery.data || perfQuery.data.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد فحوصات بعد. اضغط "تشغيل تدقيق الآن".' : 'No runs yet. Click "Run audit now".'}
                </div>
              ) : (
                <div className="space-y-2">
                  {perfQuery.data.map(row => {
                    const perf = scoreBadge(row.performance_score);
                    const a11y = scoreBadge(row.accessibility_score);
                    const bp = scoreBadge(row.best_practices_score);
                    const seo = scoreBadge(row.seo_score);
                    const prev = row.previous;
                    const delta = prev?.performance_score != null && row.performance_score != null
                      ? row.performance_score - prev.performance_score
                      : null;
                    return (
                      <div key={row.id} className="rounded-lg border border-border/40 bg-card/50 p-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <code className="text-[11px] tech-content text-muted-foreground truncate max-w-[260px]" dir="ltr">
                            {row.url.replace('https://qitaat.com', '') || '/'}
                          </code>
                          <div className="flex gap-1">
                            {delta != null && (
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums flex items-center gap-0.5',
                                delta > 0 ? 'bg-success/15 text-success dark:text-success'
                                : delta < 0 ? 'bg-destructive/15 text-destructive dark:text-destructive'
                                : 'bg-muted text-muted-foreground'
                              )} title={isRTL ? `السابق: ${prev?.performance_score}` : `Previous: ${prev?.performance_score}`}>
                                {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : delta < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                                {delta > 0 ? '+' : ''}{delta}
                              </span>
                            )}
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', perf.cls)}>P {perf.label}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', a11y.cls)}>A {a11y.label}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', bp.cls)}>BP {bp.label}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums', seo.cls)}>S {seo.label}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-2 text-[10px] tabular-nums">
                          <div><span className="text-muted-foreground">LCP </span><span className="font-medium">{fmtMs(row.lcp_ms)}</span></div>
                          <div><span className="text-muted-foreground">CLS </span><span className="font-medium">{fmtNum(row.cls, 3)}</span></div>
                          <div><span className="text-muted-foreground">TBT </span><span className="font-medium">{fmtMs(row.tbt_ms)}</span></div>
                          <div><span className="text-muted-foreground">FCP </span><span className="font-medium">{fmtMs(row.fcp_ms)}</span></div>
                          <div><span className="text-muted-foreground">SI </span><span className="font-medium">{fmtMs(row.speed_index_ms)}</span></div>
                        </div>
                        {row.error && (
                          <p className="text-[10px] text-destructive mt-1">⚠ {row.error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                {isRTL ? 'متوسط الأداء (30 يوم)' : 'Performance trend (30d)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {perfHistoryQuery.isLoading ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : !perfHistoryQuery.data || perfHistoryQuery.data.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {isRTL ? 'لا توجد بيانات تاريخية بعد.' : 'No historical data yet.'}
                </div>
              ) : (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perfHistoryQuery.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── SEO health ─── */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-accent" />
              {isRTL ? 'سلامة SEO' : 'SEO health'}
              {seoLatest && (
                <span className="text-[10px] text-muted-foreground font-normal ms-auto">
                  {isRTL ? 'آخر فحص: ' : 'Last run: '}
                  {new Date(seoLatest.created_at).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seoQuery.isLoading ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : !seoLatest ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {isRTL ? 'لم يتم تشغيل أي فحص SEO بعد.' : 'No SEO audit has been run yet.'}
              </div>
            ) : (
              <>
                {/* Robots / Sitemap chips */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <CheckRow
                    icon={<Globe className="w-3.5 h-3.5" />}
                    label={isRTL ? 'robots.txt' : 'robots.txt'}
                    ok={!!seoLatest.robots_ok}
                    detail={`HTTP ${seoLatest.robots_status ?? '—'}`}
                  />
                  <CheckRow
                    icon={<ListTree className="w-3.5 h-3.5" />}
                    label={isRTL ? 'يحتوي رابط Sitemap' : 'Sitemap referenced'}
                    ok={!!seoLatest.robots_has_sitemap}
                    detail={isRTL ? 'في robots.txt' : 'in robots.txt'}
                  />
                  <CheckRow
                    icon={<ListTree className="w-3.5 h-3.5" />}
                    label="sitemap.xml"
                    ok={!!seoLatest.sitemap_ok}
                    detail={`${seoLatest.sitemap_url_count ?? 0} ${isRTL ? 'رابط' : 'URLs'}`}
                  />
                </div>

                {/* Per-page table */}
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <div className="bg-muted/30 px-3 py-2 text-[11px] font-semibold flex items-center justify-between">
                    <span>{isRTL ? 'فحص الصفحات الرئيسية' : 'Key pages'}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {seoLatest.pages_passed}/{seoLatest.pages_checked} {isRTL ? 'نجحت' : 'passed'}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border/40">
                    {pageResults.map((p, i) => {
                      const passed = !!p.passed;
                      return (
                        <div key={i} className="px-3 py-2 flex items-center gap-2 flex-wrap text-[11px]">
                          {passed
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                          <code className="tech-content text-muted-foreground" dir="ltr">
                            {String(p.url ?? '').replace('https://qitaat.com', '') || '/'}
                          </code>
                          <div className="ms-auto flex flex-wrap gap-1 tabular-nums">
                            <Chip ok={!!p.has_title}>{isRTL ? 'العنوان' : 'title'} {Number(p.title_length) || 0}</Chip>
                            <Chip ok={!!p.has_description}>{isRTL ? 'الوصف' : 'desc'} {Number(p.description_length) || 0}</Chip>
                            <Chip ok={p.h1_count === 1}>H1 {Number(p.h1_count) || 0}</Chip>
                            <Chip ok={!!p.has_canonical}>{isRTL ? 'قانوني' : 'canonical'}</Chip>
                            <Chip ok={!!p.has_og_image}>OG</Chip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Actionable Issues Report ─── */}
        <IssuesReport pageResults={pageResults} isRTL={isRTL} hasData={!!seoLatest} />
      </div>
    </DashboardLayout>
  );
};

/* ─── Small inline components ─── */
function CheckRow({ icon, label, ok, detail }: {
  icon: React.ReactNode; label: string; ok: boolean; detail: string;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-2.5 flex items-center gap-2',
      ok ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
    )}>
      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0',
        ok ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
        {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold flex items-center gap-1.5">{icon}{label}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">{detail}</div>
      </div>
    </div>
  );
}

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-[9px] font-medium border',
      ok
        ? 'border-success/30 bg-success/10 text-success dark:text-success'
        : 'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive'
    )}>
      {children}
    </span>
  );
}

/* ─── Actionable Issues Report ─── */
type Severity = 'high' | 'medium' | 'low';
interface Issue {
  url: string;
  category: string;
  severity: Severity;
  problem_ar: string;
  problem_en: string;
  fix_ar: string;
  fix_en: string;
}

function buildIssues(pages: Array<Record<string, unknown>>): Issue[] {
  const issues: Issue[] = [];
  for (const p of pages) {
    const url = String(p.url ?? '');
    const titleLen = Number(p.title_length) || 0;
    const descLen = Number(p.description_length) || 0;
    const h1Count = Number(p.h1_count) || 0;

    if (!p.has_title || titleLen === 0) {
      issues.push({ url, category: 'meta', severity: 'high',
        problem_ar: 'لا يوجد وسم <title>',
        problem_en: 'Missing <title> tag',
        fix_ar: 'أضف عنواناً وصفياً بين 50-60 حرف يحتوي الكلمة المفتاحية الأساسية.',
        fix_en: 'Add a descriptive 50-60 char title containing the primary keyword.' });
    } else if (titleLen < 10) {
      issues.push({ url, category: 'meta', severity: 'medium',
        problem_ar: `العنوان قصير جداً (${titleLen} حرف)`,
        problem_en: `Title too short (${titleLen} chars)`,
        fix_ar: 'وسّع العنوان ليصبح 50-60 حرفاً ويصف الصفحة بدقة.',
        fix_en: 'Expand the title to 50-60 characters describing the page accurately.' });
    } else if (titleLen > 70) {
      issues.push({ url, category: 'meta', severity: 'low',
        problem_ar: `العنوان طويل جداً (${titleLen} حرف) — سيُقتطع في نتائج البحث`,
        problem_en: `Title too long (${titleLen} chars) — will be truncated in SERPs`,
        fix_ar: 'اختصر العنوان إلى 50-60 حرفاً مع الإبقاء على الكلمات المفتاحية في البداية.',
        fix_en: 'Shorten to 50-60 chars, keeping primary keywords at the start.' });
    }

    if (!p.has_description || descLen === 0) {
      issues.push({ url, category: 'meta', severity: 'high',
        problem_ar: 'لا يوجد وصف ميتا (meta description)',
        problem_en: 'Missing meta description',
        fix_ar: 'أضف <meta name="description"> بين 120-160 حرف يحتوي دعوة لاتخاذ إجراء.',
        fix_en: 'Add a 120-160 char meta description with a call-to-action.' });
    } else if (descLen < 50) {
      issues.push({ url, category: 'meta', severity: 'medium',
        problem_ar: `وصف الميتا قصير (${descLen} حرف)`,
        problem_en: `Meta description too short (${descLen} chars)`,
        fix_ar: 'وسّع الوصف إلى 120-160 حرفاً.',
        fix_en: 'Expand the description to 120-160 characters.' });
    } else if (descLen > 200) {
      issues.push({ url, category: 'meta', severity: 'low',
        problem_ar: `وصف الميتا طويل (${descLen} حرف)`,
        problem_en: `Meta description too long (${descLen} chars)`,
        fix_ar: 'اختصر الوصف ليبقى تحت 160 حرفاً.',
        fix_en: 'Trim the description to under 160 characters.' });
    }

    if (h1Count === 0) {
      issues.push({ url, category: 'headings', severity: 'high',
        problem_ar: 'لا يوجد عنوان رئيسي <h1>',
        problem_en: 'No <h1> heading found',
        fix_ar: 'أضف عنواناً واحداً <h1> يلخص محتوى الصفحة في أعلى المحتوى.',
        fix_en: 'Add exactly one <h1> at the top describing the page content.' });
    } else if (h1Count > 1) {
      issues.push({ url, category: 'headings', severity: 'medium',
        problem_ar: `يوجد ${h1Count} عناوين <h1> — يجب أن يكون واحداً فقط`,
        problem_en: `Found ${h1Count} <h1> tags — should be exactly one`,
        fix_ar: 'حوّل العناوين الإضافية إلى <h2> أو <h3> حسب الترتيب الهرمي.',
        fix_en: 'Convert extra h1s to <h2> / <h3> following heading hierarchy.' });
    }

    if (!p.has_canonical) {
      issues.push({ url, category: 'canonical', severity: 'high',
        problem_ar: 'لا يوجد رابط قانوني (canonical)',
        problem_en: 'Missing canonical link',
        fix_ar: 'أضف <link rel="canonical" href="..."> لتجنب مشاكل المحتوى المكرر.',
        fix_en: 'Add <link rel="canonical" href="..."> to avoid duplicate content issues.' });
    }

    if (!p.has_og_image) {
      issues.push({ url, category: 'social', severity: 'medium',
        problem_ar: 'لا توجد صورة Open Graph للمشاركة الاجتماعية',
        problem_en: 'Missing Open Graph image',
        fix_ar: 'أضف <meta property="og:image" content="..."> بمقاس 1200x630 للمعاينات.',
        fix_en: 'Add <meta property="og:image" content="..."> at 1200x630 for previews.' });
    }
  }
  return issues;
}

function IssuesReport({ pageResults, isRTL, hasData }: {
  pageResults: Array<Record<string, unknown>>; isRTL: boolean; hasData: boolean;
}) {
  const issues = useMemo(() => buildIssues(pageResults), [pageResults]);
  const counts = useMemo(() => ({
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  }), [issues]);

  const sevStyle = (s: Severity) =>
    s === 'high' ? 'border-destructive/40 bg-destructive/5'
    : s === 'medium' ? 'border-warning/40 bg-warning/5'
    : 'border-info/30 bg-info/5';
  const sevBadge = (s: Severity) =>
    s === 'high' ? 'bg-destructive/15 text-destructive dark:text-destructive border-destructive/30'
    : s === 'medium' ? 'bg-warning/15 text-warning dark:text-warning border-warning/30'
    : 'bg-info/15 text-info dark:text-info border-info/30';
  const sevLabel = (s: Severity) =>
    isRTL
      ? (s === 'high' ? 'حرج' : s === 'medium' ? 'متوسط' : 'منخفض')
      : s.toUpperCase();

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Wrench className="w-4 h-4 text-accent" />
          {isRTL ? 'تقرير المشاكل القابلة للإصلاح' : 'Actionable SEO Issues'}
          {hasData && (
            <div className="ms-auto flex gap-1">
              <Badge variant="outline" className={cn('text-[10px]', sevBadge('high'))}>
                {counts.high} {isRTL ? 'حرج' : 'high'}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px]', sevBadge('medium'))}>
                {counts.medium} {isRTL ? 'متوسط' : 'med'}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px]', sevBadge('low'))}>
                {counts.low} {isRTL ? 'منخفض' : 'low'}
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {isRTL ? 'شغّل التدقيق أولاً لرؤية التقرير.' : 'Run the audit first to see the report.'}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-success dark:text-success">
            <CheckCircle2 className="w-5 h-5" />
            {isRTL ? 'ممتاز! لا توجد مشاكل SEO.' : 'Excellent! No SEO issues found.'}
          </div>
        ) : (
          <div className="space-y-2">
            {(['high', 'medium', 'low'] as Severity[]).flatMap(sev =>
              issues.filter(i => i.severity === sev).map((issue, i) => (
                <div key={`${sev}-${i}`} className={cn('rounded-lg border p-2.5', sevStyle(issue.severity))}>
                  <div className="flex items-start gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-[9px] h-5 shrink-0', sevBadge(issue.severity))}>
                      {sevLabel(issue.severity)}
                    </Badge>
                    <code className="text-[11px] tech-content text-muted-foreground" dir="ltr">
                      {issue.url.replace('https://qitaat.com', '') || '/'}
                    </code>
                    <Badge variant="outline" className="text-[9px] h-5 shrink-0">
                      {issue.category}
                    </Badge>
                  </div>
                  <div className="mt-1.5 text-xs font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span dir="auto">{isRTL ? issue.problem_ar : issue.problem_en}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
                    <span dir="auto">{isRTL ? issue.fix_ar : issue.fix_en}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminSiteAudit;