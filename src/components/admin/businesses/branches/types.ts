/**
 * Phase 5D — Admin Businesses Branches Tab Extraction.
 *
 * Shared types for the extracted branch tab presentational components.
 * These types describe ONLY the UI shape exchanged between the parent
 * `AdminBusinesses.tsx` and the new branch components. They do not
 * change any CRUD, publish/approval, or security behavior — the parent
 * still owns mutations and queries.
 */
import type { Dispatch, SetStateAction } from 'react';

export type BranchTypeId =
  | 'main'
  | 'branch'
  | 'warehouse'
  | 'admin_office'
  | 'regional_office'
  | 'head_office';

/** Minimal branch row shape consumed by the cards/list. Structurally a
 *  subset of `business_branches.Row`, defined locally so presentational
 *  components do not need to import generated Supabase types. */
export interface BranchRow {
  id: string;
  name_ar: string;
  name_en: string | null;
  is_main: boolean | null;
  is_active: boolean;
  branch_type?: string | null;
  phone?: string | null;
  mobile?: string | null;
  unified_number?: string | null;
  address?: string | null;
  district?: string | null;
  street_name?: string | null;
  contact_person?: string | null;
}

/** Inline branch form store. All fields required for the save mutation
 *  payload are typed; optional fields are used only by NationalAddressForm. */
export interface BranchFormState {
  name_ar: string;
  name_en: string;
  is_main: boolean;
  is_active: boolean;
  branch_type: BranchTypeId;
  contact_person: string;
  phone: string;
  mobile: string;
  unified_number: string;
  customer_service_phone: string;
  email: string;
  website: string;
  country_id: string;
  city_id: string;
  region: string;
  district: string;
  street_name: string;
  building_number: string;
  national_id: string;
  additional_number: string;
  address: string;
  latitude: string | number;
  longitude: string | number;
  // Optional extras consumed by NationalAddressForm
  short_address?: string | null;
  region_en?: string | null;
  district_en?: string | null;
  street_name_en?: string | null;
  address_en?: string | null;
  address_manual?: boolean;
  post_code?: string | null;
  complex_name?: string | null;
  complex_name_en?: string | null;
  site_number?: string | null;
}

export type BranchFormSetter = Dispatch<SetStateAction<BranchFormState | null>>;

export interface BranchCountryOption {
  id: string;
  name_ar: string;
  name_en: string;
}

/** Phase 5D+ — main-business contact values used to offer "use main"
 *  shortcuts in the branch form (avoid duplicating unified number,
 *  customer service phone, email, and website across branches). */
export interface BranchMainContact {
  unified_number?: string | null;
  customer_service_phone?: string | null;
  email?: string | null;
  website?: string | null;
}