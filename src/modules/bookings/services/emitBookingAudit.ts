/**
 * BUSINESS-CORE-17 — Source-side audit emitter for booking lifecycle
 * events that populate the Unified Operations Feed.
 *
 * Best-effort wrapper around `recordBusinessSourceAudit`. Two flavours:
 *   - `emitBookingCreated(...)` — used immediately after a successful
 *     `bookings` insert; takes the business_id + ref_id directly so no
 *     extra read is needed.
 *   - `emitBookingStatusChanged(...)` — resolves business_id + ref_id
 *     from `bookings` for a status transition.
 *
 * Contract (matches BC-13/14/15/16 helpers):
 *   - Never throws. Audit failures must not break the parent mutation.
 *   - Never displays UUIDs (only validated `^[A-Z]{2,6}-[A-Z0-9]+$` refs).
 *   - Never includes PII / secrets / payment / token / message / address
 *     fields. Only safe scalars are forwarded into metadata.
 */
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session/getCurrentUser';
import { recordBusinessSourceAudit } from '@/modules/businesses/notes';

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

function pickSafeRef(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const raw = (c ?? '').trim().toUpperCase();
    if (SAFE_REF.test(raw)) return raw;
  }
  return null;
}

interface BookingSlim {
  id: string;
  business_id: string | null;
  ref_id: string | null;
  status: string | null;
}

async function readBookingSlim(bookingId: string): Promise<BookingSlim | null> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, business_id, ref_id, status')
      .eq('id', bookingId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as BookingSlim | null;
  } catch {
    return null;
  }
}

export async function readBookingStatusSafe(
  bookingId: string,
): Promise<string | null> {
  const row = await readBookingSlim(bookingId);
  return row?.status ?? null;
}

export interface EmitBookingCreatedOptions {
  bookingId: string;
  businessId: string;
  refId?: string | null;
  status?: string | null;
}

export async function emitBookingCreated(
  opts: EmitBookingCreatedOptions,
): Promise<void> {
  try {
    if (!opts.bookingId || !opts.businessId) return;
    const { data: userRes } = await getCurrentUser();
    const uid = userRes?.user?.id ?? null;
    if (!uid) return;
    const metadata: Record<string, unknown> = {
      booking_ref_id: pickSafeRef(opts.refId),
      source_type: 'booking',
    };
    if (opts.status) metadata.new_status = opts.status;
    await recordBusinessSourceAudit({
      business_id: opts.businessId,
      actor_id: uid,
      entity_type: 'booking',
      entity_id: opts.bookingId,
      action: 'booking.created',
      metadata,
    });
  } catch {
    /* swallow — audit is observability-only */
  }
}

export interface EmitBookingStatusChangedOptions {
  bookingId: string;
  previousStatus?: string | null;
  newStatus?: string | null;
}

export async function emitBookingStatusChanged(
  opts: EmitBookingStatusChangedOptions,
): Promise<void> {
  try {
    if (!opts.bookingId) return;
    const row = await readBookingSlim(opts.bookingId);
    if (!row?.business_id) return;
    const { data: userRes } = await getCurrentUser();
    const uid = userRes?.user?.id ?? null;
    if (!uid) return;
    const metadata: Record<string, unknown> = {
      booking_ref_id: pickSafeRef(row.ref_id),
      source_type: 'booking',
    };
    if (opts.previousStatus) metadata.previous_status = opts.previousStatus;
    const newStatus = opts.newStatus ?? row.status ?? null;
    if (newStatus) metadata.new_status = newStatus;
    await recordBusinessSourceAudit({
      business_id: row.business_id,
      actor_id: uid,
      entity_type: 'booking',
      entity_id: row.id,
      action: 'booking.status_changed',
      metadata,
    });
  } catch {
    /* swallow — audit is observability-only */
  }
}