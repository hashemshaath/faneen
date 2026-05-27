import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, History, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listBusinessActivityTimeline,
  type BusinessActivityEvent,
} from "@/modules/businesses/notes";

interface Props {
  businessId: string;
  /** Soft cap on events fetched. Defaults to 50. */
  limit?: number;
}

/** Format a single audit-log row into safe, human-readable text. */
function summarizeMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  const keys = Object.keys(metadata).filter((k) => {
    const v = metadata[k];
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
  });
  if (keys.length === 0) return "";
  return keys
    .slice(0, 3)
    .map((k) => `${k}: ${String(metadata[k]).slice(0, 60)}`)
    .join(" · ");
}

function formatDate(iso: string, isRTL: boolean): string {
  try {
    return new Date(iso).toLocaleString(isRTL ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function BusinessActivityTimelineCard({ businessId, limit = 50 }: Props) {
  const { isRTL } = useLanguage();
  const [events, setEvents] = useState<BusinessActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tx = useMemo(
    () => ({
      title: isRTL ? "سجل النشاط" : "Activity timeline",
      empty: isRTL ? "لا توجد أحداث بعد." : "No activity yet.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      err: isRTL ? "تعذّر تحميل السجل." : "Failed to load activity.",
      retry: isRTL ? "إعادة المحاولة" : "Retry",
    }),
    [isRTL],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listBusinessActivityTimeline({ businessId, limit });
    if (err) setError(tx.err);
    setEvents(data ?? []);
    setLoading(false);
  }, [businessId, limit, tx.err]);

  useEffect(() => {
    if (businessId) void reload();
  }, [businessId, reload]);

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
      aria-label={tx.title}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          <h2 className="font-heading font-semibold text-base text-foreground">{tx.title}</h2>
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
        <div className="flex items-center justify-between gap-2 text-sm text-destructive">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <Button onClick={() => void reload()} size="sm" variant="outline" className="rounded-xl h-8">
            {tx.retry}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {tx.loading}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx.empty}</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => {
            const meta = summarizeMetadata(e.metadata);
            return (
              <li
                key={e.id}
                className="rounded-xl border border-border/40 bg-background/40 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate" dir="auto">
                      {e.action}
                      <span className="text-muted-foreground font-normal ms-2 text-xs">
                        · {e.entity_type}
                      </span>
                    </p>
                    {meta && (
                      <p className="mt-1 text-xs text-muted-foreground break-words" dir="auto">
                        {meta}
                      </p>
                    )}
                  </div>
                  <time className="text-[11px] text-muted-foreground tech-content shrink-0">
                    {formatDate(e.created_at, isRTL)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default BusinessActivityTimelineCard;