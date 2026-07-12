import { supabase } from "@/integrations/supabase/client";
import { dispatchCustomerProjectNotification } from "@/modules/operations/customerCommunications/dispatcher";

/**
 * BUSINESS-WORKFLOW-6 — Forward-only pipeline stage transition.
 * Delegates to the SECURITY DEFINER RPC which enforces:
 *   - manager-only
 *   - completed/cancelled locked
 *   - forward progression (cancelled allowed; completed only from installation)
 *   - appends pipeline event + business_audit_log
 */
export type WorkOrderPipelineStage =
  | "draft"
  | "measured"
  | "quoted"
  | "approved"
  | "engineering"
  | "procurement"
  | "fabrication"
  | "qc"
  | "ready"
  | "installation"
  | "completed"
  | "cancelled";

export const WORK_ORDER_PIPELINE_STAGES: ReadonlyArray<WorkOrderPipelineStage> = [
  "draft",
  "measured",
  "quoted",
  "approved",
  "engineering",
  "procurement",
  "fabrication",
  "qc",
  "ready",
  "installation",
  "completed",
  "cancelled",
];

export interface TransitionWorkOrderStageInput {
  workOrderId: string;
  toStage: WorkOrderPipelineStage;
  notes?: string | null;
}

export interface TransitionWorkOrderStageResult {
  ok: boolean;
  from: WorkOrderPipelineStage | null;
  to: WorkOrderPipelineStage;
}

export async function transitionWorkOrderStage(
  input: TransitionWorkOrderStageInput,
): Promise<{ data: TransitionWorkOrderStageResult | null; error: unknown }> {
  const { data, error } = await supabase.rpc(
    "transition_work_order_pipeline_stage",
    {
      _work_order_id: input.workOrderId,
      _to_stage: input.toStage,
      _notes: input.notes ?? null,
    },
  );
  if (error) return { data: null, error };
  const payload = (data ?? null) as unknown as TransitionWorkOrderStageResult | null;
  // P2.2 — When a work order transitions to `completed`, fire the
  // customer-facing "project.completed" notification via the dispatcher.
  // Best-effort: never disturb the transition result.
  if (payload?.to === 'completed') {
    try {
      const { data: wo } = await supabase
        .from('work_orders')
        .select('business_id')
        .eq('id', input.workOrderId)
        .maybeSingle();
      const businessId = (wo as { business_id?: string | null } | null)?.business_id ?? null;
      if (businessId) {
        void dispatchCustomerProjectNotification({
          eventType: 'project.completed',
          businessId,
          workOrderId: input.workOrderId,
          customerEmail: null,
          idempotencyKey: `wo-project-completed-${input.workOrderId}`,
        }).catch(() => undefined);
      }
    } catch { /* best-effort */ }
  }
  return { data: payload, error: null };
}