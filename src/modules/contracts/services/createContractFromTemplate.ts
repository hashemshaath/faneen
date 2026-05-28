/**
 * CT-3 — Thin wrapper over the SECURITY DEFINER RPC
 * `create_contract_from_template`. Returns raw `{ data, error }`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { emitContractAudit } from './emitContractAudit';

export interface CreateContractFromTemplateArgs {
  _payload: Json;
  _template_version_id: string;
  _pricing_method?: string | null;
}

export async function createContractFromTemplate(args: CreateContractFromTemplateArgs) {
  const res = await supabase.rpc('create_contract_from_template', args);
  // BUSINESS-CORE-14 — best-effort source-side audit for the Unified Operations Feed.
  if (!res.error && typeof res.data === 'string' && res.data) {
    try {
      await emitContractAudit({ contractId: res.data, action: 'contract.created' });
    } catch {
      /* never fail the mutation on audit error */
    }
  }
  return res;
}