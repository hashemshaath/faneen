/**
 * Domain types for the central `addresses` microservice.
 * Owner is polymorphic — references one of three tables depending on `owner_type`.
 */
import type { Database } from '@/integrations/supabase/types';

export type AddressOwnerType = 'profile' | 'business' | 'branch';
export type AddressSource = 'spl' | 'map_pick' | 'manual' | 'import';
export type AddressType =
  | 'primary' | 'billing' | 'shipping'
  | 'project_site' | 'branch' | 'national_address';

export type AddressRow = Database['public']['Tables']['addresses']['Row'];
export type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
export type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

export interface OwnerRef {
  ownerType: AddressOwnerType;
  ownerId: string;
}

/** Bilingual + SPL fields commonly supplied by the UI / SPL lookup. */
export interface AddressFields {
  label?: string | null;
  is_primary?: boolean;
  address_type?: AddressType;
  country_code?: string | null;
  short_address?: string | null;
  building_number?: string | null;
  additional_number?: string | null;
  post_code?: string | null;
  country_id?: string | null;
  city_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  region?: string | null;
  region_en?: string | null;
  district?: string | null;
  district_en?: string | null;
  street_name?: string | null;
  street_name_en?: string | null;
  address?: string | null;
  address_en?: string | null;
  source?: AddressSource;
  verified_at?: string | null;
  is_verified?: boolean;
  national_address_source?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  national_address_raw?: any | null;
}