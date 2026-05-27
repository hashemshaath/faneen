import { supabase } from "@/integrations/supabase/client";

export async function softDeleteWorkOrder(options: {
  workOrderId: string;
}): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from("work_orders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", options.workOrderId);
  return { error };
}