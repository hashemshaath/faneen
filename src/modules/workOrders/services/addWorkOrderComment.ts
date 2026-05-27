import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderCommentRow } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface AddWorkOrderCommentInput {
  work_order_id: string;
  business_id: string;
  author_user_id: string;
  body: string;
  task_id?: string | null;
}

export async function addWorkOrderComment(
  input: AddWorkOrderCommentInput,
): Promise<{ data: WorkOrderCommentRow | null; error: unknown }> {
  const body = (input.body ?? "").trim();
  if (body.length === 0) return { data: null, error: new Error("body_required") };
  if (body.length > 4000) return { data: null, error: new Error("body_too_long") };

  const payload = {
    work_order_id: input.work_order_id,
    task_id: input.task_id ?? null,
    author_user_id: input.author_user_id,
    body,
  };

  const { data, error } = await supabase
    .from("work_order_comments")
    .insert(payload)
    .select("id, work_order_id, task_id, author_user_id, body, created_at, deleted_at")
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: input.business_id,
      actor_id: input.author_user_id,
      entity_id: data.work_order_id,
      action: "work_order.comment_added",
      metadata: { comment_id: data.id, task_id: data.task_id },
    });
  }

  return { data: (data as WorkOrderCommentRow | null) ?? null, error };
}