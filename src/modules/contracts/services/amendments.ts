/**
 * R2A.4 — Contract amendment service wrappers.
 * Thin pass-through over SECURITY DEFINER RPCs. All throw on error.
 */
import { supabase } from '@/integrations/supabase/client';

export async function approveAmendment(amendmentId: string): Promise<string> {
  const { error } = await supabase.rpc('approve_contract_amendment', { _amendment_id: amendmentId });
  if (error) throw error;
  return amendmentId;
}

export async function rejectAmendment(amendmentId: string, reason: string): Promise<string> {
  const { error } = await supabase.rpc('reject_contract_amendment', {
    _amendment_id: amendmentId,
    _reason: reason,
  });
  if (error) throw error;
  return amendmentId;
}

export async function cancelAmendment(amendmentId: string): Promise<string> {
  const { error } = await supabase.rpc('cancel_contract_amendment', { _amendment_id: amendmentId });
  if (error) throw error;
  return amendmentId;
}

export async function applyAmendment(amendmentId: string): Promise<string> {
  const { error } = await supabase.rpc('apply_contract_amendment', { _amendment_id: amendmentId });
  if (error) throw error;
  return amendmentId;
}