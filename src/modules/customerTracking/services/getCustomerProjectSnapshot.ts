/**
 * CUSTOMER-EXPERIENCE-1 — Anon-callable customer snapshot fetch.
 * Wraps the SECURITY DEFINER RPC `get_customer_project_snapshot`.
 * Never calls customer_tracking_links directly. Never logs the raw token.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CustomerProjectSnapshot } from '../types';

export async function getCustomerProjectSnapshot(input: {
  refId: string;
  token: string;
}): Promise<{ data: CustomerProjectSnapshot | null; error: unknown }> {
  if (!input.refId || !input.token) {
    return { data: null, error: new Error('missing_required') };
  }
  const { data, error } = await supabase.rpc('get_customer_project_snapshot', {
    _ref_id: input.refId,
    _token: input.token,
  });
  if (error) return { data: null, error };
  return {
    data: (data as unknown as CustomerProjectSnapshot | null) ?? null,
    error: null,
  };
}