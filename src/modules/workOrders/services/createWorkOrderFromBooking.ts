import { getCurrentUser } from "@/modules/identity/services/session/getCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { createWorkOrder } from "./createWorkOrder";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import type { WorkOrderRow, WorkOrderPriority } from "../types";

export interface CreateWorkOrderFromBookingInput {
  bookingId: string;
  /** Explicit business_id. Validated against the booking row when provided. */
  businessId?: string;
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
}

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

/**
 * BUSINESS-CORE-11 — Manual conversion of a booking into a work order.
 *
 * - Reads `bookings` under the caller's JWT (RLS gates provider/client access).
 * - Resolves business_id from the booking row directly; if an explicit
 *   `businessId` is supplied it must match (otherwise rejected).
 * - Delegates insert to `createWorkOrder`, persisting:
 *     source_type   = 'booking'
 *     source_id     = booking.id (UUID, never displayed)
 *     source_ref_id = booking.ref_id (BKG-… official ref only, never fabricated)
 * - Emits `work_order.created_from_booking` audit event.
 */
export async function createWorkOrderFromBooking(
  input: CreateWorkOrderFromBookingInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const { bookingId } = input;
  if (!bookingId) {
    return { data: null, error: new Error("booking_id_required") };
  }

  const { data: userRes, error: userErr } = await getCurrentUser();
  const uid = userRes?.user?.id ?? null;
  if (userErr || !uid) {
    return { data: null, error: userErr ?? new Error("not_authenticated") };
  }

  // Load booking row through RLS — provider/client gating enforced by policy.
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("id, ref_id, business_id, client_name, notes, booking_date, start_time")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return { data: null, error: bookingErr ?? new Error("booking_not_found_or_no_access") };
  }

  const resolvedBusinessId = input.businessId ?? booking.business_id;
  if (input.businessId && input.businessId !== booking.business_id) {
    return { data: null, error: new Error("business_id_mismatch") };
  }

  // Only accept an official BKG-style ref — never derive one from a UUID.
  const rawRef = (booking.ref_id ?? "").trim().toUpperCase();
  const sourceRefId = SAFE_REF.test(rawRef) ? rawRef : null;

  const dateLabel = booking.booking_date
    ? new Date(booking.booking_date).toLocaleDateString("en-GB")
    : "";
  const timeLabel = booking.start_time?.slice(0, 5) ?? "";
  const defaultTitle =
    (input.title ?? "").trim() ||
    (booking.client_name || `Booking ${dateLabel} ${timeLabel}`).slice(0, 200);

  const { data: wo, error: woErr } = await createWorkOrder({
    business_id: resolvedBusinessId,
    owner_user_id: uid,
    created_by_user_id: uid,
    title: defaultTitle,
    customer_name: booking.client_name,
    priority: input.priority ?? "medium",
    source_type: "booking",
    source_id: booking.id,
    source_ref_id: sourceRefId,
  });

  if (woErr || !wo) return { data: null, error: woErr };

  await recordWorkOrderAudit({
    business_id: wo.business_id,
    actor_id: uid,
    entity_id: wo.id,
    action: "work_order.created_from_booking",
    metadata: {
      ref_id: wo.ref_id,
      booking_ref_id: sourceRefId,
      description: input.description ?? null,
    },
  });

  return { data: wo, error: null };
}
