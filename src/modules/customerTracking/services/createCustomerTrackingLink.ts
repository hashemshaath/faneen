/**
 * CUSTOMER-EXPERIENCE-1 — Issue a new customer tracking link (provider-side).
 * Wraps `create_customer_tracking_link` RPC. Returns the raw token exactly
 * once — the caller must hand it to the customer immediately.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CustomerTrackingLinkIssue } from '../types';

export async function createCustomerTrackingLink(input: {
  workOrderId: string;
  customerEmail?: string | null;
  expiresAt?: string | null;
}): Promise<{ data: CustomerTrackingLinkIssue | null; error: unknown }> {
  if (!input.workOrderId) {
    return { data: null, error: new Error('missing_work_order') };
  }
  const { data, error } = await supabase.rpc('create_customer_tracking_link', {
    _work_order_id: input.workOrderId,
    _customer_email: input.customerEmail ?? null,
    _expires_at: input.expiresAt ?? null,
  });
  if (error) return { data: null, error };
  return {
    data: (data as unknown as CustomerTrackingLinkIssue | null) ?? null,
    error: null,
  };
}

export async function revokeCustomerTrackingLink(
  refId: string,
): Promise<{ ok: boolean; error: unknown }> {
  if (!refId) return { ok: false, error: new Error('missing_ref') };
  const { data, error } = await supabase.rpc('revoke_customer_tracking_link', {
    _ref_id: refId,
  });
  if (error) return { ok: false, error };
  return { ok: Boolean(data), error: null };
}