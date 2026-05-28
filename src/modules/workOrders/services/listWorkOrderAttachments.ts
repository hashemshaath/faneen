import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderAttachmentRow } from "../types";

export async function listWorkOrderAttachments(options: {
  workOrderId: string;
  taskId?: string | null;
  limit?: number;
}): Promise<{ data: WorkOrderAttachmentRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  let q = supabase
    .from("work_order_attachments")
    .select(
      "id, ref_id, work_order_id, task_id, business_id, uploaded_by_user_id, file_path, file_name, file_type, file_size, attachment_type, created_at, deleted_at",
    )
    .eq("work_order_id", options.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.taskId !== undefined) {
    q = options.taskId === null ? q.is("task_id", null) : q.eq("task_id", options.taskId);
  }
  const { data, error } = await q;
  return { data: (data as WorkOrderAttachmentRow[] | null) ?? null, error };
}