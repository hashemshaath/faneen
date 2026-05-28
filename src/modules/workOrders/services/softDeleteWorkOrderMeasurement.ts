import { supabase } from "@/integrations/supabase/client";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export async function softDeleteWorkOrderMeasurement(options: {
  measurementId: string;
  actorUserId?: string | null;
  businessId?: string | null;
  workOrderId?: string | null;
}): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from("work_order_measurements")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", options.measurementId);

  if (!error && options.actorUserId && options.businessId && options.workOrderId) {
    await recordWorkOrderAudit({
      business_id: options.businessId,
      actor_id: options.actorUserId,
      entity_id: options.workOrderId,
      action: "work_order.measurement_deleted",
      metadata: { measurement_id: options.measurementId },
    });
  }
  return { error };
}