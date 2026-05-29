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
import {
  computeInstallationMetrics,
  listInstallationAppointmentsForBusiness,
  type InstallationAppointmentRow,
} from '@/modules/installationAppointments';
import {
  computeClosureMetrics,
  computeNpsScore,
  listProjectClosuresForBusiness,
  listCustomerFeedbackForBusiness,
  listCustomerNpsForBusiness,
  listWarrantiesForBusiness,
  type ProjectClosureRow,
  type CustomerFeedbackRow,
  type CustomerNpsResponseRow,
  type WorkOrderWarrantyRow,
} from '@/modules/projectClosure';
import { useNoIndex } from '@/hooks/useNoIndex';

const OperationsCenter = () => {
  useNoIndex();
  const { user } = useAuth();
  const { activeBusinessId } = useActiveBusiness([]);
  const businessId = activeBusinessId ?? user?.id ?? '';
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<InstallationAppointmentRow[]>([]);
  const [closures, setClosures] = useState<ProjectClosureRow[]>([]);
  const [feedback, setFeedback] = useState<CustomerFeedbackRow[]>([]);
  const [npsRows, setNpsRows] = useState<CustomerNpsResponseRow[]>([]);
  const [warranties, setWarranties] = useState<WorkOrderWarrantyRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [wo, rf, ap, cl, fb, np, wr] = await Promise.all([
        listWorkOrdersForBusiness({ businessId, limit: 200 }),
        listRfqs({ businessId, limit: 200 }),
        listInstallationAppointmentsForBusiness({ businessId, limit: 200 }),
        listProjectClosuresForBusiness(businessId, 200),
        listCustomerFeedbackForBusiness(businessId, 200),
        listCustomerNpsForBusiness(businessId, 200),
        listWarrantiesForBusiness(businessId, 200),
      ]);
      if (cancelled) return;
      setWorkOrders(wo.data ?? []);
      setRfqs(rf.data ?? []);
      setAppointments(ap.data ?? []);
      setClosures(cl.data ?? []);
      setFeedback(fb.data ?? []);
      setNpsRows(np.data ?? []);
      setWarranties(wr.data ?? []);
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

  const installation = useMemo(
    () => computeInstallationMetrics(appointments),
    [appointments],
  );

  const closure = useMemo(
    () => computeClosureMetrics({ closures, feedback, nps: npsRows, warranties }),
    [closures, feedback, npsRows, warranties],
  );

  const nps = useMemo(() => computeNpsScore(npsRows), [npsRows]);

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

      <Card data-testid="installations-section">
        <CardHeader><CardTitle>Installations · التركيبات</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Scheduled', value: installation.scheduled, tone: 'info' },
              { label: 'Awaiting confirmation', value: installation.awaitingConfirmation, tone: installation.awaitingConfirmation ? 'warning' : 'neutral' },
              { label: 'Reschedule requests', value: installation.rescheduleRequests, tone: installation.rescheduleRequests ? 'warning' : 'neutral' },
              { label: 'Completed', value: installation.completed, tone: 'success' },
            ]}
          />
        </CardContent>
      </Card>

      <Card data-testid="installation-alerts-section">
        <CardHeader><CardTitle>Installation alerts · تنبيهات التركيب</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Within 24h unconfirmed', value: installation.alertWithin24hUnconfirmed, tone: installation.alertWithin24hUnconfirmed ? 'danger' : 'neutral' },
              { label: 'Overdue', value: installation.alertOverdue, tone: installation.alertOverdue ? 'danger' : 'neutral' },
              { label: 'Reschedule awaiting action', value: installation.alertRescheduleAwaitingAction, tone: installation.alertRescheduleAwaitingAction ? 'warning' : 'neutral' },
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

      <Card data-testid="closures-section">
        <CardHeader><CardTitle>Project closure · إنهاء المشاريع</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Pending confirmation', value: closure.pendingConfirmation, tone: closure.pendingConfirmation ? 'warning' : 'neutral' },
              { label: 'Issues reported', value: closure.issuesReported, tone: closure.issuesReported ? 'danger' : 'neutral' },
              { label: 'Feedback received', value: closure.feedbackReceived, tone: 'info' },
              { label: 'Average rating', value: closure.averageRating, tone: 'info' },
              { label: 'Active warranties', value: closure.activeWarranties, tone: 'success' },
              { label: 'Expired warranties', value: closure.expiredWarranties, tone: 'neutral' },
              { label: 'NPS score', value: nps.score, tone: 'info' },
            ]}
          />
        </CardContent>
      </Card>

      <Card data-testid="closures-alerts-section">
        <CardHeader><CardTitle>Closure alerts · تنبيهات الإنهاء</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Unconfirmed > 7d', value: closure.alertNotConfirmed7d, tone: closure.alertNotConfirmed7d ? 'danger' : 'neutral' },
              { label: 'Low ratings (≤2)', value: closure.alertLowRating, tone: closure.alertLowRating ? 'warning' : 'neutral' },
              { label: 'NPS detractors', value: closure.alertNpsDetractors, tone: closure.alertNpsDetractors ? 'warning' : 'neutral' },
              { label: 'Warranty expiring 30d', value: closure.alertWarrantyExpiringSoon, tone: closure.alertWarrantyExpiringSoon ? 'warning' : 'neutral' },
            ]}
          />
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
};

export default OperationsCenter;