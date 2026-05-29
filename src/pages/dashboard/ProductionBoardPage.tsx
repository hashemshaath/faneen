/**
 * BUSINESS-WORKFLOW-7 — Production Operations Board.
 *
 * Read-only Kanban-style board for workshops/factories/contractors.
 * - Columns mirror WORK_ORDER_PIPELINE_STAGE_KEYS (minus draft/cancelled).
 * - No drag-drop library; stage moves via forward-only buttons that delegate
 *   to the SECURITY DEFINER transitionWorkOrderStage RPC.
 * - No modals/dialogs; inline side panel only.
 * - No realtime, no external notifications, no inventory/procurement
 *   accounting.
 * - All Supabase access goes through @/modules/workOrders services. The
 *   page itself never imports `supabase` directly.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Factory,
  Filter,
  Search,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  UserPlus,
  UserMinus,
  RefreshCw,
  Gauge,
  TimerReset,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KpiStrip } from "@/components/dashboard/KpiCard";
import { DiagnosticsCard } from "@/components/dashboard/DiagnosticsCard";
import { HealthBadge } from "@/components/health/HealthBadge";
import { workOrderHealth } from "@/modules/health";
import { computeWorkOrderDiagnostics } from "@/modules/analytics/diagnostics";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import {
  listWorkOrdersForBoard,
  transitionWorkOrderStage,
  assignWorkOrderStageUser,
  unassignWorkOrderStage,
  BOARD_COLUMN_STAGES,
  WORK_ORDER_PIPELINE_STAGE_LABELS,
  getAllowedNextStages,
  isPipelineLocked,
  isOverdueRow,
  useAssigneeNames,
  WIP_LIMITS,
  getWipStatus,
  computeBoardCapacity,
  mapTransitionError,
  type WorkOrderPipelineStageKey,
  type WorkOrderPriority,
  type BoardWorkOrderRow,
  type BoardAssignmentRow,
  type BoardQuotationSummary,
  type BoardChecklistSummary,
  type WipStatus,
} from "@/modules/workOrders";
import { listBusinessStaffByBusiness } from "@/modules/businesses/services/listBusinessStaffByBusiness";

const PRIORITY_TONE: Record<WorkOrderPriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/10 text-info border-info/30",
  high: "bg-warning/10 text-warning border-warning/30",
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
};

const PRIORITY_LABELS: Record<WorkOrderPriority, { ar: string; en: string }> = {
  low: { ar: "منخفض", en: "Low" },
  medium: { ar: "متوسط", en: "Medium" },
  high: { ar: "مرتفع", en: "High" },
  urgent: { ar: "عاجل", en: "Urgent" },
};

interface StaffMember {
  user_id: string;
  role: string | null;
  is_active: boolean;
}

function initialsFor(name: string | null | undefined, fallback: string): string {
  const src = (name && name.trim()) || fallback;
  const parts = src.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ProductionBoardPage() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const workspace = useActiveWorkspace();
  const businessId = workspace.active_entity_id;

  const [orders, setOrders] = useState<BoardWorkOrderRow[]>([]);
  const [assignments, setAssignments] = useState<BoardAssignmentRow[]>([]);
  const [quotations, setQuotations] = useState<BoardQuotationSummary[]>([]);
  const [checklistSummaries, setChecklistSummaries] = useState<
    BoardChecklistSummary[]
  >([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | WorkOrderPipelineStageKey>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | WorkOrderPriority>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Inline side panel (no modal) — drives assignment composer.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [assignTargetUserId, setAssignTargetUserId] = useState<string>("");
  // Density + layout mode (display-only, persisted in component state).
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [stackedMode, setStackedMode] = useState(false);

  const tx = useMemo(
    () => ({
      title: isRTL ? "لوحة الإنتاج" : "Production Board",
      subtitle: isRTL
        ? "تتبّع أوامر العمل خلال خط الإنتاج"
        : "Track work orders across the production pipeline",
      pickBusiness: isRTL
        ? "اختر منشأة من شريط العمل للبدء."
        : "Pick a business from the workspace switcher to begin.",
      empty: isRTL ? "لا توجد أوامر عمل بعد." : "No work orders yet.",
      emptyColumn: isRTL ? "لا توجد بطاقات" : "No cards",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      refresh: isRTL ? "تحديث" : "Refresh",
      filters: isRTL ? "عوامل التصفية" : "Filters",
      search: isRTL ? "بحث برقم الأمر / العميل / العرض / العقد..." : "Search WO / customer / quote / contract...",
      stageAll: isRTL ? "كل المراحل" : "All stages",
      priorityAll: isRTL ? "كل الأولويات" : "All priorities",
      operatorAll: isRTL ? "كل المشغّلين" : "All operators",
      overdueOnly: isRTL ? "المتأخر فقط" : "Overdue only",
      clear: isRTL ? "مسح" : "Clear",
      results: isRTL ? "النتائج" : "Results",
      activeCount: isRTL ? "إنتاج نشط" : "Active production",
      overdue: isRTL ? "متأخر" : "Overdue",
      installToday: isRTL ? "تركيب اليوم" : "Installation today",
      qcBlocked: isRTL ? "محجوز في الفحص" : "QC blocked",
      awaitingApproval: isRTL ? "بانتظار الاعتماد" : "Awaiting approval",
      completedWeek: isRTL ? "اكتمل هذا الأسبوع" : "Completed this week",
      bottleneck: isRTL ? "أعلى عنق زجاجة" : "Top bottleneck",
      avgCycle: isRTL ? "متوسط زمن الدورة" : "Avg cycle time",
      pending: isRTL ? "قيد الحساب" : "Pending",
      moveForward: isRTL ? "نقل" : "Move",
      details: isRTL ? "التفاصيل" : "Details",
      open: isRTL ? "فتح أمر العمل" : "Open work order",
      assign: isRTL ? "إسناد إلى" : "Assign to",
      assigned: isRTL ? "مُسند" : "Assigned",
      unassign: isRTL ? "إزالة الإسناد" : "Unassign",
      operator: isRTL ? "المشغّل" : "Operator",
      due: isRTL ? "موعد الاستحقاق" : "Due",
      progress: isRTL ? "التقدّم" : "Progress",
      checklist: isRTL ? "قوائم التحقق" : "Checklists",
      quotation: isRTL ? "العرض" : "Quotation",
      contract: isRTL ? "العقد" : "Contract",
      locked: isRTL ? "مغلق" : "Locked",
      cancel: isRTL ? "إلغاء" : "Cancel",
      save: isRTL ? "حفظ" : "Save",
      errLoad: isRTL ? "تعذّر تحميل اللوحة." : "Failed to load board.",
      errMove: isRTL ? "تعذّر نقل المرحلة." : "Failed to move stage.",
      errAssign: isRTL ? "تعذّر إسناد المشغّل." : "Failed to assign operator.",
      noOperator: isRTL ? "بدون مشغّل" : "No operator",
      pickOperator: isRTL ? "اختر مشغّلًا..." : "Pick operator...",
      stage: isRTL ? "المرحلة" : "Stage",
      priority: isRTL ? "الأولوية" : "Priority",
      density: isRTL ? "الكثافة" : "Density",
      densityCompact: isRTL ? "مدمج" : "Compact",
      densityComfortable: isRTL ? "مريح" : "Comfortable",
      layoutKanban: isRTL ? "أعمدة" : "Columns",
      layoutStacked: isRTL ? "متتالٍ" : "Stacked",
      unassigned: isRTL ? "بدون إسناد" : "Unassigned",
      wipOk: isRTL ? "ضمن الحد" : "Within limit",
      wipWarning: isRTL ? "اقتراب من الحد" : "Near limit",
      wipDanger: isRTL ? "تجاوز الحد" : "Over limit (overloaded)",
      wipLimitNone: isRTL ? "بدون حد" : "No limit",
      overdueHere: isRTL ? "متأخر هنا" : "Overdue here",
    }),
    [isRTL],
  );

  /* ─── Load ─── */
  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const [boardRes, staffRes] = await Promise.all([
      listWorkOrdersForBoard({ businessId }),
      listBusinessStaffByBusiness<StaffMember>({
        businessId,
        select: "user_id, role, is_active",
      }),
    ]);
    if (boardRes.error || !boardRes.data) {
      setError(tx.errLoad);
      setLoading(false);
      return;
    }
    setOrders(boardRes.data.orders);
    setAssignments(boardRes.data.assignments);
    setQuotations(boardRes.data.quotations);
    setChecklistSummaries(boardRes.data.checklists);
    setStaff((staffRes.data ?? []).filter((s) => s.is_active));
    setLoading(false);
  }, [businessId, tx.errLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ─── Index helpers ─── */
  const quotationByWo = useMemo(() => {
    const m = new Map<string, BoardQuotationSummary>();
    for (const q of quotations) m.set(q.work_order_id, q);
    return m;
  }, [quotations]);

  const checklistByWo = useMemo(() => {
    const m = new Map<string, BoardChecklistSummary>();
    for (const c of checklistSummaries) m.set(c.work_order_id, c);
    return m;
  }, [checklistSummaries]);

  // Latest assignment per (wo, stage) — assignments already come ordered desc.
  const currentStageAssignment = useCallback(
    (woId: string, stage: WorkOrderPipelineStageKey): BoardAssignmentRow | undefined => {
      return assignments.find(
        (a) => a.work_order_id === woId && a.stage_key === stage,
      );
    },
    [assignments],
  );

  const assigneeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of assignments) ids.add(a.assigned_to_user_id);
    for (const s of staff) ids.add(s.user_id);
    return Array.from(ids);
  }, [assignments, staff]);
  const { map: assigneeMap } = useAssigneeNames(assigneeIds);

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (stageFilter !== "all" && o.pipeline_stage !== stageFilter) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (overdueOnly && !isOverdueRow(o as never)) return false;
      if (operatorFilter !== "all") {
        const a = currentStageAssignment(o.id, o.pipeline_stage);
        if (!a || a.assigned_to_user_id !== operatorFilter) return false;
      }
      if (q) {
        const quote = quotationByWo.get(o.id);
        const hay = [
          o.ref_id ?? "",
          o.title ?? "",
          o.customer_name ?? "",
          o.customer_phone ?? "",
          quote?.ref_id ?? "",
          quote?.contract_id ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    orders,
    stageFilter,
    priorityFilter,
    overdueOnly,
    operatorFilter,
    query,
    currentStageAssignment,
    quotationByWo,
  ]);

  /* ─── Columns ─── */
  const columns = useMemo(() => {
    const map = new Map<WorkOrderPipelineStageKey, BoardWorkOrderRow[]>();
    for (const s of BOARD_COLUMN_STAGES) map.set(s, []);
    for (const o of filtered) {
      const stage = o.pipeline_stage;
      if (map.has(stage)) map.get(stage)!.push(o);
    }
    return Array.from(map.entries()).map(([stage, items]) => ({ stage, items }));
  }, [filtered]);

  /* ─── Metrics ─── */
  const metrics = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    let active = 0;
    let overdue = 0;
    let installToday = 0;
    let qcBlocked = 0;
    let awaitingApproval = 0;
    let completedWeek = 0;

    for (const o of orders) {
      const isClosed = o.status === "completed" || o.status === "cancelled";
      if (!isClosed) active += 1;
      if (isOverdueRow(o as never, now)) overdue += 1;
      if (o.pipeline_stage === "installation" && o.due_at) {
        const due = new Date(o.due_at);
        if (due >= startOfDay && due.getTime() - now < 24 * 60 * 60 * 1000) {
          installToday += 1;
        }
      }
      if (o.pipeline_stage === "qc") qcBlocked += 1;
      if (o.pipeline_stage === "quoted" || o.pipeline_stage === "approved")
        awaitingApproval += 1;
      if (
        o.status === "completed" &&
        o.completed_at &&
        new Date(o.completed_at).getTime() >= oneWeekAgo
      ) {
        completedWeek += 1;
      }
    }

    // Pure helper covers stage counts, bottleneck, overload, unassigned, workload.
    const capacity = computeBoardCapacity(
      orders.map((o) => ({
        id: o.id,
        pipeline_stage: o.pipeline_stage,
        status: o.status,
        due_at: o.due_at,
      })),
      assignments,
      now,
    );

    return {
      active,
      overdue,
      installToday,
      qcBlocked,
      awaitingApproval,
      completedWeek,
      stageCounts: capacity.stageCounts,
      overdueByStage: capacity.overdueByStage,
      overloadedStages: capacity.overloadedStages,
      bottleneck: capacity.bottleneck,
      bottleneckCount: capacity.bottleneckCount,
      unassignedCount: capacity.unassignedCount,
      operatorWorkload: capacity.operatorWorkload,
    };
  }, [orders, assignments]);

  /* ─── Actions ─── */
  const onMove = useCallback(
    async (o: BoardWorkOrderRow, to: WorkOrderPipelineStageKey) => {
      if (busyId) return;
      setBusyId(o.id);
      setError(null);
      const { error: err } = await transitionWorkOrderStage({
        workOrderId: o.id,
        toStage: to,
      });
      setBusyId(null);
      if (err) {
        setError(mapTransitionError(err, isRTL ? "ar" : "en"));
        return;
      }
      await load();
    },
    [busyId, load, isRTL],
  );

  const onAssign = useCallback(
    async (o: BoardWorkOrderRow, userId: string) => {
      if (!user) return;
      if (busyId) return;
      setBusyId(o.id);
      setError(null);
      const { error: err } = await assignWorkOrderStageUser({
        workOrderId: o.id,
        businessId: o.business_id,
        stageKey: o.pipeline_stage,
        assignedToUserId: userId,
        assignedByUserId: user.id,
      });
      setBusyId(null);
      if (err) {
        setError(tx.errAssign);
        return;
      }
      setAssignTargetUserId("");
      await load();
    },
    [user, busyId, load, tx.errAssign],
  );

  const onUnassign = useCallback(
    async (o: BoardWorkOrderRow) => {
      if (!user) return;
      if (busyId) return;
      setBusyId(o.id);
      setError(null);
      const { error: err } = await unassignWorkOrderStage({
        workOrderId: o.id,
        businessId: o.business_id,
        stageKey: o.pipeline_stage,
        actorUserId: user.id,
      });
      setBusyId(null);
      if (err) {
        setError(tx.errAssign);
        return;
      }
      await load();
    },
    [user, busyId, load, tx.errAssign],
  );

  /* ─── No business selected ─── */
  if (!businessId) {
    return (
      <DashboardLayout>
        <section className="rounded-2xl border border-border/40 bg-card p-8 text-center">
          <Factory className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{tx.pickBusiness}</p>
        </section>
      </DashboardLayout>
    );
  }

  const hasFilters =
    query !== "" ||
    stageFilter !== "all" ||
    priorityFilter !== "all" ||
    operatorFilter !== "all" ||
    overdueOnly;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Factory className="w-5 h-5 text-primary" />
              {tx.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{tx.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex rounded-xl border border-border/40 overflow-hidden" role="group" aria-label={tx.density}>
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`h-9 px-2 text-[11px] ${density === "comfortable" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                aria-pressed={density === "comfortable"}
                data-testid="density-comfortable"
              >
                {tx.densityComfortable}
              </button>
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`h-9 px-2 text-[11px] border-s border-border/40 ${density === "compact" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                aria-pressed={density === "compact"}
                data-testid="density-compact"
              >
                {tx.densityCompact}
              </button>
            </div>
            <div className="inline-flex rounded-xl border border-border/40 overflow-hidden lg:hidden" role="group" aria-label="layout">
              <button
                type="button"
                onClick={() => setStackedMode(false)}
                className={`h-9 px-2 text-[11px] ${!stackedMode ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                aria-pressed={!stackedMode}
                data-testid="layout-kanban"
              >
                {tx.layoutKanban}
              </button>
              <button
                type="button"
                onClick={() => setStackedMode(true)}
                className={`h-9 px-2 text-[11px] border-s border-border/40 ${stackedMode ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                aria-pressed={stackedMode}
                data-testid="layout-stacked"
              >
                {tx.layoutStacked}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {tx.refresh}
            </Button>
          </div>
        </header>

        {/* Metrics */}
        <section
          aria-label={tx.title}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
        >
          {[
            { label: tx.activeCount, value: metrics.active, tone: "text-primary" },
            { label: tx.overdue, value: metrics.overdue, tone: "text-destructive" },
            { label: tx.installToday, value: metrics.installToday, tone: "text-info" },
            { label: tx.qcBlocked, value: metrics.qcBlocked, tone: "text-warning" },
            { label: tx.awaitingApproval, value: metrics.awaitingApproval, tone: "text-accent-foreground" },
            { label: tx.completedWeek, value: metrics.completedWeek, tone: "text-success" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border/30 bg-card p-3 min-h-[64px]"
            >
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold tech-content ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* BUSINESS-FINISHING-2A — standardized KPI strip + diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <KpiStrip
            className="lg:col-span-2"
            items={[
              { label: tx.activeCount, value: metrics.active, tone: 'info' },
              { label: tx.overdue, value: metrics.overdue, tone: metrics.overdue > 0 ? 'danger' : 'neutral' },
              { label: tx.unassigned, value: metrics.unassignedCount, tone: metrics.unassignedCount > 0 ? 'warning' : 'neutral' },
              {
                label: tx.bottleneck,
                value: metrics.bottleneckCount,
                hint: metrics.bottleneck
                  ? (isRTL
                      ? WORK_ORDER_PIPELINE_STAGE_LABELS[metrics.bottleneck].ar
                      : WORK_ORDER_PIPELINE_STAGE_LABELS[metrics.bottleneck].en)
                  : undefined,
                tone: metrics.bottleneckCount > 0 ? 'warning' : 'neutral',
              },
            ]}
          />
          <DiagnosticsCard
            title={isRTL ? 'تشخيص أوامر العمل' : 'Work order diagnostics'}
            entries={(() => {
              const d = computeWorkOrderDiagnostics(
                orders.map((o) => ({
                  id: o.id,
                  status: o.status,
                  owner_user_id: o.owner_user_id ?? null,
                  due_at: o.due_at ?? null,
                })),
              );
              return [
                { key: 'missingAssignee', label: isRTL ? 'بدون مُكلَّف' : 'Missing assignee', count: d.missingAssignee },
                { key: 'missingDueDate', label: isRTL ? 'بدون تاريخ تسليم' : 'Missing due date', count: d.missingDueDate },
                { key: 'overdue', label: isRTL ? 'متأخر' : 'Overdue', count: d.overdue },
              ];
            })()}
          />
        </div>

        {/* Secondary metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/30 bg-card p-3 flex items-center gap-3">
            <Gauge className="w-4 h-4 text-warning" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{tx.bottleneck}</p>
              <p className="text-sm font-semibold">
                {metrics.bottleneck
                  ? `${
                      isRTL
                        ? WORK_ORDER_PIPELINE_STAGE_LABELS[metrics.bottleneck].ar
                        : WORK_ORDER_PIPELINE_STAGE_LABELS[metrics.bottleneck].en
                    } · ${metrics.bottleneckCount}`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/30 bg-card p-3 flex items-center gap-3" data-testid="metric-unassigned">
            <UserMinus className="w-4 h-4 text-warning" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{tx.unassigned}</p>
              <p className="text-sm font-semibold tech-content">{metrics.unassignedCount}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border/30 bg-card p-3 flex items-center gap-3">
            <TimerReset className="w-4 h-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{tx.avgCycle}</p>
              <p className="text-sm font-semibold text-muted-foreground">{tx.pending}</p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-border/30 bg-card p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                style={{ insetInlineStart: "12px" }}
              />
              <Input
                aria-label={tx.search}
                placeholder={tx.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-10 h-10 rounded-xl"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  style={{ insetInlineEnd: "10px" }}
                  aria-label={tx.clear}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select
              value={stageFilter}
              onValueChange={(v) =>
                setStageFilter(v as "all" | WorkOrderPipelineStageKey)
              }
            >
              <SelectTrigger className="w-full lg:w-[170px] h-10 rounded-xl">
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{tx.stageAll}</SelectItem>
                {BOARD_COLUMN_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {isRTL
                      ? WORK_ORDER_PIPELINE_STAGE_LABELS[s].ar
                      : WORK_ORDER_PIPELINE_STAGE_LABELS[s].en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(v) =>
                setPriorityFilter(v as "all" | WorkOrderPriority)
              }
            >
              <SelectTrigger className="w-full lg:w-[150px] h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{tx.priorityAll}</SelectItem>
                {(["urgent", "high", "medium", "low"] as WorkOrderPriority[]).map(
                  (p) => (
                    <SelectItem key={p} value={p}>
                      {isRTL ? PRIORITY_LABELS[p].ar : PRIORITY_LABELS[p].en}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="w-full lg:w-[200px] h-10 rounded-xl">
                <SelectValue placeholder={tx.operatorAll} />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-72">
                <SelectItem value="all">{tx.operatorAll}</SelectItem>
                {staff.map((s) => {
                  const meta = assigneeMap[s.user_id];
                  const name = meta?.full_name || meta?.ref_id || s.user_id.slice(0, 6);
                  return (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={overdueOnly ? "default" : "outline"}
              size="sm"
              className="h-10 text-xs rounded-xl gap-1.5"
              onClick={() => setOverdueOnly((v) => !v)}
              aria-pressed={overdueOnly}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {tx.overdueOnly}
            </Button>
          </div>
          {hasFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20 flex-wrap">
              <span className="text-[11px] text-muted-foreground">
                {tx.results}: {filtered.length}
              </span>
              <button
                type="button"
                className="text-[11px] text-primary hover:underline ms-auto"
                onClick={() => {
                  setQuery("");
                  setStageFilter("all");
                  setPriorityFilter("all");
                  setOperatorFilter("all");
                  setOverdueOnly(false);
                }}
              >
                {tx.clear}
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}

        {/* Board */}
        <section
          className={stackedMode ? "pb-2" : "overflow-x-auto no-scrollbar pb-2"}
          aria-label={tx.title}
          data-testid="production-board"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-6">
              <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-border/30 bg-card p-10 text-center text-sm text-muted-foreground">
              {tx.empty}
            </div>
          ) : (
            <ol
              className={
                stackedMode
                  ? "flex flex-col gap-3"
                  : "flex gap-3 min-w-max"
              }
              role="list"
              data-testid={stackedMode ? "board-list-stacked" : "board-list-kanban"}
            >
              {columns.map(({ stage, items }) => {
                const isTerminal = stage === "completed";
                const wip = getWipStatus(stage, items.length);
                const wipTone: Record<WipStatus, string> = {
                  none: "text-muted-foreground border-border/40",
                  ok: "text-success border-success/30",
                  warning: "text-warning border-warning/40 bg-warning/5",
                  danger: "text-destructive border-destructive/40 bg-destructive/5",
                };
                const wipLabelByStatus: Record<WipStatus, string> = {
                  none: tx.wipLimitNone,
                  ok: tx.wipOk,
                  warning: tx.wipWarning,
                  danger: tx.wipDanger,
                };
                return (
                  <li
                    key={stage}
                    className={
                      stackedMode
                        ? "w-full rounded-2xl border border-border/30 bg-muted/20 p-2 flex flex-col"
                        : "w-[280px] sm:w-[300px] shrink-0 rounded-2xl border border-border/30 bg-muted/20 p-2 flex flex-col"
                    }
                    aria-label={
                      isRTL
                        ? WORK_ORDER_PIPELINE_STAGE_LABELS[stage].ar
                        : WORK_ORDER_PIPELINE_STAGE_LABELS[stage].en
                    }
                    data-testid={`board-column-${stage}`}
                  >
                    <header className="px-2 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {isRTL
                            ? WORK_ORDER_PIPELINE_STAGE_LABELS[stage].ar
                            : WORK_ORDER_PIPELINE_STAGE_LABELS[stage].en}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] tech-content ${wipTone[wip.status]}`}
                          title={wipLabelByStatus[wip.status]}
                          data-testid={`wip-badge-${stage}`}
                          data-wip-status={wip.status}
                        >
                          {wip.limit ? `${items.length} / ${wip.limit}` : items.length}
                        </Badge>
                        {metrics.overdueByStage[stage] > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-destructive border-destructive/30"
                            title={tx.overdueHere}
                          >
                            <Clock className="w-3 h-3 me-0.5" />
                            {metrics.overdueByStage[stage]}
                          </Badge>
                        )}
                      </div>
                      {isTerminal && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        </Badge>
                      )}
                    </header>
                    {wip.status === "warning" && (
                      <p
                        className="text-[10px] text-warning px-2"
                        data-testid={`wip-warning-${stage}`}
                      >
                        {tx.wipWarning}
                      </p>
                    )}
                    {wip.status === "danger" && (
                      <p
                        className="text-[10px] text-destructive px-2 font-semibold"
                        data-testid={`wip-danger-${stage}`}
                      >
                        {tx.wipDanger}
                      </p>
                    )}
                    <div className="space-y-2 min-h-[60px]" data-testid={`board-cards-${stage}`}>
                      {items.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-3">
                          {tx.emptyColumn}
                        </p>
                      ) : (
                        items.map((o) => (
                          <BoardCard
                            key={o.id}
                            order={o}
                            tx={tx}
                            isRTL={isRTL}
                            density={density}
                            quotation={quotationByWo.get(o.id)}
                            checklist={checklistByWo.get(o.id)}
                            assignment={currentStageAssignment(o.id, o.pipeline_stage)}
                            assigneeMap={assigneeMap}
                            busy={busyId === o.id}
                            open={openCardId === o.id}
                            onToggleOpen={() =>
                              setOpenCardId((prev) => (prev === o.id ? null : o.id))
                            }
                            onMove={onMove}
                            onAssign={onAssign}
                            onUnassign={onUnassign}
                            staff={staff}
                            assignTargetUserId={assignTargetUserId}
                            setAssignTargetUserId={setAssignTargetUserId}
                          />
                        ))
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

/* ─── Card ─── */
interface CardProps {
  order: BoardWorkOrderRow;
  tx: Record<string, string>;
  isRTL: boolean;
  density: "comfortable" | "compact";
  quotation?: BoardQuotationSummary;
  checklist?: BoardChecklistSummary;
  assignment?: BoardAssignmentRow;
  assigneeMap: Record<string, { full_name: string | null; ref_id: string | null }>;
  busy: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onMove: (o: BoardWorkOrderRow, to: WorkOrderPipelineStageKey) => Promise<void>;
  onAssign: (o: BoardWorkOrderRow, userId: string) => Promise<void>;
  onUnassign: (o: BoardWorkOrderRow) => Promise<void>;
  staff: StaffMember[];
  assignTargetUserId: string;
  setAssignTargetUserId: (v: string) => void;
}

function BoardCard({
  order,
  tx,
  isRTL,
  density,
  quotation,
  checklist,
  assignment,
  assigneeMap,
  busy,
  open,
  onToggleOpen,
  onMove,
  onAssign,
  onUnassign,
  staff,
  assignTargetUserId,
  setAssignTargetUserId,
}: CardProps) {
  const allowed = getAllowedNextStages(order.pipeline_stage, order.status);
  const locked = isPipelineLocked(order.status, order.pipeline_stage);
  const overdue = isOverdueRow(order as never);
  const dueIn = daysUntil(order.due_at);
  const checklistPct =
    checklist && checklist.total_items > 0
      ? Math.round((checklist.done_items / checklist.total_items) * 100)
      : 0;
  const operator = assignment
    ? assigneeMap[assignment.assigned_to_user_id]
    : undefined;
  const operatorName = operator?.full_name || operator?.ref_id || null;

  // Next stage button: pick the next stage that is NOT `cancelled` (forward).
  const nextForward = allowed.find((s) => s !== "cancelled");

  return (
    <article
      data-testid={`board-card-${order.id}`}
      className={
        density === "compact"
          ? "rounded-xl border border-border/40 bg-card p-2 space-y-1 hover-lift"
          : "rounded-xl border border-border/40 bg-card p-3 space-y-2 hover-lift"
      }
      data-density={density}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={order.ref_id ? `/dashboard/work-orders/${order.ref_id}` : "/dashboard/work-orders"}
            className="text-xs font-semibold text-primary hover:underline tech-content"
          >
            {order.ref_id ?? order.id.slice(0, 8)}
          </Link>
          <p className="text-xs font-medium truncate" dir="auto" title={order.title}>
            {order.title}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] ${PRIORITY_TONE[order.priority]}`}
        >
          {isRTL ? PRIORITY_LABELS[order.priority].ar : PRIORITY_LABELS[order.priority].en}
        </Badge>
      </header>

      {order.customer_name && (
        <p className="text-[11px] text-muted-foreground truncate" dir="auto">
          {order.customer_name}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        {order.due_at && (
          <span
            className={`inline-flex items-center gap-1 ${
              overdue ? "text-destructive" : dueIn !== null && dueIn <= 2 ? "text-warning" : "text-muted-foreground"
            }`}
          >
            <Clock className="w-3 h-3" />
            {overdue
              ? tx.overdue
              : dueIn === null
                ? new Date(order.due_at).toLocaleDateString()
                : `${dueIn}d`}
          </span>
        )}
        {checklist && checklist.checklists_total > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" />
            {checklist.checklists_completed}/{checklist.checklists_total} · {checklistPct}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {checklist && checklist.total_items > 0 && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${checklistPct}%` }}
          />
        </div>
      )}

      {/* Operator chip */}
      <div className="flex items-center justify-between gap-2">
        {assignment && operator ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
              {initialsFor(operatorName, "?")}
            </span>
            <span className="truncate max-w-[140px]" dir="auto">
              {operatorName ?? tx.assigned}
            </span>
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{tx.noOperator}</span>
        )}

        {/* Quote/contract chips */}
        <div className="flex items-center gap-1">
          {quotation && (
            <Badge variant="outline" className="text-[9px] gap-1">
              <FileText className="w-3 h-3" />
              {quotation.status}
            </Badge>
          )}
          {quotation?.contract_id && (
            <Badge variant="outline" className="text-[9px] text-success border-success/30">
              {tx.contract}
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1"
          onClick={onToggleOpen}
          aria-expanded={open}
        >
          {open ? <X className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          {tx.details}
        </Button>
        {locked ? (
          <Badge variant="outline" className="text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> {tx.locked}
          </Badge>
        ) : nextForward ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-[11px] gap-1 rounded-lg"
            disabled={busy}
            onClick={() => void onMove(order, nextForward)}
            data-testid={`move-${order.id}-${nextForward}`}
          >
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isRTL ? (
              <ArrowLeft className="w-3 h-3" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
            {isRTL
              ? WORK_ORDER_PIPELINE_STAGE_LABELS[nextForward].ar
              : WORK_ORDER_PIPELINE_STAGE_LABELS[nextForward].en}
          </Button>
        ) : null}
      </div>

      {/* Inline side panel (no modal) */}
      {open && (
        <div
          className="mt-2 rounded-lg border border-border/30 bg-muted/20 p-2 space-y-2 animate-in slide-in-from-top-1 duration-150"
          data-testid={`board-card-panel-${order.id}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {tx.assign}
            </span>
            <Link
              to={order.ref_id ? `/dashboard/work-orders/${order.ref_id}` : "/dashboard/work-orders"}
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {tx.open}
            </Link>
          </div>
          {!locked && (
            <div className="flex items-center gap-2">
              <Select
                value={assignTargetUserId}
                onValueChange={setAssignTargetUserId}
              >
                <SelectTrigger className="h-8 text-[11px] rounded-lg flex-1">
                  <SelectValue placeholder={tx.pickOperator} />
                </SelectTrigger>
                <SelectContent className="rounded-lg max-h-60">
                  {staff.map((s) => {
                    const meta = assigneeMap[s.user_id];
                    const name = meta?.full_name || meta?.ref_id || s.user_id.slice(0, 6);
                    return (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={!assignTargetUserId || busy}
                onClick={() => assignTargetUserId && void onAssign(order, assignTargetUserId)}
                className="h-8 text-[11px] rounded-lg gap-1"
                data-testid={`assign-${order.id}`}
              >
                <UserPlus className="w-3 h-3" />
                {tx.save}
              </Button>
              {assignment && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onUnassign(order)}
                  className="h-8 text-[11px] rounded-lg gap-1"
                  data-testid={`unassign-${order.id}`}
                  aria-label={tx.unassign}
                  title={tx.unassign}
                >
                  <UserMinus className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
          {/* Show all allowed-next stages as buttons (back not allowed — forward only) */}
          {!locked && allowed.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-border/20">
              {allowed.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={s === "cancelled" ? "ghost" : "outline"}
                  size="sm"
                  className="h-7 text-[10px] rounded-lg"
                  disabled={busy}
                  onClick={() => void onMove(order, s)}
                >
                  {isRTL
                    ? WORK_ORDER_PIPELINE_STAGE_LABELS[s].ar
                    : WORK_ORDER_PIPELINE_STAGE_LABELS[s].en}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}