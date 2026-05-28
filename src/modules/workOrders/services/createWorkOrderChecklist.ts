import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderChecklistRow,
  WorkOrderChecklistType,
  WorkOrderChecklistSectorKey,
  WorkOrderChecklistItemRow,
} from "../types";
import { WORK_ORDER_CHECKLIST_PRESETS } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface CreateWorkOrderChecklistInput {
  workOrderId: string;
  businessId: string;
  createdBy: string;
  checklistType: WorkOrderChecklistType;
  sectorKey?: WorkOrderChecklistSectorKey | null;
  title: string;
  assignedToUserId?: string | null;
  /** When omitted and sectorKey is set, the matching preset items are seeded. */
  items?: ReadonlyArray<{ label: string }>;
}

export interface CreateWorkOrderChecklistResult {
  checklist: WorkOrderChecklistRow;
  items: WorkOrderChecklistItemRow[];
}

/**
 * Creates a checklist with seeded items. Items default to the sector preset
 * for the given checklist_type when none are supplied.
 */
export async function createWorkOrderChecklist(
  input: CreateWorkOrderChecklistInput,
): Promise<{ data: CreateWorkOrderChecklistResult | null; error: unknown }> {
  const { data: header, error: headerErr } = await supabase
    .from("work_order_checklists")
    .insert({
      work_order_id: input.workOrderId,
      business_id: input.businessId,
      checklist_type: input.checklistType,
      sector_key: input.sectorKey ?? null,
      title: input.title,
      assigned_to_user_id: input.assignedToUserId ?? null,
      created_by: input.createdBy,
    })
    .select(
      "id, ref_id, work_order_id, business_id, checklist_type, sector_key, title, status, assigned_to_user_id, created_by, completed_at, created_at, updated_at, deleted_at",
    )
    .single();

  if (headerErr || !header) return { data: null, error: headerErr };

  const presetItems =
    input.items && input.items.length > 0
      ? input.items.map((it, idx) => ({ label: it.label, sort_order: idx }))
      : input.sectorKey
        ? (WORK_ORDER_CHECKLIST_PRESETS[input.sectorKey]?.[input.checklistType] ?? [])
            .map((it, idx) => ({ label: it.ar, sort_order: idx }))
        : [];

  let items: WorkOrderChecklistItemRow[] = [];
  if (presetItems.length > 0) {
    const { data: rows, error: itemsErr } = await supabase
      .from("work_order_checklist_items")
      .insert(
        presetItems.map((p) => ({
          checklist_id: (header as WorkOrderChecklistRow).id,
          label: p.label,
          sort_order: p.sort_order,
        })),
      )
      .select(
        "id, ref_id, checklist_id, label, sort_order, completed, completed_by, completed_at, notes, created_at, updated_at",
      );
    if (itemsErr) return { data: null, error: itemsErr };
    items = (rows as WorkOrderChecklistItemRow[] | null) ?? [];
  }

  await recordWorkOrderAudit({
    business_id: input.businessId,
    actor_id: input.createdBy,
    entity_id: input.workOrderId,
    action: "work_order.checklist_created",
    metadata: {
      checklist_id: (header as WorkOrderChecklistRow).id,
      checklist_type: input.checklistType,
      sector_key: input.sectorKey ?? null,
      item_count: items.length,
    },
  });

  return {
    data: {
      checklist: header as WorkOrderChecklistRow,
      items,
    },
    error: null,
  };
}