import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-ADMIN-4 — Admin-safe booking summary (BKG-/BK-…).
 *
 * Read-only. RLS authoritative.
 * Never returns: client_name, client_phone, notes, cancellation_reason,
 * tokens, raw UUIDs as labels.
 */
export interface AdminBookingSummary {
  ref_id: string;
  entity_type: "booking";
  label: string | null;
  status: string | null;
  priority: null;
  business_ref_id: null;
  source_ref_id: null;
  created_at: string | null;
  updated_at: string | null;
  canonical_route: string | null;
}

export async function getAdminBookingSummaryByRef(input: {
  refId: string;
}): Promise<{ data: AdminBookingSummary | null; error: unknown }> {
  const refId = (input.refId ?? "").trim().toUpperCase();
  if (!refId.startsWith("BKG-") && !refId.startsWith("BK-")) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("id, ref_id, booking_date, start_time, status, created_at, updated_at")
    .eq("ref_id", refId)
    .maybeSingle();

  if (error || !data) return { data: null, error };
  const row = data as {
    id: string;
    ref_id: string;
    booking_date: string | null;
    start_time: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  const parts = [row.booking_date, row.start_time].filter(
    (s): s is string => Boolean(s),
  );
  return {
    data: {
      ref_id: row.ref_id,
      entity_type: "booking",
      label: parts.length > 0 ? parts.join(" ") : null,
      status: row.status ?? null,
      priority: null,
      business_ref_id: null,
      source_ref_id: null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      canonical_route: "/dashboard/bookings",
    },
    error: null,
  };
}