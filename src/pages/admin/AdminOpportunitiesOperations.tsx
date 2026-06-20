import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Gavel,
  Inbox,
  Users,
  Download,
  Timer,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  getOpportunityFunnel,
  getOpportunityKpis,
  listOpportunityOpsRows,
  type OpportunityOpsFlag,
  type OpportunityOpsRow,
  computeOpportunitySla,
  aggregateOpportunitySla,
  buildOpportunityReportCsv,
  buildOpportunityReportFilename,
  OPPORTUNITY_EXPORT_LIMIT,
  SLA_THRESHOLDS_HOURS,
  type SlaStatus,
} from '@/modules/opportunities/analytics';

const FLAG_LABEL: Record<OpportunityOpsFlag, { ar: string; tone: string }> = {
  needs_matching: { ar: 'تحتاج مطابقة', tone: 'bg-amber-100 text-amber-800' },
  awaiting_bids: { ar: 'بانتظار عروض', tone: 'bg-blue-100 text-blue-800' },
  awaiting_award: { ar: 'بانتظار تعميد', tone: 'bg-violet-100 text-violet-800' },
  awaiting_contract: { ar: 'بانتظار عقد', tone: 'bg-orange-100 text-orange-800' },
  operationally_complete: { ar: 'مكتملة تشغيليًا', tone: 'bg-emerald-100 text-emerald-800' },
  cancelled: { ar: 'ملغاة', tone: 'bg-slate-100 text-slate-700' },
};

const SLA_LABEL: Record<SlaStatus, { ar: string; tone: string }> = {
  on_time: { ar: 'ضمن الوقت', tone: 'bg-emerald-100 text-emerald-800' },
  at_risk: { ar: 'قريب من التأخير', tone: 'bg-amber-100 text-amber-800' },
  breached: { ar: 'متأخر', tone: 'bg-rose-100 text-rose-800' },
  completed: { ar: 'مكتمل', tone: 'bg-slate-100 text-slate-700' },
};

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: number | string }> = ({ icon, label, value }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold tech-content mt-2">{value}</div>
    </CardContent>
  </Card>
);

const AdminOpportunitiesOperations: React.FC = () => {
  useNoIndex();

  const kpis = useQuery({ queryKey: ['admin-opps-kpis'], queryFn: getOpportunityKpis });
  const funnel = useQuery({ queryKey: ['admin-opps-funnel'], queryFn: getOpportunityFunnel });
  const rows = useQuery({
    queryKey: ['admin-opps-rows', 50],
    queryFn: () => listOpportunityOpsRows(50),
  });

  const anyError = kpis.error || funnel.error || rows.error;

  const alertCounts: Record<OpportunityOpsFlag, number> = {
    needs_matching: 0,
    awaiting_bids: 0,
    awaiting_award: 0,
    awaiting_contract: 0,
    operationally_complete: 0,
    cancelled: 0,
  };
  for (const r of rows.data ?? []) {
    alertCounts[r.flag] = (alertCounts[r.flag] ?? 0) + 1;
  }
  const ALERT_FLAGS: OpportunityOpsFlag[] = [
    'needs_matching',
    'awaiting_bids',
    'awaiting_award',
    'awaiting_contract',
  ];
  const totalAlerts = ALERT_FLAGS.reduce((a, k) => a + alertCounts[k], 0);

  const slaAggregate = React.useMemo(
    () => aggregateOpportunitySla(rows.data ?? []),
    [rows.data],
  );

  const handleExport = React.useCallback((): void => {
    const data: OpportunityOpsRow[] = rows.data ?? [];
    if (data.length === 0) return;
    const csv = buildOpportunityReportCsv(data);
    downloadCsv(buildOpportunityReportFilename(), csv);
  }, [rows.data]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold inline-flex items-center gap-2">
              <Activity className="h-5 w-5" /> مركز عمليات الفرص
            </h1>
            <p className="text-sm text-muted-foreground">
              متابعة دورة حياة الفرصة من الاستلام حتى العقد المبدئي.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={!rows.data || rows.data.length === 0}
            aria-label="تصدير التقرير"
          >
            <Download className="h-4 w-4 ms-1" /> تصدير التقرير (CSV)
          </Button>
        </header>
        <p className="text-xs text-muted-foreground">
          سقف التصدير: {OPPORTUNITY_EXPORT_LIMIT} صف كحد أقصى لكل تقرير.
        </p>

        {anyError ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> تعذر تحميل بيانات لوحة العمليات.
            </CardContent>
          </Card>
        ) : null}

        {/* Operational alerts */}
        <section aria-label="Operational alerts">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-base font-semibold inline-flex items-center gap-2">
                <Bell className="h-4 w-4" /> تنبيهات تشغيلية
              </div>
              {rows.isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : totalAlerts === 0 ? (
                <div className="text-sm text-muted-foreground">
                  لا توجد تنبيهات تشغيلية حالية.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ALERT_FLAGS.map((k) => {
                    const flag = FLAG_LABEL[k];
                    const n = alertCounts[k];
                    return (
                      <div
                        key={k}
                        className="rounded-lg border p-3 flex flex-col gap-2"
                      >
                        <Badge className={`text-xs w-fit ${flag.tone}`}>{flag.ar}</Badge>
                        <div className="text-2xl font-bold tech-content">{n}</div>
                        <Button asChild size="sm" variant="ghost" className="self-start px-0">
                          <Link to="/admin/opportunities/list">
                            عرض التفاصيل <ChevronRight className="h-4 w-4 ms-1" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* KPIs */}
        <section aria-label="KPIs" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.isLoading || !kpis.data ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <Kpi icon={<Inbox className="h-4 w-4" />} label="إجمالي الفرص" value={kpis.data.total} />
              <Kpi icon={<Inbox className="h-4 w-4" />} label="جديدة" value={kpis.data.newCount} />
              <Kpi icon={<ClipboardList className="h-4 w-4" />} label="تحت المراجعة" value={kpis.data.underReview} />
              <Kpi icon={<Users className="h-4 w-4" />} label="مسندة لمزودين" value={kpis.data.assigned} />
              <Kpi icon={<Gavel className="h-4 w-4" />} label="لديها عروض" value={kpis.data.withBids} />
              <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="معمّدة" value={kpis.data.awarded} />
              <Kpi icon={<FileText className="h-4 w-4" />} label="لديها عقد" value={kpis.data.withContract} />
              <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="ملغاة" value={kpis.data.cancelled} />
            </>
          )}
        </section>

        {/* Funnel */}
        <section aria-label="Funnel">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-base font-semibold inline-flex items-center gap-2">
                <Activity className="h-4 w-4" /> مسار التحويل
              </div>
              {funnel.isLoading || !funnel.data ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-md" />)}
                </div>
              ) : (
                <ol className="space-y-2">
                  {[
                    { k: 'submitted', label: 'مقدمة', value: funnel.data.submitted },
                    { k: 'matched', label: 'مطابقة', value: funnel.data.matched },
                    { k: 'assigned', label: 'مسندة', value: funnel.data.assigned },
                    { k: 'bids', label: 'بعروض', value: funnel.data.bids },
                    { k: 'awarded', label: 'معمّدة', value: funnel.data.awarded },
                    { k: 'contracts', label: 'بعقود', value: funnel.data.contracts },
                  ].map((s, i, arr) => {
                    const pct = arr[0].value > 0 ? Math.round((s.value / arr[0].value) * 100) : 0;
                    return (
                      <li key={s.k} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {i + 1}. {s.label}
                          </span>
                          <span className="tech-content text-muted-foreground">
                            {s.value} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SLA aggregate */}
        <section aria-label="SLA metrics">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-base font-semibold inline-flex items-center gap-2">
                <Timer className="h-4 w-4" /> مؤشرات SLA
              </div>
              {rows.isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">متوسط وقت أول عرض</div>
                    <div className="tech-content font-semibold">
                      {slaAggregate.avg_time_to_first_bid_h === null
                        ? '—'
                        : `${slaAggregate.avg_time_to_first_bid_h.toFixed(1)} س`}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">متوسط وقت التعميد</div>
                    <div className="tech-content font-semibold">
                      {slaAggregate.avg_time_to_award_h === null
                        ? '—'
                        : `${slaAggregate.avg_time_to_award_h.toFixed(1)} س`}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">متوسط وقت العقد بعد التعميد</div>
                    <div className="tech-content font-semibold">
                      {slaAggregate.avg_time_to_contract_after_award_h === null
                        ? '—'
                        : `${slaAggregate.avg_time_to_contract_after_award_h.toFixed(1)} س`}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">عدد الفرص المتأخرة</div>
                    <div className="tech-content font-semibold text-rose-700">
                      {slaAggregate.breached_count}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">
                      بلا إسناد &gt; {SLA_THRESHOLDS_HOURS.needs_assignment_after_hours} س
                    </div>
                    <div className="tech-content font-semibold">
                      {slaAggregate.no_assignment_after_threshold}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">
                      بلا عروض &gt; {SLA_THRESHOLDS_HOURS.awaiting_bids_after_hours} س
                    </div>
                    <div className="tech-content font-semibold">
                      {slaAggregate.no_bids_after_threshold}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">
                      معمّدة بلا عقد &gt; {SLA_THRESHOLDS_HOURS.awaiting_contract_after_hours} س
                    </div>
                    <div className="tech-content font-semibold">
                      {slaAggregate.awarded_without_contract_after_threshold}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Ops table */}
        <section aria-label="Opportunities table">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between">
                <div className="text-base font-semibold">آخر الفرص</div>
                {rows.data && (
                  <Badge variant="outline" className="tech-content">
                    {rows.data.length}
                  </Badge>
                )}
              </div>
              {rows.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
                </div>
              ) : !rows.data || rows.data.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  لا توجد فرص لعرضها بعد.
                </div>
              ) : (
                <ul className="divide-y">
                  {rows.data.map((r) => {
                    const flag = FLAG_LABEL[r.flag];
                    const sla = computeOpportunitySla(r);
                    const slaTone = SLA_LABEL[sla.status];
                    return (
                      <li key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold inline-flex items-center gap-2">
                            <span className="tech-content">{r.ref_id ?? r.id.slice(0, 8)}</span>
                            <Badge className={`text-xs ${flag.tone}`}>{flag.ar}</Badge>
                            <Badge className={`text-xs ${slaTone.tone}`}>{slaTone.ar}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{r.customer_name ?? '—'}</span>
                            <span>
                              {r.city ?? '—'}
                              {r.district ? ` / ${r.district}` : ''}
                            </span>
                            <span>{r.sector ?? '—'}</span>
                            <span className="tech-content">
                              مسندين: {r.assigned_count} · عروض: {r.bid_count}
                            </span>
                            <span className="tech-content">
                              خمول: {sla.idle_time_since_last_action_h.toFixed(1)} س
                            </span>
                            {r.contract_status && (
                              <span className="text-emerald-700">عقد: {r.contract_status}</span>
                            )}
                          </div>
                        </div>
                        <Button asChild size="sm" variant="outline" className="min-h-[36px]">
                          <Link to={`/admin/opportunities/${r.ref_id ?? r.id}`}>
                            عرض التفاصيل <ChevronRight className="h-4 w-4 ms-1" />
                          </Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          لوحة قراءة فقط — لا تغيّر مطابقة أو عروضًا أو تعميدًا أو عقودًا.
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminOpportunitiesOperations;
