/**
 * WORK ORDER BOQ VISIBILITY + CONTRACT LINK — PHASE 2
 *
 * Read-only summary card surfacing measurement / BOQ counts, draft status,
 * estimated total and the latest update for the active work order. No
 * mutations, no privileged keys, no lifecycle/invoice/payment surfaces.
 */
import { useEffect, useState } from "react";
import { ClipboardList, Ruler, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderMeasurements,
  listWorkOrderBoqs,
  type WorkOrderBoqRow,
  type WorkOrderMeasurementRow,
} from "@/modules/workOrders";

interface Props {
  workOrderId: string;
  canManage: boolean;
}

export function WorkOrderMeasurementsBoqSummary({ workOrderId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const [measurements, setMeasurements] = useState<WorkOrderMeasurementRow[]>([]);
  const [boqs, setBoqs] = useState<WorkOrderBoqRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [{ data: ms }, { data: bs }] = await Promise.all([
        listWorkOrderMeasurements({ workOrderId }),
        listWorkOrderBoqs({ workOrderId }),
      ]);
      if (cancelled) return;
      setMeasurements(ms ?? []);
      setBoqs(bs ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workOrderId]);

  const measurementsCount = measurements.length;
  const boqsCount = boqs.length;
  const latestBoq = boqs[0] ?? null;
  const estimatedTotal = boqs.reduce((sum, b) => sum + (Number(b.total) || 0), 0);

  const statusLabel = (s: string | undefined | null) => {
    if (s === "finalized") return isRTL ? "معتمد" : "Approved";
    if (s === "draft") return isRTL ? "مسودة" : "Draft";
    return isRTL ? "بانتظار مراجعة" : "Pending review";
  };
  const statusTone = (s: string | undefined | null) =>
    s === "finalized"
      ? "bg-success/15 text-success border-success/30"
      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";

  const latestUpdate = (() => {
    const stamps: string[] = [];
    for (const m of measurements) if (m.updated_at) stamps.push(m.updated_at);
    for (const b of boqs) if (b.updated_at) stamps.push(b.updated_at);
    if (stamps.length === 0) return null;
    stamps.sort();
    return stamps[stamps.length - 1];
  })();

  return (
    <div
      className="rounded-2xl border border-border/60 bg-muted/10 p-3 sm:p-4 space-y-2"
      data-testid="wo-meas-boq-summary"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ClipboardList className="w-3.5 h-3.5" />
        {isRTL ? "ملخص القياسات و BOQ" : "Measurements & BOQ summary"}
        {!canManage && (
          <span className="ms-auto text-[10px] uppercase tracking-wide opacity-70">
            {isRTL ? "للقراءة فقط" : "read-only"}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {isRTL ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-xl border border-border/50 bg-card p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Ruler className="w-3 h-3" />
              {isRTL ? "القياسات" : "Measurements"}
            </div>
            <div className="font-semibold text-sm mt-0.5" data-testid="wo-summary-measurements-count">
              {measurementsCount}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-2">
            <div className="text-muted-foreground">{isRTL ? "بنود BOQ" : "BOQ entries"}</div>
            <div className="font-semibold text-sm mt-0.5" data-testid="wo-summary-boq-count">
              {boqsCount}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-2">
            <div className="text-muted-foreground">{isRTL ? "إجمالي تقديري" : "Estimated total"}</div>
            <div className="font-semibold text-sm mt-0.5" dir="ltr">
              {estimatedTotal.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-2">
            <div className="text-muted-foreground">{isRTL ? "الحالة" : "Status"}</div>
            <div className="mt-0.5">
              {latestBoq ? (
                <Badge variant="outline" className={`text-[10px] ${statusTone(latestBoq.status)}`}>
                  {statusLabel(latestBoq.status)}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      )}
      {latestUpdate && (
        <div className="text-[10px] text-muted-foreground" dir="ltr">
          {isRTL ? "آخر تحديث: " : "Last updated: "} {new Date(latestUpdate).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default WorkOrderMeasurementsBoqSummary;