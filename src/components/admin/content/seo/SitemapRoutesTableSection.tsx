import React from 'react';
import {
  FileText, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared';

export interface SitemapRouteCheckResult {
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

export interface SitemapRouteRow {
  url: string;
  label: string;
  result: SitemapRouteCheckResult;
}

/**
 * SitemapRoutesTableSection — presentational rendering of route check
 * cards. Does not generate sitemap output, never alters canonical URLs;
 * data is fetched and shaped by the parent page.
 */
export interface SitemapRoutesTableSectionProps {
  isLoading: boolean;
  rows: ReadonlyArray<SitemapRouteRow>;
  totalRows: number;
  isAr: boolean;
  onCopyUrl: (url: string) => void;
}

export const SitemapRoutesTableSection: React.FC<SitemapRoutesTableSectionProps> = ({
  isLoading, rows, totalRows, isAr, onCopyUrl,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        {isAr ? 'تفاصيل الفحص' : 'Endpoint details'}
        <Badge variant="secondary" className="ms-2 tech-content">{rows.length}/{totalRows}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {isAr ? 'لا توجد نتائج مطابقة للفلتر الحالي.' : 'No endpoints match the current filter.'}
        </p>
      )}
      {!isLoading && rows.map((row) => {
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
                {!r.isXml && !row.url.endsWith('/robots.txt') && (
                  <Badge variant="destructive">{isAr ? 'ليس XML' : 'Not XML'}</Badge>
                )}
                {r.headerXmlMismatch && (
                  <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/30 tech-content">
                    {isAr ? 'Header غير دقيق' : 'Header mismatch'}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onCopyUrl(row.url)} aria-label={isAr ? 'نسخ الرابط' : 'Copy URL'}>
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
);

export default SitemapRoutesTableSection;