/**
 * BUSINESS-WORKFLOW-6 — Production & Fabrication Pipeline section.
 *
 * Inline UI (no modals, no drag-drop, no board view). Renders:
 *   - Stage timeline with current-stage badge.
 *   - Forward-only stage transition buttons.
 *   - Per-checklist cards (fabrication / installation / qc / delivery) with
 *     sector-aware presets. Items can be ticked by managers or by the user
 *     assigned to the checklist (RLS-enforced).
 *   - Progress %, QC status and installation readiness derived from items.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Factory,
  ListChecks,
  Plus,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  transitionWorkOrderStage,
  listWorkOrderPipelineEvents,
  listWorkOrderChecklists,
  listChecklistItems,
  createWorkOrderChecklist,
  completeChecklistItem,
  completeChecklist,
  WORK_ORDER_PIPELINE_STAGES,
  WORK_ORDER_PIPELINE_STAGE_LABELS,
  WORK_ORDER_CHECKLIST_TYPES,
  WORK_ORDER_CHECKLIST_SECTOR_KEYS,
  type WorkOrderPipelineStageKey,
  type WorkOrderChecklistRow,
  type WorkOrderChecklistItemRow,
  type WorkOrderChecklistType,
  type WorkOrderChecklistSectorKey,
  type WorkOrderPipelineEventRow,
} from "@/modules/workOrders";

interface Props {
  workOrderId: string;
  businessId: string;
  currentStage: WorkOrderPipelineStageKey;
  workOrderStatus: string;
  canManage: boolean;
  onStageChanged?: (next: WorkOrderPipelineStageKey) => void;
}

const STAGE_ORDER: Record<WorkOrderPipelineStageKey, number> = {
  draft: 0,
  measured: 1,
  quoted: 2,
  approved: 3,
  engineering: 4,
  procurement: 5,
  fabrication: 6,
  qc: 7,
  ready: 8,
  installation: 9,
  completed: 10,
  cancelled: 99,
};

function pickLabel(
  key: WorkOrderPipelineStageKey,
  isRTL: boolean,
): string {
  const l = WORK_ORDER_PIPELINE_STAGE_LABELS[key];
  return isRTL ? l.ar : l.en;
}

export function WorkOrderPipelineSection({
  workOrderId,
  businessId,
  currentStage,
  workOrderStatus,
  canManage,
  onStageChanged,
}: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [stage, setStage] = useState<WorkOrderPipelineStageKey>(currentStage);
  const [events, setEvents] = useState<WorkOrderPipelineEventRow[]>([]);
  const [checklists, setChecklists] = useState<WorkOrderChecklistRow[]>([]);
  const [itemsByList, setItemsByList] = useState<
    Record<string, WorkOrderChecklistItemRow[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-checklist composer.
  const [newType, setNewType] = useState<WorkOrderChecklistType>("fabrication");
  const [newSector, setNewSector] =
    useState<WorkOrderChecklistSectorKey>("generic");
  const [newTitle, setNewTitle] = useState("");

  const locked = workOrderStatus === "completed" || workOrderStatus === "cancelled"
    || stage === "completed" || stage === "cancelled";

  const tx = useMemo(
    () => ({
      heading: isRTL ? "خط الإنتاج" : "Production Pipeline",
      currentStage: isRTL ? "المرحلة الحالية" : "Current stage",
      timeline: isRTL ? "خط الزمن" : "Timeline",
      moveTo: isRTL ? "نقل إلى" : "Move to",
      cancel: isRTL ? "إلغاء أمر العمل" : "Cancel work order",
      complete: isRTL ? "إنهاء" : "Complete",
      checklists: isRTL ? "قوائم التحقق" : "Checklists",
      addChecklist: isRTL ? "إضافة قائمة" : "Add checklist",
      title: isRTL ? "العنوان" : "Title",
      type: isRTL ? "النوع" : "Type",
      sector: isRTL ? "القطاع" : "Sector",
      noChecklists: isRTL ? "لا توجد قوائم تحقق." : "No checklists yet.",
      progress: isRTL ? "التقدّم" : "Progress",
      qcReady: isRTL ? "جاهزية الفحص" : "QC ready",
      installReady: isRTL ? "جاهزية التركيب" : "Installation ready",
      locked: isRTL ? "أمر العمل مغلق" : "Work order locked",
      errLoad: isRTL ? "تعذّر تحميل خط الإنتاج." : "Failed to load pipeline.",
      errMove: isRTL ? "تعذّر تغيير المرحلة." : "Failed to change stage.",
      errCreate: isRTL ? "تعذّر إنشاء القائمة." : "Failed to create checklist.",
      markComplete: isRTL ? "إنهاء القائمة" : "Mark checklist complete",
    }),
    [isRTL],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, chRes] = await Promise.all([
      listWorkOrderPipelineEvents({ workOrderId }),
      listWorkOrderChecklists({ workOrderId }),
    ]);
    if (evRes.error || chRes.error) setError(tx.errLoad);
    setEvents(evRes.data ?? []);
    setChecklists(chRes.data ?? []);
    const allItems: Record<string, WorkOrderChecklistItemRow[]> = {};
    for (const ch of chRes.data ?? []) {
      const { data } = await listChecklistItems({ checklistId: ch.id });
      allItems[ch.id] = data ?? [];
    }
    setItemsByList(allItems);
    setLoading(false);
  }, [workOrderId, tx.errLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setStage(currentStage);
  }, [currentStage]);

  const nextStages = useMemo<WorkOrderPipelineStageKey[]>(() => {
    if (locked) return [];
    const order = STAGE_ORDER[stage];
    return WORK_ORDER_PIPELINE_STAGES.filter((s) => {
      if (s === stage) return false;
      if (s === "cancelled") return true;
      if (s === "completed") return stage === "installation";
      return STAGE_ORDER[s] > order && STAGE_ORDER[s] < STAGE_ORDER.completed;
    });
  }, [stage, locked]);

  const onMove = useCallback(
    async (to: WorkOrderPipelineStageKey) => {
      if (!canManage || busy) return;
      setBusy(true);
      setError(null);
      const { data, error: err } = await transitionWorkOrderStage({
        workOrderId,
        toStage: to,
      });
      setBusy(false);
      if (err || !data) {
        setError(tx.errMove);
        return;
      }
      setStage(to);
      onStageChanged?.(to);
      void load();
    },
    [busy, canManage, workOrderId, load, onStageChanged, tx.errMove],
  );

  const onCreateChecklist = useCallback(async () => {
    if (!user || !canManage || busy || !newTitle.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await createWorkOrderChecklist({
      workOrderId,
      businessId,
      createdBy: user.id,
      checklistType: newType,
      sectorKey: newSector,
      title: newTitle.trim(),
    });
    setBusy(false);
    if (err) {
      setError(tx.errCreate);
      return;
    }
    setNewTitle("");
    void load();
  }, [user, canManage, busy, newTitle, newType, newSector, workOrderId, businessId, load, tx.errCreate]);

  const onToggleItem = useCallback(
    async (item: WorkOrderChecklistItemRow) => {
      if (!user) return;
      const next = !item.completed;
      setItemsByList((prev) => ({
        ...prev,
        [item.checklist_id]: (prev[item.checklist_id] ?? []).map((x) =>
          x.id === item.id ? { ...x, completed: next } : x,
        ),
      }));
      const { error: err } = await completeChecklistItem({
        itemId: item.id,
        businessId,
        actorId: user.id,
        workOrderId,
        completed: next,
      });
      if (err) {
        // Roll back on failure.
        setItemsByList((prev) => ({
          ...prev,
          [item.checklist_id]: (prev[item.checklist_id] ?? []).map((x) =>
            x.id === item.id ? { ...x, completed: !next } : x,
          ),
        }));
      }
    },
    [user, businessId, workOrderId],
  );

  const onCompleteChecklist = useCallback(
    async (ch: WorkOrderChecklistRow) => {
      if (!user || !canManage) return;
      const { error: err } = await completeChecklist({
        checklistId: ch.id,
        businessId,
        actorId: user.id,
        workOrderId,
      });
      if (!err) void load();
    },
    [user, canManage, businessId, workOrderId, load],
  );

  const qcReady = useMemo(() => {
    const qcLists = checklists.filter((c) => c.checklist_type === "qc");
    if (qcLists.length === 0) return false;
    return qcLists.every((c) => c.status === "completed");
  }, [checklists]);
  const installReady = useMemo(() => {
    const lists = checklists.filter((c) => c.checklist_type === "fabrication");
    if (lists.length === 0) return false;
    return lists.every((c) => c.status === "completed");
  }, [checklists]);

  const overallProgress = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const ch of checklists) {
      const items = itemsByList[ch.id] ?? [];
      total += items.length;
      done += items.filter((i) => i.completed).length;
    }
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }, [checklists, itemsByList]);

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4"
      aria-label={tx.heading}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.heading}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {tx.currentStage}:
          </span>
          <Badge variant="outline" className="text-[10px]">
            {pickLabel(stage, isRTL)}
          </Badge>
          {locked && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Lock className="w-3 h-3" />
              {tx.locked}
            </Badge>
          )}
        </div>
      </header>

      {/* Timeline */}
      <div className="overflow-x-auto no-scrollbar">
        <ol className="flex items-center gap-1.5 min-w-max" aria-label={tx.timeline}>
          {WORK_ORDER_PIPELINE_STAGES.filter((s) => s !== "cancelled").map((s) => {
            const isPast = STAGE_ORDER[s] < STAGE_ORDER[stage];
            const isCurrent = s === stage;
            return (
              <li key={s} className="flex items-center gap-1.5">
                <span
                  className={[
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold border",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : isPast
                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border",
                  ].join(" ")}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {STAGE_ORDER[s] + 1}
                </span>
                <span className="text-[11px] text-muted-foreground" dir="auto">
                  {pickLabel(s, isRTL)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Progress + readiness */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">{tx.progress}</p>
          <p className="text-sm font-semibold tech-content">{overallProgress}%</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">{tx.qcReady}</p>
          <p className={`text-sm font-semibold ${qcReady ? "text-emerald-600" : "text-muted-foreground"}`}>
            {qcReady ? "✓" : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">{tx.installReady}</p>
          <p className={`text-sm font-semibold ${installReady ? "text-emerald-600" : "text-muted-foreground"}`}>
            {installReady ? "✓" : "—"}
          </p>
        </div>
      </div>

      {/* Stage transition buttons */}
      {canManage && !locked && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground me-1">{tx.moveTo}:</span>
          {nextStages.map((s) => (
            <Button
              key={s}
              type="button"
              variant={s === "cancelled" ? "outline" : "secondary"}
              size="sm"
              disabled={busy}
              onClick={() => void onMove(s)}
              className="rounded-lg h-8 text-xs"
            >
              {pickLabel(s, isRTL)}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {/* Checklists */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-xs">{tx.checklists}</h3>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </p>
        ) : checklists.length === 0 ? (
          <p className="text-xs text-muted-foreground">{tx.noChecklists}</p>
        ) : (
          <ul className="space-y-2">
            {checklists.map((ch) => {
              const items = itemsByList[ch.id] ?? [];
              const done = items.filter((i) => i.completed).length;
              const pct =
                items.length === 0 ? 0 : Math.round((done / items.length) * 100);
              const isClosed = ch.status !== "open";
              const canTickHere =
                !locked &&
                !isClosed &&
                (canManage || ch.assigned_to_user_id === user?.id);
              return (
                <li
                  key={ch.id}
                  className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate" dir="auto">
                        {ch.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ch.checklist_type}
                        {ch.sector_key ? ` · ${ch.sector_key}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] tech-content">
                        {pct}%
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ch.status === "completed"
                            ? "text-emerald-600 border-emerald-500/40"
                            : ""
                        }`}
                      >
                        {ch.status}
                      </Badge>
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-start gap-2">
                          <button
                            type="button"
                            disabled={!canTickHere}
                            onClick={() => void onToggleItem(it)}
                            aria-pressed={it.completed}
                            className="mt-0.5 disabled:opacity-50"
                          >
                            {it.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <span
                            className={`text-xs ${
                              it.completed
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }`}
                            dir="auto"
                          >
                            {it.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canManage && !locked && !isClosed && items.length > 0 && done === items.length && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[11px] rounded-lg"
                        onClick={() => void onCompleteChecklist(ch)}
                      >
                        {tx.markComplete}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Add checklist composer */}
        {canManage && !locked && (
          <div className="rounded-xl border border-dashed border-border/60 p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={tx.title}
                dir="auto"
                className="h-9 text-xs rounded-lg"
                aria-label={tx.title}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as WorkOrderChecklistType)}
                className="h-9 text-xs rounded-lg border border-border bg-background px-2"
                aria-label={tx.type}
              >
                {WORK_ORDER_CHECKLIST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={newSector}
                onChange={(e) =>
                  setNewSector(e.target.value as WorkOrderChecklistSectorKey)
                }
                className="h-9 text-xs rounded-lg border border-border bg-background px-2"
                aria-label={tx.sector}
              >
                {WORK_ORDER_CHECKLIST_SECTOR_KEYS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg gap-1"
                disabled={busy || !newTitle.trim()}
                onClick={() => void onCreateChecklist()}
              >
                <Plus className="w-3.5 h-3.5" />
                {tx.addChecklist}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent transition history */}
      {events.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs mb-1.5">{tx.timeline}</h3>
          <ol className="space-y-1">
            {events.slice(-6).reverse().map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
              >
                <span dir="auto">
                  {ev.from_stage ? pickLabel(ev.from_stage, isRTL) : "—"} →{" "}
                  {pickLabel(ev.to_stage, isRTL)}
                </span>
                <time className="tech-content">
                  {new Date(ev.created_at).toLocaleString(isRTL ? "ar-SA" : "en-US", {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}