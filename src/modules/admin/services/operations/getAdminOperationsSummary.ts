import { listAdminWorkOrders } from "./listAdminWorkOrders";
import { listAdminOperationalActivity } from "./listAdminOperationalActivity";
import { computeWorkOrderKpis } from "@/modules/workOrders";

/**
 * BUSINESS-ADMIN-1 — Optional aggregate summary for the Admin Operations
 * Console KPI strip. Composes the other two admin wrappers — no direct
 * table access.
 */

export interface AdminOperationsSummary {
  openWorkOrders: number;
  overdueWorkOrders: number;
  highPriorityWorkOrders: number;
  convertedToWorkOrders: number;
  recentActivityCount: number;
}

export async function getAdminOperationsSummary(): Promise<{
  data: AdminOperationsSummary | null;
  error: unknown;
}> {
  const [woRes, actRes] = await Promise.all([
    listAdminWorkOrders({ limit: 500 }),
    listAdminOperationalActivity({ limit: 500 }),
  ]);
  if (woRes.error) return { data: null, error: woRes.error };
  if (actRes.error) return { data: null, error: actRes.error };

  const kpis = computeWorkOrderKpis(woRes.data ?? []);
  const acts = actRes.data ?? [];
  const convertedToWorkOrders = acts.filter((a) =>
    a.action.endsWith(".converted_to_work_order"),
  ).length;

  return {
    data: {
      openWorkOrders: kpis.openCount,
      overdueWorkOrders: kpis.overdueCount,
      highPriorityWorkOrders: kpis.byPriority.high + kpis.byPriority.urgent,
      convertedToWorkOrders,
      recentActivityCount: acts.length,
    },
    error: null,
  };
}