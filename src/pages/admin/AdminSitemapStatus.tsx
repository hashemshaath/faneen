import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink, FileText } from 'lucide-react';

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
    const isXml = /xml/i.test(contentType) && text.trimStart().startsWith('<?xml');
    const isSpaFallback = /<!doctype html>/i.test(text) || /<html/i.test(text);
    const urlMatches = text.match(/<url>/g) ?? text.match(/<sitemap>/g) ?? [];
    const lastmodMatch = text.match(/<lastmod>([^<]+)<\/lastmod>/);
    return {
      url, ok: res.ok && isXml && !isSpaFallback, status: res.status,
      contentType, isXml, isSpaFallback,
      urlCount: urlMatches.length,
      lastmod: lastmodMatch?.[1] ?? null,
      fetchedAt,
    };
  } catch (e) {
    return {
      url, ok: false, status: 0, contentType: '', isXml: false, isSpaFallback: false,
      urlCount: 0, lastmod: null,
      error: e instanceof Error ? e.message : 'Unknown error',
      fetchedAt,
    };
  }
}

export default function AdminSitemapStatus() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{isAr ? 'حالة فهرسة Sitemap' : 'Sitemap Indexing Status'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? 'فحص مباشر لـ XML والروابط واكتشاف SPA fallback' : 'Live XML check, link counts, and SPA fallback detection'}
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isAr ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isAr ? 'إجمالي روابط فهرسة' : 'Total indexable URLs'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold tech-content">{isLoading ? '—' : totalUrls}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isAr ? 'مسارات سليمة' : 'Healthy endpoints'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tech-content">{isLoading ? '—' : okCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isAr ? 'أخطاء / تحذيرات' : 'Errors / warnings'}</CardTitle></CardHeader>
            <CardContent><div className={`text-3xl font-bold tech-content ${errorCount ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{isLoading ? '—' : errorCount}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{isAr ? 'تفاصيل الفحص' : 'Endpoint details'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {!isLoading && data?.map((row) => {
              const r = row.result;
              const Icon = r.ok ? CheckCircle2 : (r.status === 0 || r.isSpaFallback) ? XCircle : AlertTriangle;
              const colorCls = r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
              return (
                <div key={row.url} className="border rounded-xl p-4 hover-lift">
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
                      <Badge variant={r.ok ? 'default' : 'destructive'} className="tech-content">{r.status || 'ERR'}</Badge>
                      {r.urlCount > 0 && (
                        <Badge variant="secondary" className="tech-content">
                          {r.urlCount} {isAr ? 'رابط' : 'urls'}
                        </Badge>
                      )}
                      {r.isSpaFallback && <Badge variant="destructive">{isAr ? 'SPA HTML!' : 'SPA HTML!'}</Badge>}
                      {!r.isXml && r.url.endsWith('.xml') === false && r.url.includes('functions/v1/sitemap') && (
                        <Badge variant="destructive">{isAr ? 'ليس XML' : 'Not XML'}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground tech-content">
                    <div><span className="opacity-60">Content-Type: </span>{r.contentType || '—'}</div>
                    <div><span className="opacity-60">Last-mod: </span>{r.lastmod ?? '—'}</div>
                    <div><span className="opacity-60">Checked: </span>{new Date(r.fetchedAt).toLocaleTimeString()}</div>
                    {r.error && <div className="col-span-full text-red-600 dark:text-red-400">{r.error}</div>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}