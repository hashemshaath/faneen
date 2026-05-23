/**
 * CT-3 — Thin wrapper over `list_client_sites_for_contract` RPC. Raw pass-through.
 */
import { supabase } from '@/integrations/supabase/client';

export async function listClientSitesForContract(params: {
  _business_id: string;
  _client_user_id?: string;
}) {
  return await supabase.rpc('list_client_sites_for_contract', params);
}