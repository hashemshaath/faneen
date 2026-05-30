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
import {
  computeProductionMetrics,
  computeRevenuePipeline,
  computeCycleTimes,
} from '@/modules/analytics';
import { listContractsForRole, type ContractRow } from '@/modules/contracts/services/list';
import {
  runDataIntegrityChecks,
  INTEGRITY_LABELS,
  type IntegrityKey,
} from '@/modules/health/dataIntegrity';
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
import { Button } from '@/components/ui/button';
import {
  computeSystemHealthSnapshot,
  computeDataIntegrityMetrics,
  computeOperationsMetrics,
  summarizeIntegrityReport,
  listObservabilityLogs,
  runObservabilityCheck,
  type ObservabilityLogRow,
} from '@/modules/observability';

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
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [obsLogs, setObsLogs] = useState<ObservabilityLogRow[]>([]);
  const [runningCheck, setRunningCheck] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const refreshObsLogs = async () => {
    const { data } = await listObservabilityLogs({ limit: 10 });
    setObsLogs(data);
  };

  useEffect(() => { refreshObsLogs().catch(() => undefined); }, []);

  const handleRunCheck = async () => {
    setRunningCheck(true);
    setRunError(null);
    try {
      const { error } = await runObservabilityCheck({ runType: 'manual_check' });
      if (error) {
        setRunError(error.message || 'Failed to run observability check.');
      } else {
        await refreshObsLogs();
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Failed to run observability check.');
    } finally {
      setRunningCheck(false);
    }
  };

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
      let ctr: ContractRow[] = [];
      try {
        ctr = await listContractsForRole({ userId: businessId, role: 'provider' });
      } catch {
        ctr = [];
      }
      if (cancelled) return;
      setWorkOrders(wo.data ?? []);
      setRfqs(rf.data ?? []);
      setAppointments(ap.data ?? []);
      setClosures(cl.data ?? []);
      setFeedback(fb.data ?? []);
      setNpsRows(np.data ?? []);
      setWarranties(wr.data ?? []);
      setContracts(ctr);
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

  const revenue = useMemo(
    () => computeRevenuePipeline({
      contracts: contracts.map((c) => ({ id: c.id, status: c.status })),
      quotations: [],
    }),
    [contracts],
  );

  const cycles = useMemo(
    () => computeCycleTimes({
      contracts: contracts.map((c) => ({
        id: c.id,
        status: c.status,
        created_at: c.created_at,
        start_date: c.start_date ?? null,
        activated_at: (c as unknown as { activated_at?: string | null }).activated_at ?? null,
      })),
      quotations: [],
      workOrders: workOrders.map((w) => ({
        id: w.id,
        status: w.status,
        created_at: w.created_at,
        completed_at: w.completed_at ?? null,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        status: a.status,
        scheduled_at: a.scheduled_date ?? null,
        confirmed_at: a.confirmed_at ?? null,
      })),
    }),
    [contracts, workOrders, appointments],
  );

  const integrity = useMemo(() => {
    const report = runDataIntegrityChecks({
      contracts: contracts.map((c) => ({ id: c.id, ref_id: c.contract_number ?? null, status: c.status })),
      workOrders: workOrders.map((w) => ({
        id: w.id,
        ref_id: w.ref_id ?? null,
        contract_id: w.contract_id ?? null,
        due_at: w.due_at ?? null,
        pipeline_stage: w.current_stage_key ?? null,
        status: w.status,
      })),
      quotations: [],
      closures: closures.map((c) => ({
        id: c.id,
        ref_id: c.ref_id ?? null,
        work_order_id: c.work_order_id,
        status: c.closure_status,
      })),
      warranties: warranties.map((w) => ({
        id: w.id,
        ref_id: w.ref_id ?? null,
        work_order_id: w.work_order_id,
        status: w.status,
        expires_at: w.end_date ?? null,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        ref_id: a.ref_id ?? null,
        work_order_id: a.work_order_id ?? null,
        status: a.status,
      })),
      rfqs: [],
      rfqSuppliers: [],
      rfqQuotes: [],
      purchaseOrders: [],
      trackingLinks: [],
    });
    // Only surface checks we can reliably compute with loaded data.
    const reliable: IntegrityKey[] = [
      'contracts_without_work_orders',
      'completed_work_orders_without_closure',
      'closures_without_warranty',
      'work_orders_without_due_date',
      'installation_without_confirmation',
      'expired_warranties',
    ];
    return reliable.map((k) => ({ key: k, count: report.findings[k].length, tone: report.summary.find((s) => s.key === k)?.tone ?? 'slate' }));
  }, [contracts, workOrders, closures, warranties, appointments]);

  const healthSnapshot = useMemo(() => {
    const integrity = computeDataIntegrityMetrics(
      summarizeIntegrityReport(
        integrityRows().map((i) => ({
          key: i.key as never,
          label_ar: '',
          label_en: '',
          count: i.count,
          tone: (i.tone as 'red' | 'amber' | 'slate'),
        })),
      ),
    );
    const operations = computeOperationsMetrics({
      overdueWorkOrders: production.overdueCount,
      pendingCustomerConfirmations: closure.pendingConfirmation,
      awardedRfqsWithoutPo: procDiag.awardedWithoutPo,
    });
    return computeSystemHealthSnapshot({ integrity, operations });
    // integrityRows recomputed inline; deps drive recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrity, production.overdueCount, closure.pendingConfirmation, procDiag.awardedWithoutPo]);

  function integrityRows() { return integrity; }

  const lastRun = obsLogs[0] ?? null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" data-testid="operations-center">
      <header>
        <h1 className="text-2xl font-bold">Operations Center · مركز العمليات</h1>
        <p className="text-sm text-muted-foreground">
          Executive view of contracts, production, and procurement health.
        </p>
      </header>

      <Card data-testid="system-health-section">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>System health · صحة النظام</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunCheck}
            disabled={runningCheck}
            data-testid="run-observability-check"
          >
            {runningCheck ? 'Running…' : 'Run check now · تشغيل فحص الآن'}
          </Button>
        </CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              {
                label: 'Score',
                value: healthSnapshot.score,
                tone: healthSnapshot.status === 'critical' ? 'danger' : healthSnapshot.status === 'warning' ? 'warning' : 'success',
              },
              {
                label: 'Status',
                value: healthSnapshot.status,
                tone: healthSnapshot.status === 'critical' ? 'danger' : healthSnapshot.status === 'warning' ? 'warning' : 'success',
              },
              {
                label: 'Last run',
                value: lastRun ? new Date(lastRun.created_at).toLocaleString() : '—',
                tone: 'info',
              },
              {
                label: 'Alerts (last run)',
                value: lastRun ? (Array.isArray(lastRun.alerts) ? lastRun.alerts.length : 0) : 0,
                tone: lastRun && Array.isArray(lastRun.alerts) && lastRun.alerts.length > 0 ? 'warning' : 'neutral',
              },
            ]}
          />
          {runError && (
            <p className="mt-2 text-xs text-destructive" role="alert">{runError}</p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Read-only check. Runs the admin-gated observability RPC and appends to the history below.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="observability-history-section">
        <CardHeader><CardTitle>Observability history · سجل المراقبة</CardTitle></CardHeader>
        <CardContent>
          {obsLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No observability runs yet. Use “Run check now” above to create the first entry.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-xs text-muted-foreground">
                    <th className="py-2 pe-3 text-start">Ref</th>
                    <th className="py-2 pe-3 text-start">Run type</th>
                    <th className="py-2 pe-3 text-start">Status</th>
                    <th className="py-2 pe-3 text-start">Score</th>
                    <th className="py-2 pe-3 text-start">Alerts</th>
                    <th className="py-2 pe-3 text-start">When</th>
                  </tr>
                </thead>
                <tbody>
                  {obsLogs.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="py-2 pe-3 font-mono text-xs">{row.ref_id ?? '—'}</td>
                      <td className="py-2 pe-3">{row.run_type}</td>
                      <td className="py-2 pe-3">{row.status}</td>
                      <td className="py-2 pe-3">{row.score}</td>
                      <td className="py-2 pe-3">{Array.isArray(row.alerts) ? row.alerts.length : 0}</td>
                      <td className="py-2 pe-3 text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="revenue-pipeline-section">
        <CardHeader><CardTitle>Revenue pipeline · مسار الإيراد</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Open quotations', value: revenue.openQuotations, tone: 'info' },
              { label: 'Approved quotations', value: revenue.approvedQuotations, tone: 'success' },
              { label: 'Draft contracts', value: revenue.draftContracts, tone: 'warning' },
              { label: 'Active contracts', value: revenue.activeContracts, tone: 'success' },
            ]}
          />
        </CardContent>
      </Card>

      <Card data-testid="cycle-times-section">
        <CardHeader><CardTitle>Cycle times (days) · أزمنة الدورة</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={[
              { label: 'Quotation approval', value: cycles.avgQuotationApprovalDays, tone: 'info' },
              { label: 'Contract conversion', value: cycles.avgContractConversionDays, tone: 'info' },
              { label: 'Work order completion', value: cycles.avgWorkOrderCompletionDays, tone: 'info' },
              { label: 'Installation confirmation', value: cycles.avgInstallationConfirmationDays, tone: 'info' },
            ]}
          />
        </CardContent>
      </Card>

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

      <Card data-testid="data-integrity-section">
        <CardHeader><CardTitle>Data integrity · سلامة البيانات</CardTitle></CardHeader>
        <CardContent>
          <KpiStrip
            items={integrity.map((i) => ({
              label: INTEGRITY_LABELS[i.key].en,
              value: i.count,
              tone: i.count === 0 ? 'success' : i.tone === 'red' ? 'danger' : i.tone === 'amber' ? 'warning' : 'info',
            }))}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Read-only diagnostics. Findings are derived from loaded data only.
          </p>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
};

export default OperationsCenter;