/**
 * PROVIDER-GROWTH-ENGINE-2 — Admin dashboard at /admin/provider-growth.
 * All data flows through the providerGrowthQueries service wrapper.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminListPageTemplate } from '@/components/admin/AdminListPageTemplate';
import { useBi } from '@/components/common/Bilingual';
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
  const bi = useBi();
  useNoIndex();

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
    <DashboardLayout>
      <AdminListPageTemplate
        tone="success"
        icon={TrendingUp}
        eyebrow={bi('لوحة الإدارة', 'Admin Console')}
        title={bi('نمو المزودين', 'Provider growth')}
        subtitle={bi(
          'لوحة نمو المزودين: مسار المراجعة، توزيع الجودة والجاهزية، وأولويات النشر.',
          'Provider growth dashboard: pipeline, readiness & quality distributions, publish priorities.',
        )}
        actions={
          <div className="flex items-center gap-2">
            <HelpLauncher pageKey="admin.provider-growth" />
            <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
              <Link to="/admin/provider-growth/queue">{bi('فتح قائمة العمليات', 'Open ops queue')}</Link>
            </Button>
          </div>
        }
        kpiSlot={!loading ? <KpiSummary kpis={kpis} /> : undefined}
      >
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
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
      </AdminListPageTemplate>
    </DashboardLayout>
  );
};

export default AdminProviderGrowth;