import { supabase } from '@/integrations/supabase/client';
import type { ProviderLeadRow, ProviderLeadStatus } from '../types';

export interface ListProviderLeadsParams {
  status?: ProviderLeadStatus | 'all';
  search?: string;
  limit?: number;
}

export async function listProviderLeads(
  params: ListProviderLeadsParams = {},
): Promise<{ rows: ProviderLeadRow[]; error: Error | null }> {
  let query = supabase
    .from('provider_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 200);

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }
  if (params.search && params.search.trim().length > 0) {
    const s = `%${params.search.trim()}%`;
    query = query.or(
      `name_ar.ilike.${s},name_en.ilike.${s},email.ilike.${s},phone.ilike.${s},reference_code.ilike.${s},cr_number.ilike.${s}`,
    );
  }

  const { data, error } = await query;
  return {
    rows: (data as ProviderLeadRow[] | null) ?? [],
    error: (error as Error | null) ?? null,
  };
}

export async function listProviderLeadBranches(leadId: string) {
  const { data, error } = await supabase
    .from('provider_lead_branches')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  return { rows: data ?? [], error: (error as Error | null) ?? null };
}