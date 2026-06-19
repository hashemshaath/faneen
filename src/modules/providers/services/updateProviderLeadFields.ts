import { supabase } from '@/integrations/supabase/client';
import type { ProviderLeadRow } from '../types';

export type ProviderLeadEditableFields = Partial<{
  name_ar: string;
  name_en: string | null;
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  preferred_channel: 'phone' | 'whatsapp' | 'email';
  website: string | null;
  cr_number: string | null;
  unified_number: string | null;
  vat_number: string | null;
  main_activity: string | null;
  specialties: string[];
  brands: string[];
  brief: string | null;
  map_link: string | null;
  national_address: string | null;
  short_national_address: string | null;
  full_address: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  street_name: string | null;
  building_number: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  establishment_year: number | null;
  account_manager_name: string | null;
  account_manager_phone: string | null;
  account_manager_email: string | null;
  branches_count: number;
}>;

export async function updateProviderLeadFields(
  leadId: string,
  fields: ProviderLeadEditableFields,
): Promise<{ row: ProviderLeadRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('provider_leads')
    .update(fields)
    .eq('id', leadId)
    .select('*')
    .maybeSingle();
  return {
    row: (data as ProviderLeadRow | null) ?? null,
    error: (error as Error | null) ?? null,
  };
}