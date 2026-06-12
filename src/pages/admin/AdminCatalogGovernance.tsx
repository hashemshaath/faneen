/**
 * PSG-1 — Catalog Governance admin dashboard.
 * /admin/catalog-governance
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminListPageTemplate } from '@/components/admin/AdminListPageTemplate';
import { useBi } from '@/components/common/Bilingual';
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
  const bi = useBi();
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
    <DashboardLayout>
      <AdminListPageTemplate
        tone="info"
        icon={BookOpen}
        eyebrow={bi('لوحة الإدارة', 'Admin Console')}
        title={bi('حوكمة الكتالوج', 'Catalog Governance')}
        subtitle={bi(
          'لوحة لإدارة جودة وجاهزية المنتجات والخدمات.',
          'Manage quality and readiness for products and services.',
        )}
        actions={
          <div className="flex items-center gap-2">
            <HelpLauncher pageKey={PAGE_KEY} />
            <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
              <Link to="/admin/catalog-governance/queue">{bi('قائمة العمليات', 'Operations queue')}</Link>
            </Button>
          </div>
        }
        kpiSlot={!loading ? <KpiSummary kpis={kpis} t={t} /> : undefined}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusBreakdownWidget kpis={kpis} t={t} />
            <ProductsByStatusWidget t={t} />
            <MissingDataWidget kpis={kpis} t={t} />
            <TopReadyWidget insights={insights} t={t} onOpen={handleOpen} />
          </div>
        )}
      </AdminListPageTemplate>
    </DashboardLayout>
  );
};

export default AdminCatalogGovernance;