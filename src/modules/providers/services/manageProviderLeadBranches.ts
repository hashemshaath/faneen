import { supabase } from '@/integrations/supabase/client';

export interface ProviderLeadBranchRow {
  id: string;
  lead_id: string;
  branch_name: string;
  city: string | null;
  address: string | null;
  map_link: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  region: string | null;
  district: string | null;
  street_name: string | null;
  building_number: string | null;
  postal_code: string | null;
  short_national_address: string | null;
  national_address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_main: boolean | null;
}

export type ProviderLeadBranchPatch = Partial<Omit<ProviderLeadBranchRow, 'id' | 'lead_id'>>;

export async function upsertProviderLeadBranch(
  leadId: string,
  branchId: string | null,
  patch: ProviderLeadBranchPatch & { branch_name: string },
) {
  if (branchId) {
    const { data, error } = await supabase
      .from('provider_lead_branches')
      .update(patch)
      .eq('id', branchId)
      .select('*')
      .maybeSingle();
    return { row: data as ProviderLeadBranchRow | null, error: (error as Error | null) ?? null };
  }
  const { data, error } = await supabase
    .from('provider_lead_branches')
    .insert({ ...patch, lead_id: leadId })
    .select('*')
    .maybeSingle();
  return { row: data as ProviderLeadBranchRow | null, error: (error as Error | null) ?? null };
}

export async function deleteProviderLeadBranch(branchId: string) {
  const { error } = await supabase
    .from('provider_lead_branches')
    .delete()
    .eq('id', branchId);
  return { error: (error as Error | null) ?? null };
}