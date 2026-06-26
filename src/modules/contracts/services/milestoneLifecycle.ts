/**
 * Milestone lifecycle service — Phase 1 of contract guarantees system.
 * Handles state transitions for contract_milestones with audit events.
 */
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/modules/identity";

export type MilestoneState =
  | "pending"
  | "active"
  | "in_progress"
  | "submitted"
  | "approved"
  | "revision_requested"
  | "completed"
  | "released"
  | "disputed";

export interface MilestoneRow {
  id: string;
  contract_id: string;
  title_ar: string;
  amount: number;
  percentage: number | null;
  status: MilestoneState;
  due_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  auto_release_at: string | null;
  auto_release_days: number;
  review_notes: string | null;
  released_at: string | null;
  sort_order: number;
}

export const DEFAULT_AUTO_RELEASE_DAYS = 7;

export function computeAutoReleaseAt(days = DEFAULT_AUTO_RELEASE_DAYS, from: Date = new Date()): string {
  const dt = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  return dt.toISOString();
}

async function logEvent(args: {
  milestoneId: string;
  contractId: string;
  eventType: string;
  fromStatus?: MilestoneState | null;
  toStatus?: MilestoneState | null;
  notes?: string | null;
  actorRole?: string;
}) {
  const { data: u } = await getCurrentUser();
  await supabase.from("contract_milestone_events").insert({
    milestone_id: args.milestoneId,
    contract_id: args.contractId,
    event_type: args.eventType,
    from_status: args.fromStatus ?? null,
    to_status: args.toStatus ?? null,
    actor_id: u.user?.id ?? null,
    actor_role: args.actorRole ?? null,
    notes: args.notes ?? null,
  });
}

/** Provider submits milestone for client review. */
export async function submitMilestoneForReview(milestone: MilestoneRow, notes?: string) {
  const autoReleaseAt = computeAutoReleaseAt(milestone.auto_release_days ?? DEFAULT_AUTO_RELEASE_DAYS);
  const { data: u } = await getCurrentUser();
  const { error } = await supabase
    .from("contract_milestones")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: u.user?.id ?? null,
      auto_release_at: autoReleaseAt,
      review_notes: notes ?? null,
    })
    .eq("id", milestone.id);
  if (error) throw error;
  await logEvent({
    milestoneId: milestone.id,
    contractId: milestone.contract_id,
    eventType: "submitted",
    fromStatus: milestone.status,
    toStatus: "submitted",
    notes,
    actorRole: "provider",
  });
}

/** Client approves the milestone. */
export async function approveMilestone(milestone: MilestoneRow, notes?: string) {
  const { data: u } = await getCurrentUser();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contract_milestones")
    .update({
      status: "approved",
      approved_at: now,
      approved_by: u.user?.id ?? null,
      review_notes: notes ?? milestone.review_notes,
    })
    .eq("id", milestone.id);
  if (error) throw error;
  await logEvent({
    milestoneId: milestone.id,
    contractId: milestone.contract_id,
    eventType: "approved",
    fromStatus: milestone.status,
    toStatus: "approved",
    notes,
    actorRole: "client",
  });
}

/** Client requests a revision; milestone returns to in_progress and freezes auto-release. */
export async function requestMilestoneRevision(milestone: MilestoneRow, reason: string) {
  const { error } = await supabase
    .from("contract_milestones")
    .update({
      status: "revision_requested",
      auto_release_at: null,
      review_notes: reason,
    })
    .eq("id", milestone.id);
  if (error) throw error;
  await logEvent({
    milestoneId: milestone.id,
    contractId: milestone.contract_id,
    eventType: "revision_requested",
    fromStatus: milestone.status,
    toStatus: "revision_requested",
    notes: reason,
    actorRole: "client",
  });
}

/** Returns hours remaining until auto-release. Negative if already passed. */
export function hoursUntilAutoRelease(autoReleaseAt: string | null): number | null {
  if (!autoReleaseAt) return null;
  const ms = new Date(autoReleaseAt).getTime() - Date.now();
  return ms / (1000 * 60 * 60);
}