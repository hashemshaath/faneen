/**
 * BUSINESS-WORKFLOW-PRODUCTION-2 — Work-In-Progress (WIP) limits.
 *
 * Client-side advisory limits per pipeline stage. Displayed on the
 * Production Board only — there is NO server-side enforcement, NO DB
 * schema, and NO transition rejection based on these numbers. Stage
 * moves are always governed by the `transition_work_order_pipeline_stage`
 * SECURITY DEFINER RPC.
 */
import type { WorkOrderPipelineStageKey } from "../types";

export const WIP_LIMITS: Partial<Record<WorkOrderPipelineStageKey, number>> = {
  engineering: 10,
  procurement: 10,
  fabrication: 15,
  qc: 8,
  ready: 20,
  installation: 12,
};

export type WipStatus = "ok" | "warning" | "danger" | "none";

/**
 * Returns advisory status for a column given its current count.
 * - `none`     — no configured limit for the stage.
 * - `ok`       — under 80% of the limit.
 * - `warning`  — at or above 80% of the limit, but at or below the limit.
 * - `danger`   — strictly over the limit.
 */
export function getWipStatus(
  stage: WorkOrderPipelineStageKey,
  count: number,
): { status: WipStatus; limit: number | null; ratio: number } {
  const limit = WIP_LIMITS[stage];
  if (!limit || limit <= 0) {
    return { status: "none", limit: null, ratio: 0 };
  }
  const ratio = count / limit;
  if (count > limit) return { status: "danger", limit, ratio };
  if (ratio >= 0.8) return { status: "warning", limit, ratio };
  return { status: "ok", limit, ratio };
}