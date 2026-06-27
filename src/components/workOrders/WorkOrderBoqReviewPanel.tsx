/**
 * WORK ORDER BOQ REVIEW STATUS — PHASE 4
 *
 * Independent review lifecycle on top of `work_order_boqs.review_status`
 * (draft / submitted / needs_changes / accepted). Provider/admin submits and
 * resubmits drafts; the client can request changes or accept the review.
 * No billing / payment / warranty / handover surfaces — review only.
 *
 * Hard constraints — read the Phase 4 brief for the full ban list.
 *  - No billing surfaces.
 *  - No contract or WO lifecycle mutation.
 *  - No privileged keys, no direct table writes from this component.
 *  - No RLS changes. Transitions go through the central services.
 */
import { useEffect, useState } from "react";
import { FileCheck2, Send, Loader2, Info, ThumbsUp, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import {
  listWorkOrderBoqs,
  submitWorkOrderBoqForReview,
  requestWorkOrderBoqChanges,
  acceptWorkOrderBoqReview,
  type WorkOrderBoqRow,
  type WorkOrderBoqReviewStatus,
} from "@/modules/workOrders";
import { getCurrentUser } from "@/modules/identity/services/session";

interface Props {
  workOrderId: string;
  canManage: boolean;
}

export function WorkOrderBoqReviewPanel({ workOrderId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const [boqs, setBoqs] = useState<WorkOrderBoqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await listWorkOrderBoqs({ workOrderId });
    setBoqs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  const latest = boqs[0] ?? null;
  const state: WorkOrderBoqReviewStatus | null = latest?.review_status ?? null;

  const tx = {
    heading: isRTL ? "مراجعة مسودة BOQ" : "BOQ review",
    none: isRTL
      ? "لم يتم تجهيز مسودة BOQ بعد."
      : "No BOQ draft has been prepared yet.",
    draft: isRTL ? "مسودة" : "Draft",
    submitted: isRTL ? "مرسلة للمراجعة" : "Submitted for review",
    needsChanges: isRTL ? "بحاجة تعديل" : "Needs changes",
    accepted: isRTL ? "مقبولة للمراجعة" : "Accepted for review",
    sendBtn: isRTL ? "إرسال BOQ للمراجعة" : "Send BOQ for review",
    requestChangesBtn: isRTL ? "طلب تعديل" : "Request changes",
    acceptBtn: isRTL ? "قبول المراجعة" : "Accept review",
    awaiting: isRTL
      ? "بانتظار مراجعة الطرف الثاني"
      : "Awaiting the other party's review",
    clientReadOnlyDraft: isRTL
      ? "لم يتم إرسال BOQ للمراجعة بعد."
      : "BOQ has not been sent for review yet.",
    clientRequestedNotice: isRTL
      ? "تم إرسال طلب تعديل إلى الجهة المنفذة."
      : "A change request has been sent to the executing party.",
    acceptedNotice: isRTL ? "تم قبول مراجعة BOQ." : "BOQ review accepted.",
    working: isRTL ? "جارٍ التنفيذ..." : "Working...",
    sentOk: isRTL ? "تم إرسال المسودة للمراجعة" : "Draft sent for review",
    requestedOk: isRTL ? "تم إرسال طلب التعديل" : "Change request sent",
    acceptedOk: isRTL ? "تم قبول المراجعة" : "Review accepted",
    genericErr: isRTL ? "تعذر تنفيذ الإجراء" : "Could not perform the action",
  };

  type Action = "submit" | "request_changes" | "accept";

  const runAction = async (action: Action) => {
    if (!latest) return;
    setBusy(true);
    const { data: me } = await getCurrentUser();
    const actorId = me?.user?.id;
    if (!actorId) {
      setBusy(false);
      toast.error(tx.genericErr);
      return;
    }
    const args = { boq_id: latest.id, actor_id: actorId };
    const res =
      action === "submit"
        ? await submitWorkOrderBoqForReview(args)
        : action === "request_changes"
          ? await requestWorkOrderBoqChanges(args)
          : await acceptWorkOrderBoqReview(args);
    setBusy(false);
    if (res.error) {
      toast.error(tx.genericErr);
      return;
    }
    toast.success(
      action === "submit"
        ? tx.sentOk
        : action === "request_changes"
          ? tx.requestedOk
          : tx.acceptedOk,
    );
    void load();
  };

  const badgeFor = (s: WorkOrderBoqReviewStatus) => {
    if (s === "accepted") {
      return (
        <Badge variant="outline" className="bg-success/15 text-success border-success/30">
          {tx.accepted}
        </Badge>
      );
    }
    if (s === "submitted") {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          {tx.submitted}
        </Badge>
      );
    }
    if (s === "needs_changes") {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/30"
        >
          {tx.needsChanges}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
      >
        {tx.draft}
      </Badge>
    );
  };

  const renderProvider = (s: WorkOrderBoqReviewStatus) => {
    if (s === "draft" || s === "needs_changes") {
      return (
        <Button
          size="sm"
          variant="default"
          onClick={() => runAction("submit")}
          disabled={busy}
          data-testid="wo-boq-send-for-review"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
          ) : (
            <Send className="w-3.5 h-3.5 me-1" />
          )}
          {busy ? tx.working : tx.sendBtn}
        </Button>
      );
    }
    if (s === "submitted") {
      return (
        <div
          className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground"
          data-testid="wo-boq-awaiting"
        >
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span dir="auto">{tx.awaiting}</span>
        </div>
      );
    }
    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-2.5 text-xs text-success"
        data-testid="wo-boq-accepted-notice"
      >
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span dir="auto">{tx.acceptedNotice}</span>
      </div>
    );
  };

  const renderClient = (s: WorkOrderBoqReviewStatus) => {
    if (s === "submitted") {
      return (
        <div className="flex flex-wrap gap-2" data-testid="wo-boq-client-actions">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction("request_changes")}
            disabled={busy}
            data-testid="wo-boq-client-request-changes"
          >
            <Pencil className="w-3.5 h-3.5 me-1" />
            {tx.requestChangesBtn}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => runAction("accept")}
            disabled={busy}
            data-testid="wo-boq-client-accept"
          >
            <ThumbsUp className="w-3.5 h-3.5 me-1" />
            {tx.acceptBtn}
          </Button>
        </div>
      );
    }
    const text =
      s === "draft"
        ? tx.clientReadOnlyDraft
        : s === "needs_changes"
          ? tx.clientRequestedNotice
          : tx.acceptedNotice;
    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground"
        data-testid="wo-boq-client-readonly"
      >
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span dir="auto">{text}</span>
      </div>
    );
  };

  return (
    <div
      className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4 space-y-3"
      data-testid="wo-boq-review-panel"
    >
      <div className="flex items-center gap-2">
        <FileCheck2 className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm">{tx.heading}</h3>
        {state && <span className="ms-auto">{badgeFor(state)}</span>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {isRTL ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : !latest || !state ? (
        <p className="text-xs text-muted-foreground" dir="auto">{tx.none}</p>
      ) : canManage ? (
        <div className="space-y-2">{renderProvider(state)}</div>
      ) : (
        <div className="space-y-2">{renderClient(state)}</div>
      )}
    </div>
  );
}

export default WorkOrderBoqReviewPanel;