import { useMemo } from "react";
import { AlertTriangle, Clock, CheckCircle2, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  summariseWorkOrderSla,
  type WorkOrderSlaSummary,
} from "@/modules/workOrders/lib/sla";
import type { WorkOrderRow } from "@/modules/workOrders/types";

interface Props {
  orders: ReadonlyArray<WorkOrderRow>;
  isRTL: boolean;
  className?: string;
  onSelectBucket?: (bucket: "overdue" | "due_soon" | "on_track" | "completed") => void;
}

/**
 * BUSINESS-WORKFLOW-3 — Display-only SLA summary cards for the Work Orders
 * dashboard. Pure render — operates on the already-fetched orders list.
 * No realtime, no fetching, no notifications.
 */
export function WorkOrderSlaSummaryCards({
  orders, isRTL, className, onSelectBucket,
}: Props) {
  const summary: WorkOrderSlaSummary = useMemo(
    () => summariseWorkOrderSla(orders),
    [orders],
  );

  const items: Array<{
    key: "overdue" | "due_soon" | "on_track" | "completed";
    value: number;
    label_ar: string;
    label_en: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }> = [
    {
      key: "overdue",
      value: summary.overdue,
      label_ar: "متأخرة",
      label_en: "Overdue",
      icon: AlertTriangle,
      tone: "text-destructive",
    },
    {
      key: "due_soon",
      value: summary.dueSoon,
      label_ar: "قريبة الاستحقاق",
      label_en: "Due soon",
      icon: Clock,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "on_track",
      value: summary.onTrack,
      label_ar: "في الموعد",
      label_en: "On track",
      icon: Activity,
      tone: "text-primary",
    },
    {
      key: "completed",
      value: summary.completed,
      label_ar: "مكتملة",
      label_en: "Completed",
      icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section
      aria-label={isRTL ? "ملخص الاستحقاقات" : "SLA summary"}
      className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}
      data-testid="wo-sla-summary"
    >
      {items.map(({ key, value, label_ar, label_en, icon: Icon, tone }) => {
        const Tag = onSelectBucket ? "button" : "div";
        return (
          <Card key={key} className="rounded-xl border-border/60 hover-lift">
            <CardContent className="p-3">
              <Tag
                type={onSelectBucket ? "button" : undefined}
                onClick={onSelectBucket ? () => onSelectBucket(key) : undefined}
                aria-label={isRTL ? label_ar : label_en}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg",
                  onSelectBucket && "text-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {isRTL ? label_ar : label_en}
                  </p>
                  <p className="text-xl font-semibold tech-content">{value}</p>
                </div>
                <Icon className={cn("w-5 h-5 shrink-0", tone)} />
              </Tag>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

export default WorkOrderSlaSummaryCards;