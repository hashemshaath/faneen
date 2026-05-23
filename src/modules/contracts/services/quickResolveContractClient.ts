/**
 * CT-3 — Thin wrapper over `quick_resolve_contract_client` RPC. Raw pass-through.
 */
import { supabase } from '@/integrations/supabase/client';

export async function quickResolveContractClient(params: {
  _email: string | null;
  _phone: string | null;
}) {
  return await supabase.rpc('quick_resolve_contract_client', params);
}