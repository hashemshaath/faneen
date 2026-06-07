import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink, FileText, Play,
  History, Shield, Mail, Activity, Link2, Copy, Download, Send, Globe2,
  Wrench, Lightbulb, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { auditSitemapStatus, pingSearchEngines } from '@/modules/seo';
import { toast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { PageHeader, MetricCard, FiltersBar, StatusBadge } from '@/components/shared';

import { useNoIndex } from "@/hooks/useNoIndex";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FUNC = `${SUPABASE_URL}/functions/v1/sitemap`;
const SITE = 'https://qitaat.com';
const TYPES = ['static', 'businesses', 'blog', 'categories', 'cities', 'profiles', 'projects'] as const;
type SitemapType = typeof TYPES[number];

interface CheckResult {
  url: string;
  ok: boolean;
  status: number;
  contentType: string;
  isXml: boolean;
  isSpaFallback: boolean;
  headerXmlMismatch?: boolean;
  urlCount: number;
  lastmod: string | null;
  error?: string;
  fetchedAt: string;
}

async function checkUrl(url: string): Promise<CheckResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();
    // Body-based truth: gateways occasionally rewrite Content-Type.
    const startsWithXml = text.trimStart().startsWith('<?xml');
    const headerSaysXml = /xml/i.test(contentType);
    const isXml = startsWithXml;
    const isSpaFallback = !isXml && (/<!doctype html>/i.test(text) || /<html/i.test(text));
    const urlMatches = text.match(/<url>/g) ?? text.match(/<sitemap>/g) ?? [];
    const lastmodMatch = text.match(/<lastmod>([^<]+)<\/lastmod>/);
    const isRobots = url.endsWith('/robots.txt');
    return {
      url,
      ok: res.ok && (isRobots ? !isSpaFallback : isXml && !isSpaFallback),
      status: res.status,
      contentType, isXml, isSpaFallback,
      headerXmlMismatch: startsWithXml && !headerSaysXml,
      urlCount: urlMatches.length,
      lastmod: lastmodMatch?.[1] ?? null,
      fetchedAt,
    };
  } catch (e) {
    return {
      url, ok: false, status: 0, contentType: '', isXml: false, isSpaFallback: false,
      headerXmlMismatch: false, urlCount: 0, lastmod: null,
      error: e instanceof Error ? e.message : 'Unknown error',
      fetchedAt,
    };
  }
}

export default function AdminSitemapStatus() {
  useNoIndex();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'errors' | 'spa'>('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sitemap-status'],
    queryFn: async () => {
      const targets = [
        { label: isAr ? 'robots.txt (نطاق)' : 'robots.txt (domain)', url: `${SITE}/robots.txt` },
        { label: isAr ? 'sitemap.xml (نطاق)' : 'sitemap.xml (domain)', url: `${SITE}/sitemap.xml` },
        { label: isAr ? 'sitemap index (Edge)' : 'Sitemap index (Edge)', url: FUNC },
        ...TYPES.map((t) => ({ label: t, url: `${FUNC}?type=${t}` })),
      ];
      const results = await Promise.all(targets.map(async (t) => ({ ...t, result: await checkUrl(t.url) })));
      // If any failed (likely cross-origin from preview), fall back to server-side audit
      const anyFailed = results.some((r) => r.result.status === 0);
      if (anyFailed) {
        try {
          const { data: serverData } = await auditSitemapStatus({
            triggeredBy: 'dashboard-fallback',
            dryRun: true,
          }) as { data: { results?: unknown[] } | null };
          const serverResults = (serverData?.results ?? []) as Array<{ url: string; status: number; ok: boolean; isXml: boolean; isSpaFallback: boolean; headerXmlMismatch?: boolean; urlCount: number; lastmod: string | null; contentType: string; error?: string }>;
          return results.map((row) => {
            if (row.result.status !== 0) return row;
            const s = serverResults.find((sr) => sr.url === row.url);
            if (!s) return row;
            return {
              ...row,
              result: {
                url: row.url,
                ok: s.ok,
                status: s.status,
                contentType: s.contentType ?? '',
                isXml: s.isXml,
                isSpaFallback: s.isSpaFallback,
                headerXmlMismatch: s.headerXmlMismatch,
                urlCount: s.urlCount ?? 0,
                lastmod: s.lastmod ?? null,
                error: s.error,
                fetchedAt: new Date().toISOString(),
              },
            };
          });
        } catch {
          return results;
        }
      }
      return results;
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const totalUrls = (data ?? [])
    .filter((r) => r.url.includes('?type=') && r.url !== FUNC)
    .reduce((s, r) => s + r.result.urlCount, 0);
  const errorCount = (data ?? []).filter((r) => !r.result.ok).length;
  const okCount = (data ?? []).filter((r) => r.result.ok).length;
  const spaCount = (data ?? []).filter((r) => r.result.isSpaFallback).length;
  const healthScore = data && data.length
    ? Math.round((okCount / data.length) * 100)
    : 0;

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((row) => {
      const r = row.result;
      if (statusFilter === 'healthy' && !r.ok) return false;
      if (statusFilter === 'errors' && r.ok) return false;
      if (statusFilter === 'spa' && !r.isSpaFallback) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!row.url.toLowerCase().includes(q) && !row.label.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, search]);

  const history = useQuery({
    queryKey: ['sitemap-audit-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sitemap_audit_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const runAndSave = useMutation({
    mutationFn: async () => {
      const { data, error } = await auditSitemapStatus({ triggeredBy: 'manual' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: isAr ? 'تم تشغيل الفحص وحفظه' : 'Audit run saved' });
      qc.invalidateQueries({ queryKey: ['sitemap-audit-history'] });
      refetch();
    },
    onError: (e: unknown) => {
      toast({ title: isAr ? 'فشل تشغيل الفحص' : 'Audit run failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    },
  });

  const latest = history.data?.[0];
  const robotsRows = (latest?.robots_check as Array<{ path: string; expected: string; actual: string; matched: string | null; ok: boolean }> | undefined) ?? [];

  const pingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await pingSearchEngines({ source: 'manual' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: isAr ? 'تم إرسال التنبيه لمحركات البحث' : 'Search engines pinged' });
    },
    onError: (e: unknown) => {
      toast({ title: isAr ? 'فشل إرسال التنبيه' : 'Ping failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    },
  });

  const copyUrl = (url: string) => {
    navigator.clipboard?.writeText(url).then(() => {
      toast({ title: isAr ? 'تم نسخ الرابط' : 'URL copied' });
    }).catch(() => undefined);
  };

  const exportJson = () => {
    const payload = { generatedAt: new Date().toISOString(), totalUrls, okCount, errorCount, results: data ?? [] };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sitemap-status-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ─── Recommendations engine ─────────────────────────────────────────
  type Severity = 'critical' | 'warning' | 'info';
  interface Recommendation {
    id: string;
    severity: Severity;
    title: string;
    detail: string;
    affected?: string[];
    actionLabel?: string;
    action?: () => void;
    actionPending?: boolean;
    secondary?: { label: string; onClick: () => void };
  }

  const recommendations = useMemo<Recommendation[]>(() => {
    const rows = data ?? [];
    if (!rows.length) return [];
    const recs: Recommendation[] = [];

    const spaRows = rows.filter((r) => r.result.isSpaFallback);
    if (spaRows.length) {
      recs.push({
        id: 'spa-fallback',
        severity: 'critical',
        title: isAr ? 'يتم إرجاع HTML بدلاً من XML' : 'HTML returned instead of XML',
        detail: isAr
          ? 'بعض النقاط ترجع صفحة SPA بدلاً من ملف Sitemap صحيح. أعد تشغيل دالة sitemap وتأكد من إعدادات التوجيه (rewrites) قبل الـ SPA.'
          : 'Some endpoints return the SPA HTML instead of a valid sitemap. Re-run the sitemap function and ensure routing rewrites take precedence over the SPA shell.',
        affected: spaRows.map((r) => r.url),
        actionLabel: isAr ? 'إعادة فحص وحفظ' : 'Re-run audit',
        action: () => runAndSave.mutate(),
        actionPending: runAndSave.isPending,
      });
    }

    const networkErrors = rows.filter((r) => r.result.status === 0);
    if (networkErrors.length) {
      recs.push({
        id: 'network-errors',
        severity: 'critical',
        title: isAr ? 'تعذر الوصول لبعض النقاط' : 'Some endpoints are unreachable',
        detail: isAr
          ? 'فشل الجلب (CORS أو 5xx). جرّب التشغيل من جانب الخادم عبر "تشغيل وحفظ" للحصول على نتيجة دقيقة.'
          : 'Fetch failed (CORS or 5xx). Run the server-side audit via "Run & save" for an accurate result.',
        affected: networkErrors.map((r) => r.url),
        actionLabel: isAr ? 'تشغيل فحص الخادم' : 'Run server audit',
        action: () => runAndSave.mutate(),
        actionPending: runAndSave.isPending,
      });
    }

    const httpErrors = rows.filter((r) => r.result.status >= 400);
    if (httpErrors.length) {
      recs.push({
        id: 'http-errors',
        severity: 'critical',
        title: isAr ? `أخطاء HTTP (${httpErrors.length})` : `HTTP errors (${httpErrors.length})`,
        detail: isAr
          ? 'تحقق من سجلات دالة sitemap لمعرفة السبب (مفتاح ناقص، استعلام DB، أو timeout).'
          : 'Inspect the sitemap edge function logs to identify the cause (missing key, DB query, or timeout).',
        affected: httpErrors.map((r) => `${r.url} [${r.result.status}]`),
      });
    }

    const emptyTypes = rows.filter((r) => r.url.includes('?type=') && r.result.ok && r.result.urlCount === 0);
    if (emptyTypes.length) {
      recs.push({
        id: 'empty-types',
        severity: 'warning',
        title: isAr ? 'sitemaps بدون روابط' : 'Sitemaps with zero URLs',
        detail: isAr
          ? 'هذه الأنواع تُرجع XML صحيح لكن بدون روابط — تأكد من وجود بيانات منشورة في الجداول المرتبطة.'
          : 'These types return valid XML but contain no URLs — verify the underlying tables have published rows.',
        affected: emptyTypes.map((r) => r.label),
      });
    }

    const badRobots = robotsRows.filter((r) => !r.ok);
    if (badRobots.length) {
      recs.push({
        id: 'robots-mismatch',
        severity: 'warning',
        title: isAr ? 'قواعد robots.txt غير مطابقة' : 'robots.txt rules mismatch',
        detail: isAr
          ? 'حدّث public/robots.txt ليطابق القواعد المتوقعة لكل مسار.'
          : 'Update public/robots.txt so it matches the expected rules per path.',
        affected: badRobots.map((r) => `${r.path} → ${isAr ? 'متوقع' : 'expected'} ${r.expected}, ${isAr ? 'فعلي' : 'actual'} ${r.actual}`),
      });
    }

    if (!latest) {
      recs.push({
        id: 'no-history',
        severity: 'info',
        title: isAr ? 'لا يوجد فحص محفوظ' : 'No saved audit yet',
        detail: isAr ? 'شغّل أول فحص لتفعيل المقارنة التاريخية والتنبيهات.' : 'Run the first audit to enable history comparison and alerts.',
        actionLabel: isAr ? 'تشغيل وحفظ' : 'Run & save',
        action: () => runAndSave.mutate(),
        actionPending: runAndSave.isPending,
      });
    }

    if (errorCount === 0 && spaCount === 0 && rows.length > 0) {
      recs.push({
        id: 'ping-engines',
        severity: 'info',
        title: isAr ? 'كل شيء سليم — أعلم محركات البحث' : 'Everything healthy — notify search engines',
        detail: isAr
          ? 'لا توجد أخطاء حالياً. أرسل ping لـ Google و Bing لتسريع إعادة الفهرسة.'
          : 'No errors detected. Ping Google and Bing to accelerate re-indexing.',
        actionLabel: isAr ? 'إعلام محركات البحث' : 'Ping search engines',
        action: () => pingMutation.mutate(),
        actionPending: pingMutation.isPending,
      });
    }

    return recs;
  }, [data, robotsRows, latest, errorCount, spaCount, isAr, runAndSave, pingMutation]);

  const criticalCount = recommendations.filter((r) => r.severity === 'critical').length;
  const warningCount = recommendations.filter((r) => r.severity === 'warning').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Globe2}
          eyebrow={isAr ? 'مركز الفهرسة' : 'Indexing center'}
          title={isAr ? 'حالة فهرسة Sitemap' : 'Sitemap Indexing Status'}
          subtitle={isAr ? 'فحص مباشر لـ XML والروابط، اكتشاف SPA fallback، وتنبيه محركات البحث.' : 'Live XML check, link counts, SPA fallback detection, and search engine pinging.'}
          tone={errorCount ? 'warning' : 'success'}
          actions={
            <>
              <Button onClick={exportJson} disabled={!data?.length} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {isAr ? 'تصدير JSON' : 'Export JSON'}
              </Button>
              <Button onClick={() => pingMutation.mutate()} disabled={pingMutation.isPending} variant="outline" size="sm" className="gap-2">
                <Send className={`h-4 w-4 ${pingMutation.isPending ? 'animate-pulse' : ''}`} />
                {isAr ? 'إعلام محركات البحث' : 'Ping search engines'}
              </Button>
              <Button onClick={() => refetch()} disabled={isFetching} variant="outline" size="sm" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isAr ? 'تحديث' : 'Refresh'}
              </Button>
              <Button onClick={() => runAndSave.mutate()} disabled={runAndSave.isPending} size="sm" className="gap-2">
                <Play className={`h-4 w-4 ${runAndSave.isPending ? 'animate-pulse' : ''}`} />
                {isAr ? 'تشغيل وحفظ' : 'Run & save'}
              </Button>
            </>
          }
          kpiSlot={
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label={isAr ? 'إجمالي الروابط' : 'Total URLs'} value={isLoading ? '—' : totalUrls} icon={Link2} tone="primary" hint={isAr ? 'داخل جميع sitemaps' : 'across all sitemaps'} />
              <MetricCard label={isAr ? 'مسارات سليمة' : 'Healthy'} value={isLoading ? '—' : okCount} icon={CheckCircle2} tone="success" hint={`${healthScore}% ${isAr ? 'صحة' : 'health'}`} />
              <MetricCard label={isAr ? 'أخطاء' : 'Errors'} value={isLoading ? '—' : errorCount} icon={AlertTriangle} tone={errorCount ? 'destructive' : 'muted'} />
              <MetricCard label={isAr ? 'SPA fallback' : 'SPA fallback'} value={isLoading ? '—' : spaCount} icon={Activity} tone={spaCount ? 'warning' : 'muted'} hint={isAr ? 'يجب أن يكون 0' : 'should be 0'} />
            </div>
          }
        />

        <FiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={isAr ? 'ابحث برابط أو اسم نقطة…' : 'Search by URL or endpoint…'}
          pills={[
            { key: 'all',     label: isAr ? 'الكل' : 'All',         count: data?.length ?? 0, tone: 'default' },
            { key: 'healthy', label: isAr ? 'سليمة' : 'Healthy',    count: okCount,           tone: 'success' },
            { key: 'errors',  label: isAr ? 'أخطاء' : 'Errors',     count: errorCount,        tone: 'destructive' },
            { key: 'spa',     label: 'SPA fallback',                count: spaCount,          tone: 'warning' },
          ]}
          activePill={statusFilter}
          onPillSelect={(k) => setStatusFilter(k as typeof statusFilter)}
          canClear={statusFilter !== 'all' || !!search}
          onClear={() => { setStatusFilter('all'); setSearch(''); }}
          clearLabel={isAr ? 'مسح' : 'Clear'}
        />

        {/* Recommendations / Auto-fix */}
        <Card className={criticalCount ? 'border-destructive/40' : warningCount ? 'border-warning/40' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <Lightbulb className="h-5 w-5 text-warning" />
              {isAr ? 'التوصيات والإصلاح التلقائي' : 'Recommendations & auto-fix'}
              {criticalCount > 0 && (
                <Badge variant="destructive" className="tech-content">
                  {criticalCount} {isAr ? 'حرج' : 'critical'}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="tech-content bg-warning/15 text-warning border-warning/30">
                  {warningCount} {isAr ? 'تحذير' : 'warning'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <Skeleton className="h-24 w-full" />}
            {!isLoading && recommendations.length === 0 && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground py-6 justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
                {isAr ? 'لا توجد توصيات — كل النقاط تعمل بشكل مثالي.' : 'No recommendations — all endpoints are perfect.'}
              </div>
            )}
            {!isLoading && recommendations.map((rec) => {
              const sevTone =
                rec.severity === 'critical'
                  ? 'border-destructive/40 bg-destructive/5'
                  : rec.severity === 'warning'
                  ? 'border-warning/40 bg-warning/5'
                  : 'border-primary/30 bg-primary/5';
              const SevIcon =
                rec.severity === 'critical' ? AlertTriangle : rec.severity === 'warning' ? Wrench : Zap;
              const sevColor =
                rec.severity === 'critical' ? 'text-destructive' : rec.severity === 'warning' ? 'text-warning' : 'text-primary';
              return (
                <div key={rec.id} className={`border rounded-2xl p-4 ${sevTone}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <SevIcon className={`h-5 w-5 mt-0.5 shrink-0 ${sevColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{rec.title}</div>
                        <p className="text-sm text-muted-foreground mt-1">{rec.detail}</p>
                        {rec.affected && rec.affected.length > 0 && (
                          <ul className="mt-2 text-xs text-muted-foreground tech-content space-y-0.5 list-disc ms-5">
                            {rec.affected.slice(0, 5).map((a) => (
                              <li key={a} className="break-all">{a}</li>
                            ))}
                            {rec.affected.length > 5 && (
                              <li className="opacity-70">+{rec.affected.length - 5} {isAr ? 'أخرى' : 'more'}</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                    {rec.action && rec.actionLabel && (
                      <Button
                        size="sm"
                        variant={rec.severity === 'critical' ? 'default' : 'outline'}
                        onClick={rec.action}
                        disabled={rec.actionPending}
                        className="gap-2 shrink-0"
                      >
                        <Wrench className={`h-3.5 w-3.5 ${rec.actionPending ? 'animate-pulse' : ''}`} />
                        {rec.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isAr ? 'تفاصيل الفحص' : 'Endpoint details'}
              <Badge variant="secondary" className="ms-2 tech-content">{filteredRows.length}/{data?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {!isLoading && filteredRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isAr ? 'لا توجد نتائج مطابقة للفلتر الحالي.' : 'No endpoints match the current filter.'}
              </p>
            )}
            {!isLoading && filteredRows.map((row) => {
              const r = row.result;
              const Icon = r.ok ? CheckCircle2 : (r.status === 0 || r.isSpaFallback) ? XCircle : AlertTriangle;
              const colorCls = r.ok ? 'text-success' : 'text-destructive';
              const tone: 'success' | 'destructive' | 'warning' = r.ok ? 'success' : r.isSpaFallback ? 'warning' : 'destructive';
              return (
                <div key={row.url} className={`border rounded-2xl p-4 hover-lift transition-colors ${r.ok ? 'bg-card' : r.isSpaFallback ? 'bg-warning/5 border-warning/30' : 'bg-destructive/5 border-destructive/30'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${colorCls}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold capitalize">{row.label}</div>
                        <a href={row.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary tech-content break-all inline-flex items-center gap-1">
                          {row.url} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge tone={tone} label={String(r.status || 'ERR')} />
                      {r.urlCount > 0 && (
                        <Badge variant="secondary" className="tech-content">
                          {r.urlCount} {isAr ? 'رابط' : 'urls'}
                        </Badge>
                      )}
                      {r.isSpaFallback && <Badge variant="destructive">{isAr ? 'SPA HTML!' : 'SPA HTML!'}</Badge>}
                      {!r.isXml && r.url.endsWith('.xml') === false && r.url.includes('functions/v1/sitemap') && (
                        <Badge variant="destructive">{isAr ? 'ليس XML' : 'Not XML'}</Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyUrl(row.url)} aria-label={isAr ? 'نسخ الرابط' : 'Copy URL'}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground tech-content">
                    <div><span className="opacity-60">Content-Type: </span>{r.contentType || '—'}</div>
                    <div><span className="opacity-60">Last-mod: </span>{r.lastmod ?? '—'}</div>
                    <div><span className="opacity-60">Checked: </span>{new Date(r.fetchedAt).toLocaleTimeString()}</div>
                    {r.error && <div className="col-span-full text-destructive dark:text-destructive">{r.error}</div>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Robots rules check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {isAr ? 'فحص قواعد robots.txt' : 'Robots.txt rules check'}
              {latest && <Badge variant="secondary" className="tech-content text-xs">{new Date(latest.created_at).toLocaleString()}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!latest && <p className="text-sm text-muted-foreground">{isAr ? 'لا يوجد فحص محفوظ بعد. اضغط "تشغيل وحفظ فحص".' : 'No saved audit yet. Click "Run & save audit".'}</p>}
            {latest && robotsRows.length === 0 && <p className="text-sm text-muted-foreground">{isAr ? 'تعذر قراءة robots.txt' : 'robots.txt could not be parsed'}</p>}
            {robotsRows.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {robotsRows.map((r) => (
                  <div key={r.path + r.expected} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${r.ok ? '' : 'border-destructive/40 bg-destructive/5'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium tech-content truncate">{r.path}</div>
                      <div className="text-xs text-muted-foreground tech-content">
                        {isAr ? 'متوقع' : 'expected'}: {r.expected}{r.matched ? ` · ${isAr ? 'القاعدة' : 'rule'}: ${r.matched}` : ''}
                      </div>
                    </div>
                    <Badge variant={r.ok ? 'default' : 'destructive'} className="tech-content">{r.actual}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {isAr ? 'سجل عمليات الفحص' : 'Audit history'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!history.isLoading && (history.data?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد عمليات فحص محفوظة بعد.' : 'No saved audit runs yet.'}</p>
            )}
            {history.data?.map((run) => {
              const isOpen = expandedRun === run.id;
              const diff = (run.diff_from_previous ?? {}) as { firstRun?: boolean; statusFlips?: Array<{ url: string; from: boolean; to: boolean }>; urlCountDeltas?: Array<{ url: string; from: number; to: number; delta: number }>; totalUrlsDelta?: number };
              return (
                <div key={run.id} className="border rounded-xl">
                  <button
                    type="button"
                    onClick={() => setExpandedRun(isOpen ? null : run.id)}
                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {run.has_failures || run.has_spa_fallback
                        ? <XCircle className="h-5 w-5 text-destructive dark:text-destructive shrink-0" />
                        : <CheckCircle2 className="h-5 w-5 text-success dark:text-success shrink-0" />}
                      <div className="text-start min-w-0">
                        <div className="text-sm font-semibold tech-content">{new Date(run.created_at).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground tech-content">
                          {run.triggered_by} · {run.ok_count}/{run.total_endpoints} ok · {run.total_urls} urls
                          {typeof diff.totalUrlsDelta === 'number' && diff.totalUrlsDelta !== 0 && (
                            <span className={diff.totalUrlsDelta > 0 ? ' text-success' : ' text-destructive'}> ({diff.totalUrlsDelta > 0 ? '+' : ''}{diff.totalUrlsDelta})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {run.has_spa_fallback && <Badge variant="destructive">SPA</Badge>}
                      {run.error_count > 0 && <Badge variant="destructive" className="tech-content">{run.error_count} err</Badge>}
                      {run.alert_sent && <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" />{isAr ? 'تنبيه' : 'alerted'}</Badge>}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t p-3 space-y-3 text-sm">
                      {diff.firstRun && <div className="text-xs text-muted-foreground">{isAr ? 'هذه أول عملية فحص — لا توجد مقارنة.' : 'First audit — no diff available.'}</div>}
                      {(diff.statusFlips?.length ?? 0) > 0 && (
                        <div>
                          <div className="font-semibold text-xs mb-1">{isAr ? 'تغيرات الحالة' : 'Status flips'}</div>
                          <ul className="text-xs space-y-1 tech-content">
                            {diff.statusFlips!.map((f) => (
                              <li key={f.url} className={f.to ? 'text-success' : 'text-destructive'}>
                                {f.url} : {String(f.from)} → {String(f.to)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(diff.urlCountDeltas?.length ?? 0) > 0 && (
                        <div>
                          <div className="font-semibold text-xs mb-1">{isAr ? 'تغيّر عدد الروابط' : 'URL count changes'}</div>
                          <ul className="text-xs space-y-1 tech-content">
                            {diff.urlCountDeltas!.map((d) => (
                              <li key={d.url}>
                                {d.url} : {d.from} → {d.to} <span className={d.delta > 0 ? 'text-success' : 'text-destructive'}>({d.delta > 0 ? '+' : ''}{d.delta})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-xs mb-1">{isAr ? 'النقاط' : 'Endpoints'}</div>
                        <ul className="text-xs space-y-1 tech-content">
                          {((run.results as Array<{ url: string; status: number; ok: boolean; urlCount: number; isSpaFallback: boolean }>) ?? []).map((r) => (
                            <li key={r.url} className={r.ok ? '' : 'text-destructive'}>
                              [{r.status || 'ERR'}] {r.url} — {r.urlCount} urls{r.isSpaFallback ? ' · SPA!' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}