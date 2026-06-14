import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, RefreshCw, Play, Globe2, Wrench, Zap,
  Download, Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { auditSitemapStatus, pingSearchEngines } from '@/modules/seo';
import { toast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { PageHeader, FiltersBar } from '@/components/shared';
import {
  SeoHubPageShell,
  SitemapStatusSummarySection,
  SitemapRecommendationsSection,
  SitemapRoutesTableSection,
  SitemapRobotsRulesSection,
  SitemapAuditHistorySection,
  type SitemapRecommendation,
  type SitemapAuditRunRow,
} from '@/components/admin/content/seo';

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

    const headerIssues = rows.filter((r) => r.result.headerXmlMismatch);
    if (headerIssues.length) {
      recs.push({
        id: 'header-mismatch',
        severity: 'warning',
        title: isAr ? 'Content-Type غير مطابق للمحتوى' : 'Content-Type does not match body',
        detail: isAr
          ? 'النقاط تُعيد XML سليم لكن الـ Header يقول text/plain. Google يتسامح مع هذا غالباً لكن الأفضل أن يكون application/xml. ربما تُعيد بوابة Supabase Functions كتابة الـ header — استخدم رابط النطاق https://qitaat.com/sitemap.xml كمصدر أساسي في Google Search Console.'
          : 'Endpoints return valid XML but the header is text/plain. Google usually tolerates this but application/xml is preferred. The Supabase Functions gateway may rewrite the header — submit https://qitaat.com/sitemap.xml in Google Search Console as the canonical sitemap URL.',
        affected: headerIssues.map((r) => `${r.url} → ${r.result.contentType || 'unknown'}`),
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


  const historyRuns = (history.data ?? []) as unknown as SitemapAuditRunRow[];
  const recsForView = recommendations as unknown as SitemapRecommendation[];

  return (
    <DashboardLayout>
      <SeoHubPageShell
        header={
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
              <SitemapStatusSummarySection
                isLoading={isLoading}
                totalUrls={totalUrls}
                okCount={okCount}
                errorCount={errorCount}
                spaCount={spaCount}
                healthScore={healthScore}
                isAr={isAr}
              />
            }
          />
        }
        filtersSlot={
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
        }
        contentSlot={
          <div className="space-y-6">
            <SitemapRecommendationsSection
              isLoading={isLoading}
              recommendations={recsForView}
              isAr={isAr}
            />
            <SitemapRoutesTableSection
              isLoading={isLoading}
              rows={filteredRows}
              totalRows={data?.length ?? 0}
              isAr={isAr}
              onCopyUrl={copyUrl}
            />
            <SitemapRobotsRulesSection
              isAr={isAr}
              hasAudit={!!latest}
              auditCreatedAt={latest?.created_at ?? null}
              rows={robotsRows}
            />
            <SitemapAuditHistorySection
              isLoading={history.isLoading}
              runs={historyRuns}
              expandedRunId={expandedRun}
              onToggleRun={(id) => setExpandedRun(expandedRun === id ? null : id)}
              isAr={isAr}
            />
          </div>
        }
      />
    </DashboardLayout>
  );
}
