import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderAttachmentRow, WorkOrderAttachmentType } from "../types";
import { WORK_ORDER_ATTACHMENT_TYPES } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

const MAX_FILE_NAME = 255;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB metadata guard

export interface InsertWorkOrderAttachmentInput {
  work_order_id: string;
  business_id: string;
  uploaded_by_user_id: string;
  file_path: string;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  attachment_type?: WorkOrderAttachmentType;
  task_id?: string | null;
}

export async function insertWorkOrderAttachment(
  input: InsertWorkOrderAttachmentInput,
): Promise<{ data: WorkOrderAttachmentRow | null; error: unknown }> {
  const file_name = (input.file_name ?? "").trim();
  const file_path = (input.file_path ?? "").trim();
  if (file_name.length === 0) return { data: null, error: new Error("file_name_required") };
  if (file_name.length > MAX_FILE_NAME) return { data: null, error: new Error("file_name_too_long") };
  if (file_path.length === 0) return { data: null, error: new Error("file_path_required") };
  if (input.file_size != null && (input.file_size < 0 || input.file_size > MAX_FILE_SIZE_BYTES)) {
    return { data: null, error: new Error("file_size_invalid") };
  }
  const attachment_type: WorkOrderAttachmentType = input.attachment_type ?? "general";
  if (!WORK_ORDER_ATTACHMENT_TYPES.includes(attachment_type)) {
    return { data: null, error: new Error("attachment_type_invalid") };
  }

  const payload = {
    work_order_id: input.work_order_id,
    task_id: input.task_id ?? null,
    business_id: input.business_id,
    uploaded_by_user_id: input.uploaded_by_user_id,
    file_path,
    file_name,
    file_type: input.file_type ?? null,
    file_size: input.file_size ?? null,
    attachment_type,
  };

  const { data, error } = await supabase
    .from("work_order_attachments")
    .insert(payload)
    .select(
      "id, ref_id, work_order_id, task_id, business_id, uploaded_by_user_id, file_path, file_name, file_type, file_size, attachment_type, created_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: input.business_id,
      actor_id: input.uploaded_by_user_id,
      entity_id: input.work_order_id,
      action: "work_order.attachment_added",
      metadata: {
        attachment_id: data.id,
        ref_id: data.ref_id,
        task_id: data.task_id,
        attachment_type: data.attachment_type,
      },
    });
  }

  return { data: (data as WorkOrderAttachmentRow | null) ?? null, error };
}