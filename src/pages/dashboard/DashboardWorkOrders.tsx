import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ClipboardList, AlertCircle, X, MessageSquare, ListChecks, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReferenceBadge } from "@/components/reference/ReferenceBadge";
import { WorkOrderSearchInput } from "@/components/workOrders/WorkOrderSearchInput";
import { WorkOrderSourceBadge } from "@/components/workOrders/WorkOrderSourceBadge";
import { WorkOrderSlaBadge } from "@/components/workOrders/WorkOrderSlaBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  listWorkOrdersForBusiness,
  createWorkOrder,
  updateWorkOrder,
  listWorkOrderStages,
  updateWorkOrderStage,
  listWorkOrderTasks,
  createWorkOrderTask,
  updateWorkOrderTask,
  listWorkOrderComments,
  addWorkOrderComment,
  isOverdueRow,
  type WorkOrderRow,
  type WorkOrderStageRow,
  type WorkOrderTaskRow,
  type WorkOrderCommentRow,
  type WorkOrderStatus,
  type WorkOrderPriority,
  type WorkOrderStageStatus,
  type WorkOrderTaskStatus,
} from "@/modules/workOrders";

const STATUS_VALUES: WorkOrderStatus[] = ["draft", "active", "on_hold", "completed", "cancelled"];
const PRIORITY_VALUES: WorkOrderPriority[] = ["low", "medium", "high", "urgent"];
const SOURCE_VALUES = ["manual", "lead", "quote", "contract", "booking"] as const;
const STAGE_STATUSES: WorkOrderStageStatus[] = ["pending", "active", "completed", "skipped"];
const TASK_STATUSES: WorkOrderTaskStatus[] = ["todo", "in_progress", "blocked", "completed", "archived"];

export default function DashboardWorkOrders() {
  const { user } = useAuth();
  const workspace = useActiveWorkspace();
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? "أوامر العمل" : "Work Orders",
    description: isRTL ? "إدارة أوامر العمل والمهام والمراحل" : "Manage work orders, tasks and stages",
    noindex: true,
  });

  const businessId = workspace.active_entity_id;

  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // BUSINESS-WORKFLOW-2 — UI-only filters (status / priority / overdue / source_type)
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<WorkOrderPriority | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const tx = useMemo(
    () => ({
      title: isRTL ? "أوامر العمل" : "Work Orders",
      subtitle: isRTL ? "إدارة أوامر العمل لمنشأتك" : "Manage work orders for your business",
      create: isRTL ? "أمر عمل جديد" : "New Work Order",
      noEntity: isRTL
        ? "اختر منشأة من شريط العمل للبدء."
        : "Pick a business from the workspace switcher to begin.",
      empty: isRTL ? "لا توجد أوامر عمل بعد." : "No work orders yet.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      retry: isRTL ? "إعادة المحاولة" : "Retry",
      errorLoad: isRTL ? "تعذّر تحميل أوامر العمل." : "Failed to load work orders.",
      errorSave: isRTL ? "تعذّر الحفظ." : "Failed to save.",
      titleLabel: isRTL ? "العنوان" : "Title",
      customerName: isRTL ? "اسم العميل" : "Customer name",
      customerPhone: isRTL ? "هاتف العميل" : "Customer phone",
      priority: isRTL ? "الأولوية" : "Priority",
      status: isRTL ? "الحالة" : "Status",
      cancel: isRTL ? "إلغاء" : "Cancel",
      save: isRTL ? "حفظ" : "Save",
      stages: isRTL ? "المراحل" : "Stages",
      tasks: isRTL ? "المهام" : "Tasks",
      comments: isRTL ? "التعليقات" : "Comments",
      addTask: isRTL ? "مهمة جديدة" : "New task",
      addComment: isRTL ? "أضف تعليقًا…" : "Add a comment…",
      send: isRTL ? "إرسال" : "Send",
      close: isRTL ? "إغلاق" : "Close",
      noPermissionHint: isRTL
        ? "قد لا تملك صلاحية إنشاء/تعديل أوامر العمل لهذه المنشأة."
        : "You may not have permission to create/edit work orders for this business.",
    }),
    [isRTL],
  );

  const statusLabel = useCallback(
    (s: string) => {
      if (!isRTL) return s;
      return ({
        draft: "مسودة",
        active: "نشط",
        on_hold: "معلق",
        completed: "مكتمل",
        cancelled: "ملغي",
      } as Record<string, string>)[s] ?? s;
    },
    [isRTL],
  );
  const priorityLabel = useCallback(
    (p: string) => {
      if (!isRTL) return p;
      return ({ low: "منخفضة", medium: "متوسطة", high: "مرتفعة", urgent: "عاجلة" } as Record<string, string>)[p] ?? p;
    },
    [isRTL],
  );

  const reload = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await listWorkOrdersForBusiness({ businessId });
    if (err) setError(tx.errorLoad);
    setOrders(data ?? []);
    setLoading(false);
  }, [businessId, tx.errorLoad]);

  useEffect(() => {
    if (businessId) void reload();
    else {
      setOrders([]);
      setSelectedId(null);
    }
  }, [businessId, reload]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (priorityFilter !== "all" && (o.priority ?? "medium") !== priorityFilter) return false;
      if (sourceFilter !== "all") {
        const src = o.source_type ?? "manual";
        if (src !== sourceFilter) return false;
      }
      if (overdueOnly && !isOverdueRow(o)) return false;
      return true;
    });
  }, [orders, statusFilter, priorityFilter, sourceFilter, overdueOnly]);

  if (!businessId) {
    return (
      <DashboardLayout>
      <main dir={isRTL ? "rtl" : "ltr"} className="container max-w-6xl py-8">
        <h1 className="text-2xl font-bold mb-2">{tx.title}</h1>
        <p className="text-muted-foreground">{tx.noEntity}</p>
      </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <main dir={isRTL ? "rtl" : "ltr"} className="container max-w-7xl py-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            {tx.title}
          </h1>
          <p className="text-sm text-muted-foreground">{tx.subtitle}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-xl">
          <Plus className="w-4 h-4 me-2" /> {tx.create}
        </Button>
      </header>

      <div className="w-full sm:max-w-md">
        <WorkOrderSearchInput businessId={businessId} isRTL={isRTL} />
      </div>

      {/* BUSINESS-WORKFLOW-2 — UI-only filters */}
      <div className="flex flex-wrap items-center gap-2" role="region" aria-label={isRTL ? "تصفية" : "Filters"}>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkOrderStatus | "all")}>
          <SelectTrigger className="w-[150px] h-9" aria-label={isRTL ? "تصفية الحالة" : "Status filter"}>
            <SelectValue placeholder={isRTL ? "الحالة" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل الحالات" : "All statuses"}</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as WorkOrderPriority | "all")}>
          <SelectTrigger className="w-[150px] h-9" aria-label={isRTL ? "تصفية الأولوية" : "Priority filter"}>
            <SelectValue placeholder={isRTL ? "الأولوية" : "Priority"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل الأولويات" : "All priorities"}</SelectItem>
            {PRIORITY_VALUES.map((p) => (
              <SelectItem key={p} value={p}>{priorityLabel(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px] h-9" aria-label={isRTL ? "تصفية المصدر" : "Source filter"}>
            <SelectValue placeholder={isRTL ? "المصدر" : "Source"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "كل المصادر" : "All sources"}</SelectItem>
            {SOURCE_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {({
                  manual: isRTL ? "يدوي" : "Manual",
                  lead: isRTL ? "طلب" : "Lead",
                  quote: isRTL ? "عرض" : "Quote",
                  contract: isRTL ? "عقد" : "Contract",
                  booking: isRTL ? "حجز" : "Booking",
                } as Record<string, string>)[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant={overdueOnly ? "destructive" : "outline"}
          className="h-9"
          aria-pressed={overdueOnly}
          onClick={() => setOverdueOnly((v) => !v)}
        >
          {isRTL ? "المتأخرة فقط" : "Overdue only"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" /> <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            {tx.retry}
          </Button>
        </div>
      )}

      {showCreate && user && (
        <CreateWorkOrderForm
          tx={tx}
          businessId={businessId}
          userId={user.id}
          onCancel={() => setShowCreate(false)}
          onCreated={async (wo) => {
            setShowCreate(false);
            await reload();
            setSelectedId(wo.id);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tx.empty}</p>
          ) : (
            <ul className="space-y-2" aria-label={tx.title}>
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(o.id)}
                    aria-label={o.title}
                    className={`w-full text-start rounded-xl border p-3 hover:bg-muted/50 transition ${
                      selectedId === o.id ? "border-primary bg-muted/40" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <ReferenceBadge refId={o.ref_id} />
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{statusLabel(o.status)}</Badge>
                        <Badge variant="secondary">{priorityLabel(o.priority)}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 font-medium text-foreground line-clamp-1" dir="auto">
                      {o.title}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>{new Date(o.updated_at).toLocaleString(isRTL ? "ar" : "en")}</span>
                      {o.source_type && <span>· {o.source_type}</span>}
                      {o.source_ref_id && <ReferenceBadge refId={o.source_ref_id} />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-7">
          {selected ? (
            <WorkOrderDetailPanel
              key={selected.id}
              tx={tx}
              statusLabel={statusLabel}
              priorityLabel={priorityLabel}
              workOrder={selected}
              actorId={user?.id ?? ""}
              onClose={() => setSelectedId(null)}
              onChanged={async () => {
                await reload();
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {isRTL ? "اختر أمر عمل لعرض التفاصيل." : "Select a work order to view details."}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <p className="text-xs text-muted-foreground">{tx.noPermissionHint}</p>
    </main>
    </DashboardLayout>
  );
}

/* ─────────────────────────────  Create form  ───────────────────────────── */
interface CreateProps {
  tx: Record<string, string>;
  businessId: string;
  userId: string;
  onCancel: () => void;
  onCreated: (wo: WorkOrderRow) => void;
}
function CreateWorkOrderForm({ tx, businessId, userId, onCancel, onCreated }: CreateProps) {
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState<WorkOrderPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setErr(null);
    const { data, error } = await createWorkOrder({
      business_id: businessId,
      owner_user_id: userId,
      created_by_user_id: userId,
      title,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      priority,
    });
    setSubmitting(false);
    if (error || !data) {
      setErr(tx.errorSave);
      return;
    }
    onCreated(data);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{tx.create}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label={tx.cancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="wo-title">{tx.titleLabel}</Label>
          <Input id="wo-title" value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" maxLength={200} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="wo-cn">{tx.customerName}</Label>
            <Input id="wo-cn" value={customerName} onChange={(e) => setCustomerName(e.target.value)} dir="auto" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wo-cp">{tx.customerPhone}</Label>
            <Input id="wo-cp" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} dir="ltr" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>{tx.priority}</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as WorkOrderPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_VALUES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {err && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>{tx.cancel}</Button>
          <Button onClick={submit} disabled={submitting || !title.trim()}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {tx.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────  Detail panel  ───────────────────────────── */
interface DetailProps {
  tx: Record<string, string>;
  statusLabel: (s: string) => string;
  priorityLabel: (p: string) => string;
  workOrder: WorkOrderRow;
  actorId: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}
function WorkOrderDetailPanel({ tx, statusLabel, priorityLabel, workOrder, actorId, onClose, onChanged }: DetailProps) {
  const { isRTL } = useLanguage();
  const [stages, setStages] = useState<WorkOrderStageRow[]>([]);
  const [tasks, setTasks] = useState<WorkOrderTaskRow[]>([]);
  const [comments, setComments] = useState<WorkOrderCommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    const [s, t, c] = await Promise.all([
      listWorkOrderStages({ workOrderId: workOrder.id }),
      listWorkOrderTasks({ workOrderId: workOrder.id }),
      listWorkOrderComments({ workOrderId: workOrder.id }),
    ]);
    setStages(s.data ?? []);
    setTasks(t.data ?? []);
    setComments(c.data ?? []);
    setLoading(false);
  }, [workOrder.id]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const handleStatusChange = async (status: WorkOrderStatus) => {
    setBusy(true);
    await updateWorkOrder({ id: workOrder.id, actor_id: actorId, status });
    setBusy(false);
    await onChanged();
  };

  const handleStageChange = async (stageId: string, status: WorkOrderStageStatus) => {
    await updateWorkOrderStage({ stageId, actor_id: actorId, patch: { status } });
    await reloadAll();
  };

  const handleTaskStatus = async (taskId: string, status: WorkOrderTaskStatus) => {
    await updateWorkOrderTask({ taskId, actor_id: actorId, patch: { status } });
    await reloadAll();
  };

  const handleAddTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    setBusy(true);
    await createWorkOrderTask({
      work_order_id: workOrder.id,
      business_id: workOrder.business_id,
      created_by_user_id: actorId,
      title,
    });
    setNewTask("");
    setBusy(false);
    await reloadAll();
  };

  const handleAddComment = async () => {
    const body = newComment.trim();
    if (!body) return;
    setBusy(true);
    await addWorkOrderComment({
      work_order_id: workOrder.id,
      business_id: workOrder.business_id,
      author_user_id: actorId,
      body,
    });
    setNewComment("");
    setBusy(false);
    await reloadAll();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <ReferenceBadge refId={workOrder.ref_id} />
          <CardTitle className="text-lg" dir="auto">{workOrder.title}</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{statusLabel(workOrder.status)}</Badge>
            <Badge variant="secondary">{priorityLabel(workOrder.priority)}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={tx.close}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{tx.status}</Label>
          <Select value={workOrder.status} onValueChange={(v) => handleStatusChange(v as WorkOrderStatus)} disabled={busy}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stages */}
        <section aria-label={tx.stages} className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> {tx.stages}
          </h3>
          {loading ? (
            <p className="text-xs text-muted-foreground">{tx.loading}</p>
          ) : (
            <ul className="space-y-1.5">
              {stages.map((st) => (
                <li key={st.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-2">
                  <span className="text-sm" dir="auto">{isRTL ? st.title_ar : st.title_en}</span>
                  <Select value={st.status} onValueChange={(v) => handleStageChange(st.id, v as WorkOrderStageStatus)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks */}
        <section aria-label={tx.tasks} className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {tx.tasks}
          </h3>
          <div className="flex gap-2">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder={tx.addTask}
              dir="auto"
              maxLength={200}
              aria-label={tx.addTask}
            />
            <Button onClick={handleAddTask} disabled={busy || !newTask.trim()}>{tx.save}</Button>
          </div>
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-2">
                <div className="flex flex-col">
                  <span className="text-sm" dir="auto">{t.title}</span>
                  <ReferenceBadge refId={t.ref_id} className="self-start" />
                </div>
                <Select value={t.status} onValueChange={(v) => handleTaskStatus(t.id, v as WorkOrderTaskStatus)}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        </section>

        {/* Comments */}
        <section aria-label={tx.comments} className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> {tx.comments}
          </h3>
          <ul className="space-y-1.5">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-border/50 p-2">
                <p className="text-sm whitespace-pre-wrap break-words" dir="auto">{c.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString(isRTL ? "ar" : "en")}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={tx.addComment}
              dir="auto"
              maxLength={4000}
              rows={2}
              aria-label={tx.addComment}
            />
            <Button onClick={handleAddComment} disabled={busy || !newComment.trim()}>{tx.send}</Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}