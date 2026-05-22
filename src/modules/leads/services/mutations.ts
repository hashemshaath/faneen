import { supabase } from '@/integrations/supabase/client';
import type { LeadStatus } from '../components/LeadStatusBadge';

// Lead mutation wrappers (R3D). All writes run under the caller's JWT and
// rely on existing RLS policies — no service_role, no RLS bypass. Edge
// invokes (notify-customer-lead-update, get-revealed-contact), RPCs
// (admin_convert_lead_to_contract, create_or_get_lead_conversation), and
// storage uploads remain inline at the call sites and are intentionally
// NOT wrapped here.

export type LeadRequestExtraFields = Partial<{
  quote_amount: number;
  quote_currency: string;
  quote_note: string | null;
  quote_valid_until: string | null;
}>;

/**
 * Update a lead_requests row's status (with optional quote fields).
 * Throws on error. Used by provider status updates, quote sends,
 * admin status updates, and customer cancellations.
 */
export async function updateLeadRequestStatus(
  id: string,
  status: LeadStatus,
  extra?: LeadRequestExtraFields,
): Promise<void> {
  const { error } = await supabase
    .from('lead_requests')
    .update({ status, ...(extra ?? {}) })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Update a quote_requests row owned by the given user. Throws on error.
 * Patch shape is intentionally typed wide to match the caller-defined
 * UpdatePatch in QuoteRequestDetails (project_description, dimensions,
 * quantity, timeline, budget fields, preferred_contact_method, email).
 */
export type QuoteRequestUpdatePatch = Record<string, unknown>;

export async function updateMyQuoteRequest(
  id: string,
  userId: string,
  patch: QuoteRequestUpdatePatch,
): Promise<void> {
  const { error } = await supabase
    .from('quote_requests')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Mark a provider lead (quote_request_leads row) as viewed.
 * IMPORTANT: swallows the error and returns { ok: !error } to preserve
 * the existing fire-and-forget "viewed-once" guard in ProviderLeadDetails.
 */
export async function markProviderLeadViewed(
  providerLeadId: string,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from('quote_request_leads')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('id', providerLeadId);
  return { ok: !error };
}

/**
 * Update a provider lead's response status (interested/not_interested).
 * Throws on error.
 */
export async function updateProviderLeadResponse(
  providerLeadId: string,
  status: 'interested' | 'not_interested',
): Promise<void> {
  const { error } = await supabase
    .from('quote_request_leads')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', providerLeadId);
  if (error) throw error;
}

export interface ProviderLeadEventPayload {
  lead_id: string;
  quote_request_id: string | null;
  event_type: 'lead_viewed' | 'provider_interested' | 'provider_not_interested';
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Insert an audit event into quote_request_lead_events. Throws on error.
 * Callers that want fire-and-forget semantics should wrap in `void` /
 * try-catch as they already do for the existing inline insert.
 */
export async function insertProviderLeadEvent(
  payload: ProviderLeadEventPayload,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from('quote_request_lead_events')
    .insert(payload);
  if (error) throw error;
  return { ok: true };
}