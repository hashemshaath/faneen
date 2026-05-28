/**
 * BUSINESS-WORKFLOW-7 — Pure pipeline transition rules.
 *
 * Extracted from WorkOrderPipelineSection so the production board can reuse
 * the same forward-only / locked semantics. NO Supabase calls, NO side
 * effects — UI helpers only. Authoritative enforcement still lives in the
 * SECURITY DEFINER RPC `transition_work_order_pipeline_stage`.
 */
import {
  WORK_ORDER_PIPELINE_STAGE_KEYS,
  type WorkOrderPipelineStageKey,
} from "../types";

export const PIPELINE_STAGE_ORDER: Record<WorkOrderPipelineStageKey, number> = {
  draft: 0,
  measured: 1,
  quoted: 2,
  approved: 3,
  engineering: 4,
  procurement: 5,
  fabrication: 6,
  qc: 7,
  ready: 8,
  installation: 9,
  completed: 10,
  cancelled: 99,
};

/**
 * Board columns (display-only). Excludes `draft` and `cancelled` from the
 * default lane list because the requirement set defines the lanes explicitly.
 * The board still renders cards whose pipeline_stage is `draft` under a
 * synthetic "measured" lane only if explicitly mapped — by default, draft
 * cards are hidden from the board (kept on the regular WO page).
 */
export const BOARD_COLUMN_STAGES: ReadonlyArray<WorkOrderPipelineStageKey> = [
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
];

export type WorkOrderLifecycleStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

/** True when stage/status are locked against further pipeline moves. */
export function isPipelineLocked(
  status: string | null | undefined,
  stage: WorkOrderPipelineStageKey,
): boolean {
  return (
    status === "completed" ||
    status === "cancelled" ||
    stage === "completed" ||
    stage === "cancelled"
  );
}

/**
 * Forward-only allowed next stages from the current stage.
 *
 * - Cancelled is always available when not locked.
 * - Completed is only reachable from `installation`.
 * - Any other stage with a strictly larger order is allowed.
 */
export function getAllowedNextStages(
  current: WorkOrderPipelineStageKey,
  status: string | null | undefined,
): ReadonlyArray<WorkOrderPipelineStageKey> {
  if (isPipelineLocked(status, current)) return [];
  const order = PIPELINE_STAGE_ORDER[current];
  return WORK_ORDER_PIPELINE_STAGE_KEYS.filter((s) => {
    if (s === current) return false;
    if (s === "cancelled") return true;
    if (s === "completed") return current === "installation";
    return (
      PIPELINE_STAGE_ORDER[s] > order &&
      PIPELINE_STAGE_ORDER[s] < PIPELINE_STAGE_ORDER.completed
    );
  });
}

/** True when a transition from `from` → `to` is allowed by board rules. */
export function canTransitionStage(
  from: WorkOrderPipelineStageKey,
  to: WorkOrderPipelineStageKey,
  status: string | null | undefined,
): boolean {
  return getAllowedNextStages(from, status).includes(to);
}

/**
 * The single previous stage you can step back to. Forward-only rules forbid
 * arbitrary back-moves; we expose this as a no-op (returns null) so the UI
 * can render a disabled "back" button without violating server-side guards.
 * Kept as an explicit hook for future relaxations.
 */
export function getPreviousBoardStage(
  _current: WorkOrderPipelineStageKey,
): WorkOrderPipelineStageKey | null {
  return null;
}