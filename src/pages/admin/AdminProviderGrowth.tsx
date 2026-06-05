/**
 * PROVIDER-GROWTH-ENGINE-2 — Admin dashboard at /admin/provider-growth.
 * All data flows through the providerGrowthQueries service wrapper.
 */
import React, { useMemo, useState } from 'react';
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
  loadProviderGrowthBusinesses,
  loadProviderGrowthPipeline,
  computeGrowthKPIs,
  buildProviderInsight,
} from '@/modules/providers/services/providerGrowthQueries';
import {
  KpiSummary,
  PipelineFunnelWidget,
  ReadinessDistribution,
  QualityDistribution,
  MissingDataWidget,
  TopPriorityWidget,
} from '@/components/admin/provider-growth/GrowthDashboardWidgets';
import { ProviderInsightDrawer } from '@/components/admin/provider-growth/ProviderInsightDrawer';
import { emitProviderGrowthEvent } from '@/modules/providers/growthEvents';

const PAGE_KEY = 'admin.provider-growth';

const AdminProviderGrowth: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const businessesQ = useQuery({
    queryKey: ['admin', 'provider-growth', 'businesses'],
    queryFn: () => loadProviderGrowthBusinesses({ limit: 500 }),
    staleTime: 60_000,
  });
  const pipelineQ = useQuery({
    queryKey: ['admin', 'provider-growth', 'pipeline'],
    queryFn: () => loadProviderGrowthPipeline(),
    staleTime: 60_000,
  });

  const rows = businessesQ.data?.rows ?? [];
  const kpis = useMemo(() => computeGrowthKPIs(rows), [rows]);
  const insights = useMemo(() => rows.map((r) => buildProviderInsight(r)), [rows]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedInsight = useMemo(
    () => insights.find((i) => i.business.id === selectedId) ?? null,
    [insights, selectedId],
  );
  const openInsight = (id: string) => {
    setSelectedId(id);
    const ins = insights.find((i) => i.business.id === id);
    if (ins) {
      emitProviderGrowthEvent('provider_review_requested', {
        business_ref: ins.business.ref_id,
        stage: ins.stage,
        source: ins.source,
        readiness_score: ins.readiness.score,
        quality_score: ins.quality.score,
      });
    }
  };
  const byStage = pipelineQ.data?.byStage ?? {
    discovered: 0, imported: 0, enriched: 0, review_pending: 0,
    verified: 0, published: 0, rejected: 0, archived: 0,
  };
  const loading = businessesQ.isLoading || pipelineQ.isLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('نمو المزودين', 'Provider growth')}</h1>
            <p className="text-sm text-muted-foreground">
              {t(
                'لوحة نمو المزودين: مسار المراجعة، توزيع الجودة والجاهزية، وأولويات النشر.',
                'Provider growth dashboard: pipeline, readiness & quality distributions, publish priorities.',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpLauncher pageKey="admin.provider-growth" />
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/admin/provider-growth/queue">{t('فتح قائمة العمليات', 'Open ops queue')}</Link>
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            <KpiSummary kpis={kpis} />
            <div className="grid lg:grid-cols-2 gap-4">
              <PipelineFunnelWidget byStage={byStage} />
              <TopPriorityWidget rows={rows} onSelect={openInsight} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <ReadinessDistribution insights={insights} />
              <QualityDistribution insights={insights} />
            </div>
            <MissingDataWidget rows={rows} />
            <ProviderInsightDrawer
              insight={selectedInsight}
              open={selectedId !== null}
              onOpenChange={(o) => { if (!o) setSelectedId(null); }}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminProviderGrowth;