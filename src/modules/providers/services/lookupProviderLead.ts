import { supabase } from '@/integrations/supabase/client';
import type { ProviderLeadChannel, ProviderLeadStatus, ProviderLeadBranchInput } from '../types';

export type LookupProviderLeadErrorCode = 'invalid_input' | 'not_found' | 'unknown';

export interface ProviderLeadEditableData {
  id: string;
  reference_code: string;
  name_ar: string;
  name_en: string | null;
  contact_name: string;
  email: string;
  phone: string;
  preferred_channel: ProviderLeadChannel;
  website: string | null;
  cr_number: string | null;
  unified_number: string | null;
  vat_number: string | null;
  main_activity: string | null;
  specialties: string[];
  brands: string[];
  brief: string | null;
  cr_file_path: string | null;
  map_link: string | null;
  national_address: string | null;
  city: string | null;
  branches_count: number;
  status: ProviderLeadStatus;
  branches: ProviderLeadBranchInput[];
}

export interface LookupProviderLeadResult {
  ok: boolean;
  data?: ProviderLeadEditableData;
  errorCode?: LookupProviderLeadErrorCode;
}

/**
 * Public lookup: returns the editable lead when reference + (email OR phone)
 * match an OPEN request. Wraps the SECURITY DEFINER RPC `lookup_provider_lead`.
 */
export async function lookupProviderLead(
  reference: string,
  credential: string,
): Promise<LookupProviderLeadResult> {
  const ref = reference.trim().toUpperCase();
  const cred = credential.trim();
  if (!ref || !cred) return { ok: false, errorCode: 'invalid_input' };

  const { data, error } = await supabase.rpc('lookup_provider_lead', {
    p_reference: ref,
    p_credential: cred,
  });

  if (error) {
    if (error.message?.includes('not_found_or_locked')) return { ok: false, errorCode: 'not_found' };
    if (error.message?.includes('invalid_input')) return { ok: false, errorCode: 'invalid_input' };
    return { ok: false, errorCode: 'unknown' };
  }

  return { ok: true, data: data as unknown as ProviderLeadEditableData };
}