import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertCircle, ArrowUpRight, CheckCircle2, FilePlus,
  History, Loader2, MessageSquare, RefreshCw, GitBranch, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferenceBadge } from "@/components/reference/ReferenceBadge";
import {
  listBusinessActivityTimeline,
  type BusinessActivityEvent,
} from "@/modules/businesses/notes";
import {
  buildOperationsFeed,
  type OperationsFeedIconKey,
  type OperationsFeedTone,
  type OperationsFeedDayGroup,
} from "./normalizeOperationsFeed";

interface Props {
  businessId: string;
  isRTL: boolean;
  limit?: number;
  /**
   * Optional inbound events. When provided the component skips its own
   * fetch — useful for tests and embeds. Manual refresh button is hidden
   * because the source of truth is external.
   */
  initialEvents?: BusinessActivityEvent[];
}

/**
 * BUSINESS-CORE-12 — Unified Operations Feed.
 *
 * Read-only, manual-refresh-only feed that consolidates operational
 * activity for a business. Uses the shared activity wrapper (RLS-bound)
 * and the pure normalizer in `./normalizeOperationsFeed`.
 *
 * No realtime, no cron, no notifications, no automation.
 */
export function UnifiedOperationsFeed({
  businessId,
  isRTL,
  limit = 150,
  initialEvents,
}: Props) {
  const [events, setEvents] = useState<BusinessActivityEvent[]>(
    initialEvents ?? [],
  );
  const [loading, setLoading] = useState(!initialEvents);
  const [error, setError] = useState<string | null>(null);

  const tx = useMemo(
    () => ({
      title: isRTL ? "موجز العمليات الموحّد" : "Unified operations feed",
      subtitle: isRTL
        ? "نشاط أوامر العمل والمصادر المرتبطة."
        : "Activity across work orders and linked sources.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      empty: isRTL ? "لا يوجد نشاط بعد." : "No activity yet.",
      err: isRTL ? "تعذّر تحميل النشاط." : "Failed to load activity.",
      retry: isRTL ? "إعادة المحاولة" : "Retry",
      refresh: isRTL ? "تحديث" : "Refresh",
      source: isRTL ? "المصدر" : "Source",
    }),
    [isRTL],
  );

  const reload = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await listBusinessActivityTimeline({
      businessId,
      limit,
    });
    if (err) setError(tx.err);
    setEvents(data ?? []);
    setLoading(false);
  }, [businessId, limit, tx.err]);

  useEffect(() => {
    if (initialEvents) return;
    if (businessId) void reload();
  }, [businessId, reload, initialEvents]);

  const groups: OperationsFeedDayGroup[] = useMemo(
    () => buildOperationsFeed(events),
    [events],
  );

  function formatDay(day: string): string {
    try {
      const d = new Date(`${day}T00:00:00`);
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
        year: "numeric", month: "short", day: "2-digit", weekday: "short",
      });
    } catch {
      return day;
    }
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <section
      dir={isRTL ? "rtl" : "ltr"}
      className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-3"
      aria-label={tx.title}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" aria-hidden="true" />
            {tx.title}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{tx.subtitle}</p>
        </div>
        {!initialEvents && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => void reload()}
            aria-label={tx.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </header>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </span>
          <Button onClick={() => void reload()} size="sm" variant="outline" className="rounded-xl h-7">
            {tx.retry}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {tx.loading}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tx.empty}</p>
      ) : (
        <ol className="space-y-4 max-h-[640px] overflow-y-auto pe-1">
          {groups.map((group) => (
            <li key={group.day} className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground tech-content sticky top-0 bg-card/95 backdrop-blur py-1">
                {formatDay(group.day)}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((it) => {
                  const Icon = iconFor(it.icon);
                  return (
                    <li
                      key={it.id}
                      className="rounded-xl border border-border/40 bg-background/40 p-2.5 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${toneClasses(it.tone)}`}
                          aria-hidden="true"
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-foreground" dir="auto">
                              {isRTL ? it.label.ar : it.label.en}
                            </p>
                            <time className="text-[10px] text-muted-foreground tech-content shrink-0">
                              {formatTime(it.created_at)}
                            </time>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {it.primaryRef && (
                              <Link
                                to={`/r/${it.primaryRef}`}
                                className="hover:opacity-80 transition-opacity"
                                aria-label={it.primaryRef}
                              >
                                <ReferenceBadge refId={it.primaryRef} />
                              </Link>
                            )}
                            {it.sourceRef && (
                              <Link
                                to={`/r/${it.sourceRef}`}
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={`${tx.source}: ${it.sourceRef}`}
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <ReferenceBadge refId={it.sourceRef} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function iconFor(k: OperationsFeedIconKey) {
  switch (k) {
    case "created":  return Sparkles;
    case "updated":  return History;
    case "stage":    return GitBranch;
    case "task":     return CheckCircle2;
    case "comment":  return MessageSquare;
    case "source":   return FilePlus;
    default:         return Activity;
  }
}

function toneClasses(t: OperationsFeedTone): string {
  switch (t) {
    case "success": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "warning": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "info":    return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
    case "accent":  return "bg-accent/10 text-accent";
    default:        return "bg-muted text-muted-foreground";
  }
}

export default UnifiedOperationsFeed;