/**
 * CT-3 — Thin wrapper over the public `verify_contract_public` RPC.
 * Raw pass-through; verification page resolves data/error itself.
 */
import { supabase } from '@/integrations/supabase/client';

export async function verifyContractPublic(params: {
  _contract_number: string;
  _hash: string;
  _barcode_code: string | null;
}) {
  return await supabase.rpc('verify_contract_public', params);
}