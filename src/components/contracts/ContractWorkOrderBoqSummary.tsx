/**
 * WORK ORDER BOQ VISIBILITY + CONTRACT LINK — PHASE 2
 *
 * Contract-side read summary: when a work order has been spawned from this
 * contract and it has BOQs, surface a compact card with the WO number, BOQ
 * count, estimated total and an "Open work order" link. No edit affordance
 * is offered from the contract surface in this phase.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useExistingWorkOrderForSource } from "@/hooks/useExistingWorkOrderForSource";
import {
  listWorkOrderBoqs,
  type WorkOrderBoqRow,
} from "@/modules/workOrders";

interface Props {
  contractId: string;
  businessId?: string | null;
}

export function ContractWorkOrderBoqSummary({ contractId, businessId }: Props) {
  const { isRTL } = useLanguage();
  const { workOrder, loading: woLoading } = useExistingWorkOrderForSource({
    sourceType: "contract",
    sourceId: contractId,
    businessId: businessId ?? undefined,
  });
  const [boqs, setBoqs] = useState<WorkOrderBoqRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!workOrder?.id) {
      setBoqs([]);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data } = await listWorkOrderBoqs({ workOrderId: workOrder.id });
      if (cancelled) return;
      setBoqs(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workOrder?.id]);

  if (woLoading || !workOrder) return null;
  if (!loading && boqs.length === 0) return null;

  const latest = boqs[0] ?? null;
  const total = boqs.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const statusLabel =
    latest?.status === "finalized"
      ? isRTL ? "معتمد" : "Approved"
      : isRTL ? "مسودة" : "Draft";

  return (
    <div
      className="mb-5 sm:mb-6 rounded-2xl border border-border/60 bg-card p-3 sm:p-4 space-y-2"
      data-testid="contract-wo-boq-summary"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="w-4 h-4 text-accent" />
        {isRTL ? "مسودة BOQ المرتبطة بأمر العمل" : "BOQ draft linked to work order"}
        <Badge variant="outline" className="ms-auto text-[10px]">{statusLabel}</Badge>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {isRTL ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border border-border/50 p-2">
            <div className="text-muted-foreground">{isRTL ? "رقم أمر العمل" : "Work order"}</div>
            <div className="font-semibold text-sm mt-0.5" dir="ltr">{workOrder.ref_id}</div>
          </div>
          <div className="rounded-xl border border-border/50 p-2">
            <div className="text-muted-foreground">{isRTL ? "عدد البنود" : "BOQ entries"}</div>
            <div className="font-semibold text-sm mt-0.5">{boqs.length}</div>
          </div>
          <div className="rounded-xl border border-border/50 p-2">
            <div className="text-muted-foreground">{isRTL ? "إجمالي تقديري" : "Estimated total"}</div>
            <div className="font-semibold text-sm mt-0.5" dir="ltr">{total.toFixed(2)}</div>
          </div>
        </div>
      )}
      <div className="flex">
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link to={`/dashboard/work-orders/${workOrder.ref_id}`}>
            {isRTL ? "فتح أمر العمل" : "Open work order"}
            {isRTL ? <ArrowLeft className="w-3 h-3 ms-1" /> : <ArrowRight className="w-3 h-3 ms-1" />}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default ContractWorkOrderBoqSummary;