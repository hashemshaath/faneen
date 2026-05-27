import { supabase } from "@/integrations/supabase/client";

export interface BusinessActivityEvent {
  id: string;
  business_id: string | null;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ListBusinessActivityTimelineOptions {
  businessId: string;
  limit?: number;
}

/**
 * Reads the existing business_audit_log as the activity timeline source.
 * RLS restricts visibility to admins or owner/manager of the business.
 * No new table required — see BUSINESS-CORE-1 audit decision.
 */
export async function listBusinessActivityTimeline(
  options: ListBusinessActivityTimelineOptions,
): Promise<{ data: BusinessActivityEvent[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const { data, error } = await supabase
    .from("business_audit_log")
    .select("id, business_id, actor_id, entity_type, entity_id, action, metadata, created_at")
    .eq("business_id", options.businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return {
    data: (data as BusinessActivityEvent[] | null) ?? null,
    error,
  };
}