export type ProviderLeadStatus =
  | 'new'
  | 'under_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'converted_to_business';

export type ProviderLeadChannel = 'phone' | 'whatsapp' | 'email';

export interface ProviderLeadBranchInput {
  branch_name: string;
  city?: string;
  address?: string;
  map_link?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  region?: string;
  district?: string;
  street_name?: string;
  building_number?: string;
  postal_code?: string;
  short_national_address?: string;
  national_address?: string;
  latitude?: number;
  longitude?: number;
  is_main?: boolean;
}

export interface ProviderLeadSubmission {
  name_ar: string;
  name_en?: string;
  contact_name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  preferred_channel: ProviderLeadChannel;
  website?: string;
  cr_number?: string;
  unified_number?: string;
  vat_number?: string;
  main_activity?: string;
  specialties?: string[];
  brands?: string[];
  brief?: string;
  cr_file_path?: string;
  map_link?: string;
  national_address?: string;
  short_national_address?: string;
  full_address?: string;
  region?: string;
  city?: string;
  district?: string;
  street_name?: string;
  building_number?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  establishment_year?: number;
  account_manager_name?: string;
  account_manager_phone?: string;
  account_manager_email?: string;
  branches_count?: number;
  branches?: ProviderLeadBranchInput[];
  ip_hash?: string;
  user_agent?: string;
}

export interface ProviderLeadSubmissionResult {
  lead_id: string;
  reference_code: string;
}

export interface ProviderLeadRow {
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
  admin_notes: string | null;
  linked_business_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}