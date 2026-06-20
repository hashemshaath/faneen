import type { AdminBusinessBranchType } from '@/pages/admin/adminBusinesses.types';

type LooseBranch = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  is_main?: boolean | null;
  is_active: boolean;
  branch_type?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  mobile?: string | null;
  unified_number?: string | null;
  district?: string | null;
  street_name?: string | null;
  address?: string | null;
} & Record<string, unknown>;

type BranchFormState = {
  name_ar: string;
  name_en: string;
  is_main: boolean;
  is_active: boolean;
  branch_type: AdminBusinessBranchType;
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
  complex_name: string;
  complex_name_en: string;
  site_number: string;
  working_hours?: unknown;
};

function readString(row: LooseBranch, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function readCoord(row: LooseBranch, key: string): string | number {
  const value = (row as Record<string, unknown>)[key];
  if (typeof value === 'number' || typeof value === 'string') return value;
  return '';
}

export function mapBranchRowToForm(br: LooseBranch): BranchFormState {
  return {
    name_ar: br.name_ar,
    name_en: br.name_en || '',
    is_main: !!br.is_main,
    is_active: br.is_active,
    branch_type: (br.branch_type as AdminBusinessBranchType) ?? (br.is_main ? 'main' : 'branch'),
    contact_person: br.contact_person || '',
    phone: br.phone || '',
    mobile: br.mobile || '',
    unified_number: br.unified_number || '',
    customer_service_phone: readString(br, 'customer_service_phone'),
    email: readString(br, 'email'),
    website: readString(br, 'website'),
    country_id: readString(br, 'country_id'),
    city_id: readString(br, 'city_id'),
    region: readString(br, 'region'),
    district: br.district || '',
    street_name: br.street_name || '',
    building_number: readString(br, 'building_number'),
    national_id: readString(br, 'national_id'),
    additional_number: readString(br, 'additional_number'),
    address: br.address || '',
    latitude: readCoord(br, 'latitude'),
    longitude: readCoord(br, 'longitude'),
    complex_name: readString(br, 'complex_name'),
    complex_name_en: readString(br, 'complex_name_en'),
    site_number: readString(br, 'site_number'),
    working_hours: (br as Record<string, unknown>).working_hours,
  };
}