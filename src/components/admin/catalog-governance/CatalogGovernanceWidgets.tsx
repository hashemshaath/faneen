/**
 * PSG-1 — Catalog governance dashboard widgets.
 * Pure presentation. Data comes from the catalogGovernanceQueries wrapper.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CATALOG_LIFECYCLE_STAGES,
  type CatalogLifecycleStage,
} from '@/modules/catalog/governanceEvents';
import type {
  CatalogGovernanceKPIs,
  CatalogServiceInsight,
} from '@/modules/catalog/services/catalogGovernanceQueries';

type T = (ar: string, en: string) => string;

export const KpiSummary: React.FC<{ kpis: CatalogGovernanceKPIs; t: T }> = ({ kpis, t }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="catalog-kpi-summary">
    {[
      { k: 'total', ar: 'الإجمالي', en: 'Total', v: kpis.total },
      { k: 'ready', ar: 'جاهز للنشر', en: 'Ready to publish', v: kpis.readyToPublish },
      { k: 'low_quality', ar: 'جودة منخفضة', en: 'Low quality', v: kpis.lowQuality },
      { k: 'seo_issues', ar: 'مشاكل SEO', en: 'SEO issues', v: kpis.seoIssues },
    ].map((x) => (
      <Card key={x.k}>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">{t(x.ar, x.en)}</div>
          <div className="text-2xl font-semibold">{x.v}</div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const StatusBreakdownWidget: React.FC<{
  kpis: CatalogGovernanceKPIs; t: T;
}> = ({ kpis, t }) => (
  <Card data-testid="widget-status-breakdown">
    <CardHeader><CardTitle>{t('الحالة (خدمات)', 'Services by status')}</CardTitle></CardHeader>
    <CardContent>
      <ul className="space-y-2 text-sm">
        {CATALOG_LIFECYCLE_STAGES.map((s: CatalogLifecycleStage) => (
          <li key={s} className="flex items-center justify-between">
            <span className="capitalize">{s}</span>
            <Badge variant="secondary">{kpis.byStage[s] ?? 0}</Badge>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export const ProductsByStatusWidget: React.FC<{ t: T }> = ({ t }) => (
  <Card data-testid="widget-products-by-status">
    <CardHeader><CardTitle>{t('الحالة (منتجات)', 'Products by status')}</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        {t(
          'لم يتم تفعيل سجل المنتجات بعد — يظهر هنا عند إطلاق كتالوج المنتجات.',
          'Products catalog not yet enabled — surfaces here once a products table is introduced.',
        )}
      </p>
    </CardContent>
  </Card>
);

export const MissingDataWidget: React.FC<{
  kpis: CatalogGovernanceKPIs; t: T;
}> = ({ kpis, t }) => (
  <Card data-testid="widget-missing-data">
    <CardHeader><CardTitle>{t('بيانات ناقصة', 'Missing data')}</CardTitle></CardHeader>
    <CardContent>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span>{t('بدون علامة تجارية', 'Missing brand')}</span>
          <Badge variant="outline">{kpis.missingBrand}</Badge>
        </li>
        <li className="flex items-center justify-between">
          <span>{t('بدون تصنيف', 'Missing category')}</span>
          <Badge variant="outline">{kpis.missingCategory}</Badge>
        </li>
        <li className="flex items-center justify-between">
          <span>{t('قراءة منخفضة', 'Low readiness')}</span>
          <Badge variant="outline">{kpis.lowReadiness}</Badge>
        </li>
      </ul>
    </CardContent>
  </Card>
);

export const TopReadyWidget: React.FC<{
  insights: CatalogServiceInsight[]; t: T; onOpen?: (id: string) => void;
}> = ({ insights, t, onOpen }) => {
  const top = [...insights]
    .filter((i) => i.stage !== 'published')
    .sort((a, b) => b.readiness.score - a.readiness.score)
    .slice(0, 8);
  return (
    <Card data-testid="widget-top-ready">
      <CardHeader><CardTitle>{t('الأقرب للنشر', 'Closest to publish')}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('لا توجد بيانات بعد.', 'No data yet.')}</p>
        ) : top.map((i) => (
          <div
            key={i.row.id}
            className="flex items-center justify-between gap-2 border rounded-md p-2"
            data-testid="catalog-insight-card"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{i.row.name_ar || i.row.name_en || '—'}</div>
              <div className="text-xs text-muted-foreground">
                {t('جاهزية', 'Readiness')}: {i.readiness.score} · {t('جودة', 'Quality')}: {i.quality.score}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpen?.(i.row.id)}>
              {t('عرض', 'Open')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};