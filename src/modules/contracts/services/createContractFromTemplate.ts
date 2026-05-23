/**
 * CT-3 — Thin wrapper over the SECURITY DEFINER RPC
 * `create_contract_from_template`. Returns raw `{ data, error }`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface CreateContractFromTemplateArgs {
  _payload: Json;
  _template_version_id: string;
  _pricing_method?: string | null;
}

export async function createContractFromTemplate(args: CreateContractFromTemplateArgs) {
  return await supabase.rpc('create_contract_from_template', args);
}