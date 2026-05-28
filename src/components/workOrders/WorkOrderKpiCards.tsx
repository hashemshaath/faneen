import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList, AlertTriangle, CalendarClock, UserX, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkOrderKpis } from "@/modules/workOrders";

interface Props {
  kpis: WorkOrderKpis;
  isRTL: boolean;
}

interface Tile {
  key: string;
  label: string;
  value: number;
  icon: typeof ClipboardList;
  tone: string;
}

export function WorkOrderKpiCards({ kpis, isRTL }: Props) {
  const tiles: Tile[] = [
    { key: "open",       label: isRTL ? "مفتوحة"        : "Open",            value: kpis.openCount,         icon: ClipboardList, tone: "bg-info/10 text-info" },
    { key: "overdue",    label: isRTL ? "متأخرة"        : "Overdue",         value: kpis.overdueCount,      icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
    { key: "dueWeek",    label: isRTL ? "تستحق هذا الأسبوع" : "Due this week",   value: kpis.dueThisWeekCount,  icon: CalendarClock, tone: "bg-warning/10 text-warning" },
    { key: "unassigned", label: isRTL ? "بدون مُسنَد"    : "Unassigned",      value: kpis.unassignedCount,   icon: UserX,         tone: "bg-muted text-muted-foreground" },
    { key: "completed",  label: isRTL ? "مكتملة"        : "Completed",       value: kpis.completedCount,    icon: CheckCircle2,  tone: "bg-success/10 text-success" },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3"
      aria-label={isRTL ? "ملخص أوامر العمل" : "Work orders summary"}
    >
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Card key={t.key} className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    t.tone,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold tech-content leading-tight">
                    {t.value.toLocaleString(isRTL ? "ar-SA" : "en-US")}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                    {t.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default WorkOrderKpiCards;