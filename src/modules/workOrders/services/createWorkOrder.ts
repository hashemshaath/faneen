import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_WORK_ORDER_STAGES,
  type WorkOrderRow,
  type WorkOrderPriority,
} from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface CreateWorkOrderInput {
  business_id: string;
  owner_user_id: string;
  created_by_user_id: string;
  title: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  priority?: WorkOrderPriority;
  source_type?: "lead" | "quote" | "contract" | "manual";
  source_id?: string | null;
  due_at?: string | null;
  seedDefaultStages?: boolean;
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const title = (input.title ?? "").trim();
  if (title.length === 0) return { data: null, error: new Error("title_required") };
  if (title.length > 200) return { data: null, error: new Error("title_too_long") };

  const payload = {
    business_id: input.business_id,
    owner_user_id: input.owner_user_id,
    created_by_user_id: input.created_by_user_id,
    title,
    customer_name: input.customer_name ?? null,
    customer_phone: input.customer_phone ?? null,
    priority: input.priority ?? "medium",
    source_type: input.source_type ?? "manual",
    source_id: input.source_id ?? null,
    due_at: input.due_at ?? null,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("work_orders")
    .insert(payload)
    .select(
      "id, ref_id, business_id, source_type, source_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (error || !data) return { data: null, error };

  if (input.seedDefaultStages !== false) {
    const stageRows = DEFAULT_WORK_ORDER_STAGES.map((s, idx) => ({
      work_order_id: data.id,
      stage_key: s.key,
      title_ar: s.title_ar,
      title_en: s.title_en,
      sort_order: idx,
      status: idx === 0 ? "active" : "pending",
    }));
    await supabase.from("work_order_stages").insert(stageRows);
  }

  await recordWorkOrderAudit({
    business_id: data.business_id,
    actor_id: input.created_by_user_id,
    entity_id: data.id,
    action: "work_order.created",
    metadata: { ref_id: data.ref_id, title: data.title },
  });

  return { data: data as WorkOrderRow, error: null };
}