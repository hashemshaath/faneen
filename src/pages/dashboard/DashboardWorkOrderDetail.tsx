import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  ListChecks,
  ClipboardList,
  Calendar,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ReferenceTag } from "@/components/reference/ReferenceTag";
import { ReferenceBadge } from "@/components/reference/ReferenceBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNoIndex } from "@/hooks/useNoIndex";
import { WorkOrderStatusBadge } from "@/components/workOrders/WorkOrderStatusBadge";
import { WorkOrderPriorityBadge } from "@/components/workOrders/WorkOrderPriorityBadge";
import { WorkOrderSourceBadge } from "@/components/workOrders/WorkOrderSourceBadge";
import { WorkOrderAssigneeChip } from "@/components/workOrders/WorkOrderAssigneeChip";
import { WorkOrderActivityCard } from "@/components/workOrders/WorkOrderActivityCard";
import {
  getWorkOrderByRefId,
  listWorkOrderStages,
  listWorkOrderTasks,
  listWorkOrderComments,
  addWorkOrderComment,
  WORK_ORDER_STAGE_STATUS_LABELS,
  WORK_ORDER_STAGE_TONE,
  WORK_ORDER_TASK_STATUS_LABELS,
  WORK_ORDER_TASK_TONE,
  pickBi,
  type WorkOrderRow,
  type WorkOrderStageRow,
  type WorkOrderTaskRow,
  type WorkOrderCommentRow,
} from "@/modules/workOrders";

/**
 * BUSINESS-CORE-5 — Work Order detail page.
 *
 * Resolved by `ref_id` (e.g. WO-1000007). Read-mostly mobile-first
 * operational surface. No realtime / no automation / no notifications.
 */
export default function DashboardWorkOrderDetail() {
  useNoIndex();
  const { refId = "" } = useParams<{ refId: string }>();
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  usePageMeta({
    title: isRTL ? `أمر عمل ${refId}` : `Work Order ${refId}`,
    description: isRTL ? "تفاصيل أمر العمل" : "Work order details",
    noindex: true,
  });

  const [wo, setWo] = useState<WorkOrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<WorkOrderStageRow[]>([]);
  const [tasks, setTasks] = useState<WorkOrderTaskRow[]>([]);
  const [comments, setComments] = useState<WorkOrderCommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const tx = useMemo(
    () => ({
      back: isRTL ? "أوامر العمل" : "Work Orders",
      notFound: isRTL
        ? "لم يتم العثور على أمر العمل أو لا تملك صلاحية الوصول."
        : "Work order not found or you don't have access.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      stages: isRTL ? "المراحل" : "Stages",
      tasks: isRTL ? "المهام" : "Tasks",
      comments: isRTL ? "التعليقات" : "Comments",
      source: isRTL ? "المصدر" : "Source",
      due: isRTL ? "موعد الاستحقاق" : "Due",
      noStages: isRTL ? "لا توجد مراحل." : "No stages.",
      noTasks: isRTL ? "لا توجد مهام." : "No tasks.",
      noComments: isRTL ? "لا توجد تعليقات بعد." : "No comments yet.",
      addComment: isRTL ? "أضف تعليقًا…" : "Add a comment…",
      send: isRTL ? "إرسال" : "Send",
      errLoad: isRTL ? "تعذّر تحميل أمر العمل." : "Failed to load work order.",
      errSend: isRTL ? "تعذّر إرسال التعليق." : "Failed to send comment.",
    }),
    [isRTL],
  );

  const load = useCallback(async () => {
    if (!refId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await getWorkOrderByRefId(refId);
    if (err) { setError(tx.errLoad); setLoading(false); return; }
    setWo(data);
    if (data) {
      const [s, t, c] = await Promise.all([
        listWorkOrderStages({ workOrderId: data.id }),
        listWorkOrderTasks({ workOrderId: data.id }),
        listWorkOrderComments({ workOrderId: data.id }),
      ]);
      setStages(s.data ?? []);
      setTasks(t.data ?? []);
      setComments(c.data ?? []);
    }
    setLoading(false);
  }, [refId, tx.errLoad]);

  useEffect(() => { void load(); }, [load]);

  const onSend = useCallback(async () => {
    if (!wo || !user || !draft.trim()) return;
    setSending(true);
    const { data, error: err } = await addWorkOrderComment({
      work_order_id: wo.id,
      business_id: wo.business_id,
      author_user_id: user.id,
      body: draft,
    });
    setSending(false);
    if (err || !data) { setError(tx.errSend); return; }
    setComments((prev) => [...prev, data]);
    setDraft("");
  }, [draft, user, wo, tx.errSend]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  function fmt(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(isRTL ? "ar-SA" : "en-US", {
        month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="container max-w-5xl py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="rounded-lg">
          <Link to="/dashboard/work-orders" aria-label={tx.back}>
            <BackIcon className="w-4 h-4 me-1" /> {tx.back}
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
        </div>
      ) : !wo ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-muted-foreground inline-block me-2" />
          {tx.notFound}
        </div>
      ) : (
        <>
          <header className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ReferenceTag refId={wo.ref_id} isRTL={isRTL} />
              <div className="flex flex-wrap items-center gap-1.5">
                <WorkOrderStatusBadge status={wo.status as never} isRTL={isRTL} />
                <WorkOrderPriorityBadge priority={wo.priority as never} isRTL={isRTL} />
                <WorkOrderSourceBadge sourceType={wo.source_type} isRTL={isRTL} />
                <WorkOrderAssigneeChip
                  assigneeUserId={wo.owner_user_id}
                  isRTL={isRTL}
                />
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground" dir="auto">
              {wo.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {wo.customer_name && (
                <span dir="auto" className="truncate max-w-[220px]">{wo.customer_name}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="tech-content">{tx.due}: {fmt(wo.due_at)}</span>
              </span>
            </div>
          </header>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3" aria-label={tx.stages}>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-accent" />
                <h2 className="font-semibold text-sm">{tx.stages}</h2>
              </div>
              {stages.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx.noStages}</p>
              ) : (
                <ol className="space-y-1.5">
                  {stages.map((st) => (
                    <li key={st.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 p-2.5">
                      <span className="text-xs font-medium text-foreground truncate" dir="auto">
                        {isRTL ? st.title_ar : st.title_en}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${WORK_ORDER_STAGE_TONE[st.status as keyof typeof WORK_ORDER_STAGE_TONE] ?? ""}`}>
                        {pickBi(WORK_ORDER_STAGE_STATUS_LABELS[st.status as keyof typeof WORK_ORDER_STAGE_STATUS_LABELS], isRTL)}
                      </Badge>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3" aria-label={tx.tasks}>
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-accent" />
                <h2 className="font-semibold text-sm">{tx.tasks}</h2>
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx.noTasks}</p>
              ) : (
                <ul className="space-y-1.5">
                  {tasks.map((t) => (
                    <li key={t.id} className="rounded-xl border border-border/40 bg-background/40 p-2.5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate" dir="auto">
                          {t.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${WORK_ORDER_TASK_TONE[t.status as keyof typeof WORK_ORDER_TASK_TONE] ?? ""}`}>
                          {pickBi(WORK_ORDER_TASK_STATUS_LABELS[t.status as keyof typeof WORK_ORDER_TASK_STATUS_LABELS], isRTL)}
                        </Badge>
                      </div>
                      <ReferenceBadge refId={t.ref_id} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3" aria-label={tx.comments}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <h2 className="font-semibold text-sm">{tx.comments}</h2>
            </div>
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">{tx.noComments}</p>
            ) : (
              <ol className="space-y-2 max-h-72 overflow-y-auto pe-1">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border/40 bg-background/40 p-2.5">
                    <p className="text-xs text-foreground whitespace-pre-wrap" dir="auto">{c.body}</p>
                    <time className="text-[10px] text-muted-foreground tech-content">{fmt(c.created_at)}</time>
                  </li>
                ))}
              </ol>
            )}
            {user && (
              <div className="space-y-2">
                <Textarea
                  dir="auto"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={tx.addComment}
                  aria-label={tx.addComment}
                  className="rounded-xl min-h-[64px]"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void onSend()}
                    disabled={sending || !draft.trim()}
                  >
                    {sending
                      ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                      : <Send className="w-3.5 h-3.5 me-1" />}
                    {tx.send}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <WorkOrderActivityCard businessId={wo.business_id} isRTL={isRTL} limit={50} />
        </>
      )}
    </main>
  );
}