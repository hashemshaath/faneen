import { useEffect, useRef, useState } from "react";
import { getWorkOrderBySource } from "@/modules/workOrders/services/getWorkOrderBySource";
import type { WorkOrderRow } from "@/modules/workOrders/types";

type SourceType = "lead" | "quote" | "contract" | "booking";

interface Input {
  sourceType: SourceType;
  sourceId: string | null | undefined;
  businessId?: string | null;
  enabled?: boolean;
}

/**
 * BUSINESS-WORKFLOW-2 — Tiny hook used by conversion buttons to decide
 * between "Create Work Order" and "Open Work Order". RLS-authoritative;
 * an absent result means either no WO exists or the caller can't see it.
 */
export function useExistingWorkOrderForSource({
  sourceType,
  sourceId,
  businessId,
  enabled = true,
}: Input): { workOrder: WorkOrderRow | null; loading: boolean; refresh: () => void } {
  const [workOrder, setWorkOrder] = useState<WorkOrderRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!enabled || !sourceId) {
      setWorkOrder(null);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data } = await getWorkOrderBySource({
        sourceType,
        sourceId,
        businessId: businessId ?? undefined,
      });
      if (cancelled.current) return;
      setWorkOrder(data);
      setLoading(false);
    })();
    return () => {
      cancelled.current = true;
    };
  }, [sourceType, sourceId, businessId, enabled, tick]);

  return { workOrder, loading, refresh: () => setTick((t) => t + 1) };
}

export default useExistingWorkOrderForSource;