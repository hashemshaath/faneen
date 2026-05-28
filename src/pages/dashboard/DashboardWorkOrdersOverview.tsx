import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, ClipboardList, AlertCircle, ArrowUpRight, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReferenceBadge } from "@/components/reference/ReferenceBadge";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNoIndex } from "@/hooks/useNoIndex";
import {
  listWorkOrdersForBusiness,
  computeWorkOrderKpis,
  type WorkOrderRow,
  type WorkOrderStatus,
  type WorkOrderPriority,
} from "@/modules/workOrders";
import { WorkOrderKpiCards } from "@/components/workOrders/WorkOrderKpiCards";
import { WorkOrderStatusBadge } from "@/components/workOrders/WorkOrderStatusBadge";
import { WorkOrderPriorityBadge } from "@/components/workOrders/WorkOrderPriorityBadge";
import { WorkOrderSourceBadge } from "@/components/workOrders/WorkOrderSourceBadge";
import { WorkOrderAssigneeChip } from "@/components/workOrders/WorkOrderAssigneeChip";
import { WorkOrderActivityCard } from "@/components/workOrders/WorkOrderActivityCard";

/**
 * BUSINESS-CORE-4 — Unified Work Orders operations dashboard.
 * Read-only aggregation surface: KPI tiles + recent open list + activity.
 * No realtime, no scheduled jobs, no automation.
 */
export default function DashboardWorkOrdersOverview() {
  useNoIndex();
  const workspace = useActiveWorkspace();
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? "نظرة عامة على العمليات" : "Operations overview",
    description: isRTL
      ? "نظرة موحّدة على أوامر العمل والنشاط"
      : "Unified view of work orders and activity",
    noindex: true,
  });

  const businessId = workspace.active_entity_id;

  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tx = useMemo(
    () => ({
      title: isRTL ? "نظرة عامة على العمليات" : "Operations overview",
      subtitle: isRTL
        ? "ملخّص حيّ لأوامر العمل والمهام والنشاط لمنشأتك."
        : "Live summary of work orders, tasks and activity for your business.",
      noEntity: isRTL
        ? "اختر منشأة من شريط العمل للبدء."
        : "Pick a business from the workspace switcher to begin.",
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      retry: isRTL ? "إعادة المحاولة" : "Retry",
      errorLoad: isRTL ? "تعذّر تحميل البيانات." : "Failed to load data.",
      recent: isRTL ? "أحدث أوامر العمل المفتوحة" : "Recent open work orders",
      empty: isRTL ? "لا توجد أوامر عمل بعد." : "No work orders yet.",
      openBoard: isRTL ? "فتح لوحة أوامر العمل" : "Open work orders board",
      due: isRTL ? "تاريخ الاستحقاق" : "Due",
      noDue: isRTL ? "بدون موعد" : "No due date",
      assignee: isRTL ? "المسؤول" : "Owner",
    }),
    [isRTL],
  );

  const reload = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await listWorkOrdersForBusiness({
      businessId,
      limit: 200,
    });
    if (err) setError(tx.errorLoad);
    setOrders(data ?? []);
    setLoading(false);
  }, [businessId, tx.errorLoad]);

  useEffect(() => {
    if (businessId) void reload();
    else setLoading(false);
  }, [businessId, reload]);

  const kpis = useMemo(() => computeWorkOrderKpis(orders), [orders]);

  const recentOpen = useMemo(() => {
    const open = orders.filter((o) =>
      o.status === "draft" || o.status === "active" || o.status === "on_hold",
    );
    return open.slice(0, 8);
  }, [orders]);

  function formatDate(iso: string | null): string {
    if (!iso) return tx.noDue;
    try {
      return new Date(iso).toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
        year: "numeric", month: "short", day: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <DashboardLayout>
      <div dir={isRTL ? "rtl" : "ltr"} className="space-y-4 sm:space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-accent" aria-hidden="true" />
              {tx.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {tx.subtitle}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 w-full sm:w-auto">
            <Link to="/dashboard/work-orders">
              <ClipboardList className="w-3.5 h-3.5" />
              {tx.openBoard}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </header>

        {!businessId ? (
          <Card className="border-dashed border-2 border-border/60">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {tx.noEntity}
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            {tx.loading}
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </span>
                <Button onClick={() => void reload()} size="sm" variant="outline" className="rounded-xl h-8">
                  {tx.retry}
                </Button>
              </div>
            )}

            <WorkOrderKpiCards kpis={kpis} isRTL={isRTL} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <section className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-3">
                <header className="flex items-center justify-between gap-2">
                  <h2 className="font-heading font-semibold text-sm sm:text-base text-foreground">
                    {tx.recent}
                  </h2>
                </header>
                {recentOpen.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{tx.empty}</p>
                ) : (
                  <ul className="space-y-2">
                    {recentOpen.map((wo) => (
                      <li key={wo.id}>
                        <Link
                          to="/dashboard/work-orders"
                          className="block rounded-xl border border-border/40 bg-background/40 p-3 hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <ReferenceBadge refId={wo.ref_id} />
                                <WorkOrderStatusBadge status={wo.status as WorkOrderStatus} isRTL={isRTL} />
                                <WorkOrderPriorityBadge
                                  priority={(wo.priority ?? "medium") as WorkOrderPriority}
                                  isRTL={isRTL}
                                />
                                <WorkOrderSourceBadge
                                  sourceType={wo.source_type}
                                  isRTL={isRTL}
                                />
                              </div>
                              <p
                                className="mt-1.5 text-sm font-medium text-foreground truncate"
                                dir="auto"
                              >
                                {wo.title}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <WorkOrderAssigneeChip
                                  assigneeUserId={wo.owner_user_id}
                                  isRTL={isRTL}
                                />
                                <span className="text-[10px] text-muted-foreground tech-content">
                                  {tx.due}: {formatDate(wo.due_at)}
                                </span>
                              </div>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <WorkOrderActivityCard businessId={businessId} isRTL={isRTL} limit={100} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}