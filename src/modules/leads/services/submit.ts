import { supabase } from '@/integrations/supabase/client';
import { emitLeadCreated } from './emitLeadAudit';

/**
 * Lead request insert payload — mirrors LeadRequestForm exactly (R3G/R3H).
 *
 * Notes:
 * - `id` is client-supplied (crypto.randomUUID()) so the caller can reuse it
 *   for fire-and-forget notify without an extra round-trip.
 * - `user_id` must be `null` for anon submissions. RLS rejects spoofed values.
 * - Optional text fields are normalized to `string | null` at the callsite;
 *   this wrapper does not re-normalize.
 * - `country_id` is intentionally omitted — the DB stamps the SA default.
 */
export interface InsertLeadRequestPayload {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  phone_country_code: string | null;
  phone_national: string | null;
  subject: string | null;
  message: string;
  budget_range: string | null;
  contact_preference: 'any' | 'email' | 'phone' | 'whatsapp' | 'platform';
  source: string;
}

/**
 * Insert a lead request. Throws on RLS or DB error so the caller can
 * surface the message (preserves existing LeadRequestForm behavior).
 * Returns the client-supplied id for fire-and-forget notify reuse.
 */
export async function insertLeadRequest(
  payload: InsertLeadRequestPayload,
): Promise<{ id: string }> {
  const { error } = await supabase.from('lead_requests').insert(payload);
  if (error) throw error;
  // BUSINESS-CORE-16 — emit a per-business lead.created event for the
  // Unified Operations Feed. Best-effort; never blocks the caller. The
  // owning business_id and lead_ref are taken from the payload so no
  // round-trip is required. (Customer-side `quote_requests` inserts are
  // intentionally NOT audited here — they have no business_id until
  // provider fanout occurs.)
  try {
    await emitLeadCreated({
      leadRequestId: payload.id,
      businessId: payload.business_id,
      // ref_id is stamped by a DB trigger; we don't have it client-side
      // at insert time and never try to invent one. The normalizer
      // resolves the lead-side ref from the entity_id link.
      refId: null,
    });
  } catch {
    /* never fail the mutation on audit error */
  }
  return { id: payload.id };
}