/**
 * WORK ORDER BOQ REVIEW TIMELINE — PHASE 5
 *
 * Read-only timeline of BOQ review FSM transitions for a single work order.
 * Reads from `business_audit_log` via the central
 * `listWorkOrderBoqReviewTimeline` service. No direct table writes, no
 * lifecycle/billing surfaces, no privileged keys.
 */
import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderBoqReviewTimeline,
  type WorkOrderBoqReviewAuditAction,
  type WorkOrderBoqReviewTimelineEvent,
} from "@/modules/workOrders";

interface Props {
  workOrderId: string;
}

const ACTION_COPY: Record<
  WorkOrderBoqReviewAuditAction,
  { ar: string; en: string }
> = {
  "work_order.boq_review_submitted": {
    ar: "تم إرسال BOQ للمراجعة",
    en: "BOQ sent for review",
  },
  "work_order.boq_review_changes_requested": {
    ar: "طلب تعديل BOQ",
    en: "BOQ changes requested",
  },
  "work_order.boq_review_accepted": {
    ar: "تم قبول مراجعة BOQ",
    en: "BOQ review accepted",
  },
};

function formatStatus(value: unknown, isRTL: boolean): string {
  if (typeof value !== "string") return "—";
  const map: Record<string, { ar: string; en: string }> = {
    draft: { ar: "مسودة", en: "Draft" },
    submitted: { ar: "مرسلة", en: "Submitted" },
    needs_changes: { ar: "بحاجة تعديل", en: "Needs changes" },
    accepted: { ar: "مقبولة", en: "Accepted" },
  };
  const entry = map[value];
  if (!entry) return value;
  return isRTL ? entry.ar : entry.en;
}

export function WorkOrderBoqReviewTimeline({ workOrderId }: Props) {
  const { isRTL } = useLanguage();
  const [events, setEvents] = useState<WorkOrderBoqReviewTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listWorkOrderBoqReviewTimeline({ workOrderId }).then(({ data }) => {
      if (cancelled) return;
      setEvents(data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [workOrderId]);

  const tx = {
    title: isRTL ? "سجل مراجعة BOQ" : "BOQ review timeline",
    empty: isRTL
      ? "لا توجد أحداث مراجعة بعد."
      : "No review events yet.",
    loading: isRTL ? "جارٍ التحميل…" : "Loading…",
    from: isRTL ? "من" : "from",
    to: isRTL ? "إلى" : "to",
  };

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString(
        isRTL ? "ar-SA-u-nu-latn" : "en-US",
        {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    } catch {
      return iso;
    }
  }

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-3"
      aria-label={tx.title}
      data-testid="wo-boq-review-timeline"
    >
      <header className="flex items-center gap-2">
        <History className="w-4 h-4 text-accent" />
        <h2 className="font-semibold text-sm">{tx.title}</h2>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {tx.loading}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tx.empty}</p>
      ) : (
        <ol className="space-y-1.5 max-h-[360px] overflow-y-auto pe-1">
          {events.map((e) => {
            const copy = ACTION_COPY[e.action];
            const label = copy ? (isRTL ? copy.ar : copy.en) : e.action;
            const meta = (e.metadata ?? {}) as Record<string, unknown>;
            const fromStatus = formatStatus(meta.from_review_status, isRTL);
            const toStatus = formatStatus(meta.to_review_status, isRTL);
            return (
              <li
                key={e.id}
                className="rounded-xl border border-border/40 bg-background/40 p-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground" dir="auto">
                    {label}
                  </p>
                  <time className="text-[10px] text-muted-foreground tech-content shrink-0">
                    {formatDate(e.created_at)}
                  </time>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1" dir="auto">
                  {tx.from} <span className="font-medium">{fromStatus}</span>{" "}
                  {tx.to} <span className="font-medium">{toStatus}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default WorkOrderBoqReviewTimeline;