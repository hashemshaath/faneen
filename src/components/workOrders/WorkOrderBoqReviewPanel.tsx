/**
 * WORK ORDER BOQ REVIEW FLOW — PHASE 3
 *
 * Display-only review surface around the existing BOQ status field
 * ("draft" | "finalized"). Provider/admin can "send for review" which
 * maps to the existing safe `finalizeBoq` service (locks the draft, no
 * invoice / payment / warranty / handover). Client view is strictly
 * read-only — no fake action buttons.
 *
 * Hard constraints — read the Phase 3 brief for the full ban list.
 *  - No billing surfaces.
 *  - No contract or WO lifecycle mutation.
 *  - No privileged keys, no direct table writes from this component.
 *  - No DB / RLS / RPC / migration changes in this phase.
 */
import { useEffect, useState } from "react";
import { FileCheck2, Send, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import {
  listWorkOrderBoqs,
  finalizeBoq,
  type WorkOrderBoqRow,
} from "@/modules/workOrders";
import { getCurrentUser } from "@/modules/identity/services/session";

interface Props {
  workOrderId: string;
  canManage: boolean;
}

type ReviewState = "draft" | "submitted";

function toReviewState(status: WorkOrderBoqRow["status"]): ReviewState {
  return status === "finalized" ? "submitted" : "draft";
}

export function WorkOrderBoqReviewPanel({ workOrderId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const [boqs, setBoqs] = useState<WorkOrderBoqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
  const state: ReviewState | null = latest ? toReviewState(latest.status) : null;

  const tx = {
    heading: isRTL ? "مراجعة مسودة BOQ" : "BOQ review",
    none: isRTL
      ? "لم يتم تجهيز مسودة BOQ بعد."
      : "No BOQ draft has been prepared yet.",
    draft: isRTL ? "مسودة" : "Draft",
    submitted: isRTL ? "مرسلة للمراجعة" : "Submitted for review",
    needsEdit: isRTL ? "بحاجة تعديل" : "Needs changes",
    accepted: isRTL ? "مقبولة للمراجعة" : "Accepted for review",
    sendBtn: isRTL ? "إرسال BOQ للمراجعة" : "Send BOQ for review",
    awaiting: isRTL
      ? "بانتظار مراجعة الطرف الثاني"
      : "Awaiting the other party's review",
    clientInfo: isRTL
      ? "يمكن مراجعة البنود والتواصل مع الجهة المنفذة عند الحاجة."
      : "You can review the items and contact the executing party when needed.",
    sending: isRTL ? "جارٍ الإرسال..." : "Sending...",
    sent: isRTL ? "تم إرسال المسودة للمراجعة" : "Draft sent for review",
    sendErr: isRTL ? "تعذر إرسال المسودة" : "Could not send the draft",
  };

  const onSend = async () => {
    if (!latest || latest.status !== "draft") return;
    setSending(true);
    const { data: me } = await getCurrentUser();
    if (!me?.user?.id) {
      setSending(false);
      toast.error(tx.sendErr);
      return;
    }
    const { error } = await finalizeBoq({ boq_id: latest.id, actor_id: me.user.id });
    setSending(false);
    if (error) {
      toast.error(tx.sendErr);
      return;
    }
    toast.success(tx.sent);
    void load();
  };

  const badgeFor = (s: ReviewState) => {
    if (s === "submitted") {
      return (
        <Badge variant="outline" className="bg-success/15 text-success border-success/30">
          {tx.submitted}
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
      ) : !latest ? (
        <p className="text-xs text-muted-foreground" dir="auto">{tx.none}</p>
      ) : canManage ? (
        <div className="space-y-2">
          {state === "draft" ? (
            <Button
              size="sm"
              variant="default"
              onClick={onSend}
              disabled={sending}
              data-testid="wo-boq-send-for-review"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
              ) : (
                <Send className="w-3.5 h-3.5 me-1" />
              )}
              {sending ? tx.sending : tx.sendBtn}
            </Button>
          ) : (
            <div
              className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground"
              data-testid="wo-boq-awaiting"
            >
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span dir="auto">{tx.awaiting}</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground"
          data-testid="wo-boq-client-readonly"
        >
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span dir="auto">{tx.clientInfo}</span>
        </div>
      )}
    </div>
  );
}

export default WorkOrderBoqReviewPanel;