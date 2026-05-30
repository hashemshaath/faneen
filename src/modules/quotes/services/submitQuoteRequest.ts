import { supabase } from '@/integrations/supabase/client';

/**
 * Submit-quote-request edge function wrapper (A1).
 *
 * Notes:
 * - Payload shape mirrors Quote.tsx exactly. Do not normalize or default
 *   fields here — the edge function is the source of truth.
 * - Throws on edge invoke error OR on `{ success: false }` / missing
 *   `quote_request_id` — preserves existing Quote.tsx try/catch semantics.
 * - Does NOT touch storage, quote_request_files, reveal, conversion, or
 *   any other module (deferred to later phases).
 */
export interface SubmitQuoteRequestPayload {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_type: string;
  preferred_contact_method: string;
  sector: string;
  city: string;
  district: string | null;
  service_location_type: string;
  project_description: string;
  approx_dimensions: string | null;
  quantity: string | null;
  execution_timeline: string;
  has_budget: boolean;
  budget_amount: number | null;
  budget_note: string | null;
  metadata: Record<string, unknown>;
  // RFQ-BRAND-PICKER-1B — optional header brand preference
  preferred_brand_ids?: string[] | null;
  brand_preference_mode?: 'exact' | 'preferred' | 'flexible' | null;
  brand_notes?: string | null;
}

export interface SubmitQuoteRequestResult {
  success: boolean;
  quote_request_id: string;
  message?: string;
}

export async function submitQuoteRequest(
  payload: SubmitQuoteRequestPayload,
): Promise<SubmitQuoteRequestResult> {
  const { data, error } = await supabase.functions.invoke('submit-quote-request', {
    body: payload,
  });
  if (error) throw new Error(error.message);
  const result = data as { success: boolean; quote_request_id?: string; message?: string };
  if (!result?.success || !result.quote_request_id) {
    throw new Error(result?.message || 'submit_failed');
  }
  return { success: true, quote_request_id: result.quote_request_id, message: result.message };
}