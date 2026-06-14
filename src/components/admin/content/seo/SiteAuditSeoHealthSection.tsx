import React from 'react';
import {
  FileSearch, Globe, ListTree, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function CheckRow({ icon, label, ok, detail }: {
  icon: React.ReactNode; label: string; ok: boolean; detail: string;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-2.5 flex items-center gap-2',
      ok ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5',
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
        : 'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive',
    )}>
      {children}
    </span>
  );
}

export interface SeoLatestSummary {
  created_at: string;
  robots_ok: boolean | null;
  robots_status: number | null;
  robots_has_sitemap: boolean | null;
  sitemap_ok: boolean | null;
  sitemap_url_count: number | null;
  pages_passed: number | null;
  pages_checked: number | null;
  page_results?: unknown;
}

/**
 * SiteAuditSeoHealthSection — robots/sitemap chips + per-page meta check
 * table. Pure presentation; parent supplies the latest audit row and
 * pageResults.
 */
export interface SiteAuditSeoHealthSectionProps {
  isLoading: boolean;
  seoLatest: SeoLatestSummary | null;
  pageResults: ReadonlyArray<Record<string, unknown>>;
  isRTL: boolean;
}

export const SiteAuditSeoHealthSection: React.FC<SiteAuditSeoHealthSectionProps> = ({
  isLoading, seoLatest, pageResults, isRTL,
}) => (
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
      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : !seoLatest ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          {isRTL ? 'لم يتم تشغيل أي فحص SEO بعد.' : 'No SEO audit has been run yet.'}
        </div>
      ) : (
        <>
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
);

export default SiteAuditSeoHealthSection;