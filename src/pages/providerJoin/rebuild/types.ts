import type {
  ProviderLeadChannel,
  ProviderLeadBranchInput,
} from '@/modules/providers/types';

export type { ProviderLeadChannel, ProviderLeadBranchInput };

export interface ProviderLeadFormState {
  // Step 1 — Business & Services
  name_ar: string;
  name_en: string;
  main_activity: string;
  specialties: string[];
  brands: string[];
  brief: string;
  // Step 2 — Contact & Location
  contact_name: string;
  email: string;
  phone: string;
  preferred_channel: ProviderLeadChannel;
  website: string;
  city: string;
  national_address: string;
  map_link: string;
  // Step 3 — Official & Branches
  cr_number: string;
  unified_number: string;
  vat_number: string;
  branches_count: number;
}

export const EMPTY_PROVIDER_LEAD_FORM: ProviderLeadFormState = {
  name_ar: '', name_en: '', main_activity: '', specialties: [], brands: [], brief: '',
  contact_name: '', email: '', phone: '', preferred_channel: 'phone', website: '',
  city: '', national_address: '', map_link: '',
  cr_number: '', unified_number: '', vat_number: '', branches_count: 1,
};

export type StepNumber = 1 | 2 | 3 | 4;
export type ErrorMap = Record<string, string>;

export interface StepDef {
  id: StepNumber;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}