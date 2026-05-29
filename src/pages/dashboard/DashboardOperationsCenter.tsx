/**
 * BUSINESS-OPERATIONS-INTELLIGENCE-1 — Executive Operations Center.
 *
 * Pure presentational page composed of existing analytics helpers and
 * loaders. No direct supabase.from in this file — data comes through
 * canonical module services (work orders, RFQs).
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiStrip } from '@/components/dashboard/KpiCard';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { listWorkOrdersForBusiness } from '@/modules/workOrders/services/listWorkOrdersForBusiness';
import { listRfqs } from '@/modules/procurement/services/rfqs';
import { computeProductionMetrics } from '@/modules/analytics';
import {
  computeWorkOrderDiagnostics,
  computeProcurementDiagnostics,
} from '@/modules/analytics/diagnostics';
import { useNoIndex } from '@/hooks/useNoIndex';

const OperationsCenter = () => {
  useNoIndex();
  const { user } = useAuth();
  const { activeBusinessId } = useActiveBusiness([]);
  const businessId = activeBusinessId ?? user?.id ?? '';
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [wo, rf] = await Promise.all([
        listWorkOrdersForBusiness({ businessId, limit: 200 }),
        listRfqs({ businessId, limit: 200 }),
      ]);
      if (cancelled) return;
      setWorkOrders(wo.data ?? []);
      setRfqs(rf.data ?? []);
      setLoading(false);
    })().catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [businessId]);

  const production = useMemo(
    () => computeProductionMetrics(
      workOrders.map((w) => ({
        id: w.id,
        status: w.status,
        pipeline_stage: w.current_stage_key ?? 'unknown',
        created_at: w.created_at,
        due_at: w.due_at ?? null,
        completed_at: w.completed_at ?? null,
      })),
    ),
    [workOrders],
  );

  const woDiag = useMemo(
    () => computeWorkOrderDiagnostics(
      workOrders.map((w) => ({
        id: w.id,
        status: w.status,
        owner_user_id: w.owner_user_id ?? null,
        due_at: w.due_at ?? null,
      })),
    ),
    [workOrders],
  );

  const procDiag = useMemo(
    () => computeProcurementDiagnostics(
      rfqs.map((r) => ({
        rfq_id: r.id,
        status: r.status,
        awarded_quote_id: r.awarded_quote_id ?? null,
        supplier_quote_count: 0,
        po_count: 0,
      })),
    ),
    [rfqs],
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" data-testid="operations-center">
      <header>
        <h1 className="text-2xl font-bold">Operations Center · مركز العمليات</h1>
        <p className="text-sm text-muted-foreground">
          Executive view of contracts, production, and procurement health.
        </p>
      </header>

      <Card data-testid="production-section">
        <CardHeader><CardTitle>Production · الإنتاج</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Total work orders', value: production.totalCount, tone: 'neutral' },
              { label: 'Completed', value: production.completedCount, tone: 'success' },
              { label: 'Overdue', value: production.overdueCount, tone: production.overdueCount ? 'danger' : 'neutral' },
              { label: 'Bottleneck', value: production.bottleneckStage ?? '—', tone: 'info' },
            ]}
          />
        </CardContent>
      </Card>

      <Card data-testid="executive-alerts-section">
        <CardHeader><CardTitle>Executive alerts · التنبيهات التنفيذية</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Unassigned', value: woDiag.missingAssignee, tone: woDiag.missingAssignee ? 'warning' : 'neutral' },
              { label: 'Missing due date', value: woDiag.missingDueDate, tone: woDiag.missingDueDate ? 'warning' : 'neutral' },
              { label: 'Overdue WOs', value: woDiag.overdue, tone: woDiag.overdue ? 'danger' : 'neutral' },
              { label: 'RFQ no quotes', value: procDiag.rfqWithoutSupplierQuote, tone: procDiag.rfqWithoutSupplierQuote ? 'warning' : 'neutral' },
              { label: 'Awarded no PO', value: procDiag.awardedWithoutPo, tone: procDiag.awardedWithoutPo ? 'warning' : 'neutral' },
            ]}
          />
        </CardContent>
      </Card>

      <Card data-testid="procurement-section">
        <CardHeader><CardTitle>Procurement · المشتريات</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Open RFQs', value: rfqs.filter((r) => r.status === 'sent' || r.status === 'draft').length, tone: 'info' },
              { label: 'Awarded', value: rfqs.filter((r) => r.awarded_quote_id || r.status === 'awarded').length, tone: 'success' },
            ]}
          />
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
};

export default OperationsCenter;