/**
 * PSG-1 — Catalog Governance operations queue.
 * /admin/catalog-governance/queue
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import {
  loadCatalogServices,
  loadServiceBrandCounts,
  countDuplicateNames,
  buildServiceInsight,
  filterCatalogInsights,
  CATALOG_QUEUE_FILTERS,
  type CatalogQueueFilter,
} from '@/modules/catalog/services/catalogGovernanceQueries';
import { emitCatalogGovernanceEvent } from '@/modules/catalog/governanceEvents';

const PAGE_KEY = 'admin.catalog-governance-queue';

const FILTER_LABEL: Record<CatalogQueueFilter, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  review: { ar: 'قيد المراجعة', en: 'In review' },
  approved: { ar: 'معتمد', en: 'Approved' },
  published: { ar: 'منشور', en: 'Published' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
  missing_brand: { ar: 'بدون علامة تجارية', en: 'Missing brand' },
  missing_category: { ar: 'بدون تصنيف', en: 'Missing category' },
  low_readiness: { ar: 'قراءة منخفضة', en: 'Low readiness' },
  low_quality: { ar: 'جودة منخفضة', en: 'Low quality' },
  seo_issues: { ar: 'مشاكل SEO', en: 'SEO issues' },
};

const AdminCatalogGovernanceQueue: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const [filter, setFilter] = useState<CatalogQueueFilter>('review');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const servicesQ = useQuery({
    queryKey: ['admin', 'catalog-governance-queue', 'services'],
    queryFn: () => loadCatalogServices({ limit: 1000 }),
    staleTime: 60_000,
  });
  const rows = servicesQ.data?.rows ?? [];
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const brandsQ = useQuery({
    queryKey: ['admin', 'catalog-governance-queue', 'brand-counts', ids.length],
    queryFn: () => loadServiceBrandCounts(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  const insights = useMemo(() => {
    const dup = countDuplicateNames(rows);
    const brandCounts = brandsQ.data?.counts ?? new Map<string, number>();
    return rows.map((r) => buildServiceInsight(r, brandCounts.get(r.id) ?? 0, dup.get(r.id) ?? 0));
  }, [rows, brandsQ.data]);

  const filtered = useMemo(() => filterCatalogInsights(insights, filter), [insights, filter]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const bulk = (event: 'assign' | 'enrichment' | 'revision') => {
    for (const id of selected) {
      const ins = insights.find((i) => i.row.id === id);
      if (!ins) continue;
      const e = event === 'assign'
        ? 'service_review_requested'
        : event === 'enrichment'
          ? 'service_review_requested'
          : 'service_review_requested';
      emitCatalogGovernanceEvent(e, {
        entity: 'service',
        entity_ref: ins.row.id,
        stage: ins.stage,
        readiness_score: ins.readiness.score,
        quality_score: ins.quality.score,
      });
    }
    setSelected(new Set());
  };

  const loading = servicesQ.isLoading || brandsQ.isLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{t('قائمة عمليات الكتالوج', 'Catalog operations queue')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('تصفية وإسناد ومراجعة عناصر الكتالوج.', 'Filter, assign and review catalog items.')}
            </p>
          </div>
          <HelpLauncher pageKey={PAGE_KEY} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {CATALOG_QUEUE_FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              data-testid={`catalog-queue-filter-${f}`}
            >
              {t(FILTER_LABEL[f].ar, FILTER_LABEL[f].en)}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => bulk('assign')}>
            {t('إسناد مراجع', 'Assign reviewer')}
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => bulk('enrichment')}>
            {t('طلب إثراء', 'Request enrichment')}
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => bulk('revision')}>
            {t('طلب مراجعة', 'Request revision')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('لا توجد عناصر بهذا التصفية.', 'No items match this filter.')}</p>
            ) : (
              filtered.map((i) => (
                <div
                  key={i.row.id}
                  className="flex items-center justify-between gap-3 border rounded-md p-3"
                  data-testid="catalog-queue-row"
                >
                  <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(i.row.id)}
                      onChange={() => toggle(i.row.id)}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {i.row.name_ar || i.row.name_en || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('المرحلة', 'Stage')}: {i.stage} · {t('جاهزية', 'Readiness')}: {i.readiness.score} · {t('جودة', 'Quality')}: {i.quality.score}
                      </div>
                    </div>
                  </label>
                  <div className="flex items-center gap-2">
                    {!i.hasBrand && <Badge variant="outline">{t('بدون علامة', 'No brand')}</Badge>}
                    {!i.hasCategory && <Badge variant="outline">{t('بدون تصنيف', 'No category')}</Badge>}
                    {i.duplicateNameCount > 0 && <Badge variant="outline">{t('مكرر', 'Duplicate')}</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminCatalogGovernanceQueue;