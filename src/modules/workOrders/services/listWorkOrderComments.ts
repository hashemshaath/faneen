import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderCommentRow } from "../types";

export async function listWorkOrderComments(options: {
  workOrderId: string;
  limit?: number;
}): Promise<{ data: WorkOrderCommentRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const { data, error } = await supabase
    .from("work_order_comments")
    .select("id, work_order_id, task_id, author_user_id, body, created_at, deleted_at")
    .eq("work_order_id", options.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  return { data: (data as WorkOrderCommentRow[] | null) ?? null, error };
}