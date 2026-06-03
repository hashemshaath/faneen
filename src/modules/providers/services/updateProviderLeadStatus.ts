import { supabase } from '@/integrations/supabase/client';
import type { ProviderLeadRow, ProviderLeadStatus } from '../types';

export interface UpdateProviderLeadStatusParams {
  leadId: string;
  status: ProviderLeadStatus;
  adminNotes?: string;
  linkedBusinessId?: string;
}

export async function updateProviderLeadStatus(
  params: UpdateProviderLeadStatusParams,
): Promise<{ row: ProviderLeadRow | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('admin_update_provider_lead', {
    p_lead_id: params.leadId,
    p_status: params.status,
    p_admin_notes: params.adminNotes ?? null,
    p_linked_business_id: params.linkedBusinessId ?? null,
  });
  return {
    row: (data as ProviderLeadRow | null) ?? null,
    error: (error as Error | null) ?? null,
  };
}