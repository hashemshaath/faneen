/**
 * BRANDS-GOVERNANCE-1
 * Shared types for the brands module. Kept narrow on purpose — Supabase row
 * shapes are imported where needed, this file only exports the cross-cutting
 * enums and helper shapes used by the services and UI layers.
 */

export type BrandStatus =
  | 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'archived' | 'merged';

export type BrandVerificationStatus =
  | 'unverified' | 'claimed' | 'verified' | 'official';

export type ProviderBrandRelationship =
  | 'manufacturer' | 'official_agent' | 'authorized_distributor' | 'distributor'
  | 'reseller' | 'importer' | 'installer' | 'fabricator'
  | 'maintenance_provider' | 'showroom' | 'supplier' | 'other';

export type ProviderBrandAuthorizationStatus =
  | 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';

export type BrandRequestType =
  | 'create_brand' | 'claim_brand' | 'link_provider' | 'update_brand' | 'report_duplicate';

export type BrandRequestStatus =
  | 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_more_info';

export interface Brand {
  id: string;
  ref_id: string | null;
  name_ar: string;
  name_en: string | null;
  slug: string | null;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  website: string | null;
  sector_id: string | null;
  country_of_origin_code: string | null;
  country_of_origin_name_ar: string | null;
  country_of_origin_name_en: string | null;
  brand_owner_company: string | null;
  founded_year: number | null;
  is_local: boolean;
  is_verified: boolean;
  status: BrandStatus;
  verification_status: BrandVerificationStatus;
  source: string;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  merged_into_brand_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrandManufacturingCountry {
  id: string;
  brand_id: string;
  country_code: string;
  country_name_ar: string | null;
  country_name_en: string | null;
  manufacturing_type: 'main_factory' | 'licensed_factory' | 'assembly' | 'outsourced' | 'unknown';
  notes_ar: string | null;
  notes_en: string | null;
}

export interface BrandSectorLink {
  id: string;
  brand_id: string;
  sector_id: string;
  is_primary: boolean;
}

export interface BrandRequest {
  id: string;
  ref_id: string | null;
  request_type: BrandRequestType;
  status: BrandRequestStatus;
  business_id: string | null;
  user_id: string;
  brand_id: string | null;
  name_ar: string;
  name_en: string | null;
  proposed_country_of_origin_code: string | null;
  proposed_manufacturing_countries: Array<{ country_code: string; manufacturing_type?: string }>;
  proposed_sector_ids: string[];
  proposed_service_ids: string[];
  relationship_type: ProviderBrandRelationship | null;
  documents: Array<{ url: string; name?: string }>;
  notes: string | null;
  admin_notes: string | null;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  ticket_ref_id: string | null;
  created_at: string;
  updated_at: string;
}
