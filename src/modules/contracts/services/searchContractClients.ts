/**
 * CT-3 — Thin wrapper over `search_contract_clients` RPC. Raw pass-through.
 */
import { supabase } from '@/integrations/supabase/client';

export async function searchContractClients(params: { _q: string }) {
  return await supabase.rpc('search_contract_clients', params);
}