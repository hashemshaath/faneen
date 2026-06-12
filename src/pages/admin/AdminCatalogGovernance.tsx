/**
 * PSG-1 — Catalog Governance admin dashboard.
 * /admin/catalog-governance
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import {
  loadCatalogServices,
  loadServiceBrandCounts,
  countDuplicateNames,
  buildServiceInsight,
  computeCatalogKPIs,
} from '@/modules/catalog/services/catalogGovernanceQueries';
import {
  KpiSummary,
  StatusBreakdownWidget,
  ProductsByStatusWidget,
  MissingDataWidget,
  TopReadyWidget,
} from '@/components/admin/catalog-governance/CatalogGovernanceWidgets';
import { emitCatalogGovernanceEvent } from '@/modules/catalog/governanceEvents';

const PAGE_KEY = 'admin.catalog-governance';

const AdminCatalogGovernance: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const servicesQ = useQuery({
    queryKey: ['admin', 'catalog-governance', 'services'],
    queryFn: () => loadCatalogServices({ limit: 500 }),
    staleTime: 60_000,
  });
  const rows = servicesQ.data?.rows ?? [];
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const brandsQ = useQuery({
    queryKey: ['admin', 'catalog-governance', 'brand-counts', ids.length],
    queryFn: () => loadServiceBrandCounts(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  const insights = useMemo(() => {
    const dup = countDuplicateNames(rows);
    const brandCounts = brandsQ.data?.counts ?? new Map<string, number>();
    return rows.map((r) => buildServiceInsight(r, brandCounts.get(r.id) ?? 0, dup.get(r.id) ?? 0));
  }, [rows, brandsQ.data]);

  const kpis = useMemo(() => computeCatalogKPIs(insights), [insights]);

  const handleOpen = (id: string) => {
    const ins = insights.find((i) => i.row.id === id);
    if (!ins) return;
    emitCatalogGovernanceEvent('service_review_requested', {
      entity: 'service',
      entity_ref: ins.row.id,
      stage: ins.stage,
      readiness_score: ins.readiness.score,
      quality_score: ins.quality.score,
    });
  };

  const loading = servicesQ.isLoading || brandsQ.isLoading;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{t('حوكمة الكتالوج', 'Catalog Governance')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('لوحة لإدارة جودة وجاهزية المنتجات والخدمات.', 'Manage quality and readiness for products and services.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpLauncher pageKey={PAGE_KEY} />
            <Button asChild variant="outline">
              <Link to="/admin/catalog-governance/queue">{t('قائمة العمليات', 'Operations queue')}</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <KpiSummary kpis={kpis} t={t} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatusBreakdownWidget kpis={kpis} t={t} />
              <ProductsByStatusWidget t={t} />
              <MissingDataWidget kpis={kpis} t={t} />
              <TopReadyWidget insights={insights} t={t} onOpen={handleOpen} />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminCatalogGovernance;