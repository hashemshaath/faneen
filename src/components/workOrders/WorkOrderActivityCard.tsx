import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, History, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listBusinessActivityTimeline,
  type BusinessActivityEvent,
} from "@/modules/businesses/notes";

interface Props {
  businessId: string;
  isRTL: boolean;
  limit?: number;
}

/**
 * Work-order-scoped activity card. Reads via the shared timeline service
 * (which queries business_audit_log via RLS) and filters client-side to
 * actions starting with `work_order.`. Read-only — no realtime, no auto
 * refresh, manual reload only.
 */
export function WorkOrderActivityCard({ businessId, isRTL, limit = 100 }: Props) {
  const [events, setEvents] = useState<BusinessActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tx = useMemo(
    () => ({
      title: isRTL ? "نشاط أوامر العمل" : "Work order activity",
      empty: isRTL ? "لا يوجد نشاط بعد." : "No activity yet.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      err: isRTL ? "تعذّر تحميل النشاط." : "Failed to load activity.",
      retry: isRTL ? "إعادة المحاولة" : "Retry",
    }),
    [isRTL],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listBusinessActivityTimeline({ businessId, limit });
    if (err) setError(tx.err);
    const filtered = (data ?? []).filter(
      (e) => typeof e.action === "string" && e.action.startsWith("work_order."),
    );
    setEvents(filtered);
    setLoading(false);
  }, [businessId, limit, tx.err]);

  useEffect(() => {
    if (businessId) void reload();
  }, [businessId, reload]);

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString(isRTL ? "ar-SA" : "en-US", {
        month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-3"
      aria-label={tx.title}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          <h2 className="font-heading font-semibold text-sm sm:text-base text-foreground">
            {tx.title}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => void reload()}
          aria-label={tx.retry}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {tx.loading}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tx.empty}</p>
      ) : (
        <ol className="space-y-1.5 max-h-[480px] overflow-y-auto pe-1">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-border/40 bg-background/40 p-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground truncate" dir="auto">
                  {e.action}
                </p>
                <time className="text-[10px] text-muted-foreground tech-content shrink-0">
                  {formatDate(e.created_at)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default WorkOrderActivityCard;