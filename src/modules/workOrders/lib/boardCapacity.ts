/**
 * BUSINESS-WORKFLOW-PRODUCTION-2 — Pure capacity/bottleneck metrics.
 *
 * Display-only computations derived from board rows. NO Supabase, NO
 * side effects, NO enforcement. Safe to call on every render.
 */
import type { WorkOrderPipelineStageKey } from "../types";
import { BOARD_COLUMN_STAGES } from "./pipelineRules";
import { WIP_LIMITS } from "./wipLimits";

export interface BoardCapacityRow {
  id: string;
  pipeline_stage: WorkOrderPipelineStageKey;
  status: string;
  due_at: string | null;
}

export interface BoardAssignmentSlim {
  work_order_id: string;
  stage_key: WorkOrderPipelineStageKey;
  assigned_to_user_id: string;
}

export interface BoardCapacityMetrics {
  stageCounts: Record<WorkOrderPipelineStageKey, number>;
  overdueByStage: Record<WorkOrderPipelineStageKey, number>;
  overloadedStages: WorkOrderPipelineStageKey[];
  bottleneck: WorkOrderPipelineStageKey | null;
  bottleneckCount: number;
  unassignedCount: number;
  operatorWorkload: Record<string, number>;
}

function emptyCounts(): Record<WorkOrderPipelineStageKey, number> {
  const m = {} as Record<WorkOrderPipelineStageKey, number>;
  for (const s of BOARD_COLUMN_STAGES) m[s] = 0;
  return m;
}

/**
 * Compute per-stage counts, overload flags, bottleneck stage, unassigned
 * count, and per-operator workload (counted at the current stage only).
 */
export function computeBoardCapacity(
  rows: ReadonlyArray<BoardCapacityRow>,
  assignments: ReadonlyArray<BoardAssignmentSlim>,
  now: number = Date.now(),
): BoardCapacityMetrics {
  const stageCounts = emptyCounts();
  const overdueByStage = emptyCounts();

  for (const r of rows) {
    if (r.status === "completed" || r.status === "cancelled") continue;
    if (stageCounts[r.pipeline_stage] === undefined) continue;
    stageCounts[r.pipeline_stage] += 1;
    if (r.due_at) {
      const t = new Date(r.due_at).getTime();
      if (!Number.isNaN(t) && t < now) {
        overdueByStage[r.pipeline_stage] += 1;
      }
    }
  }

  const overloadedStages: WorkOrderPipelineStageKey[] = [];
  for (const stage of BOARD_COLUMN_STAGES) {
    const limit = WIP_LIMITS[stage];
    if (limit && stageCounts[stage] > limit) overloadedStages.push(stage);
  }

  // Bottleneck = non-terminal stage with the highest count.
  let bottleneck: WorkOrderPipelineStageKey | null = null;
  let bottleneckCount = 0;
  for (const stage of BOARD_COLUMN_STAGES) {
    if (stage === "completed" || stage === "ready") continue;
    const n = stageCounts[stage];
    if (n > bottleneckCount) {
      bottleneck = stage;
      bottleneckCount = n;
    }
  }

  // Build (wo,stage) -> userId index for the current stage of each row.
  const asgIndex = new Map<string, string>();
  for (const a of assignments) {
    const key = `${a.work_order_id}::${a.stage_key}`;
    if (!asgIndex.has(key)) asgIndex.set(key, a.assigned_to_user_id);
  }

  let unassignedCount = 0;
  const operatorWorkload: Record<string, number> = {};
  for (const r of rows) {
    if (r.status === "completed" || r.status === "cancelled") continue;
    const uid = asgIndex.get(`${r.id}::${r.pipeline_stage}`);
    if (!uid) {
      unassignedCount += 1;
    } else {
      operatorWorkload[uid] = (operatorWorkload[uid] ?? 0) + 1;
    }
  }

  return {
    stageCounts,
    overdueByStage,
    overloadedStages,
    bottleneck,
    bottleneckCount,
    unassignedCount,
    operatorWorkload,
  };
}