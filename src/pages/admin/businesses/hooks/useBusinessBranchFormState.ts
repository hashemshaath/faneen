/**
 * Phase 5G — Admin Businesses Logic Extraction.
 *
 * Encapsulates the inline branch form state used by AdminBusinesses.tsx:
 *  - the `AdminBranchFormState` shape
 *  - the `emptyBranchForm()` factory (formerly `emptyBranch`)
 *  - the `buildBranchPayload()` helper that derives the Supabase
 *    insert/update payload from the current form state
 *  - the React state for `branchForm` and `editingBranchId`
 *
 * Behaviour-preserving: every field name, default value, and payload
 * key mirrors the legacy implementation 1:1 so the save / update
 * branch mutations on the parent page keep working unchanged.
 */
import { useState } from 'react';
import type { AdminBusinessBranchType } from '@/pages/admin/adminBusinesses.types';

export type AdminBranchFormState = {
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

export function emptyBranchForm(): AdminBranchFormState {
  return {
    name_ar: '', name_en: '', is_main: false, is_active: true,
    branch_type: 'branch',
    contact_person: '', phone: '', mobile: '', unified_number: '', customer_service_phone: '',
    email: '', website: '',
    country_id: '', city_id: '', region: '', district: '', street_name: '',
    building_number: '', national_id: '', additional_number: '', address: '',
    latitude: '', longitude: '',
    complex_name: '', complex_name_en: '', site_number: '',
    working_hours: undefined,
  };
}

export function buildBranchPayload(
  form: AdminBranchFormState,
  businessId: string,
): Record<string, unknown> {
  return {
    business_id: businessId,
    name_ar: form.name_ar, name_en: form.name_en || null,
    is_active: form.is_active,
    branch_type: form.branch_type || 'branch',
    contact_person: form.contact_person || null, phone: form.phone || null,
    mobile: form.mobile || null, unified_number: form.unified_number || null,
    customer_service_phone: form.customer_service_phone || null,
    email: form.email || null, website: form.website || null,
    country_id: form.country_id || null, city_id: form.city_id || null,
    region: form.region || null, district: form.district || null,
    street_name: form.street_name || null, building_number: form.building_number || null,
    national_id: form.national_id || null, additional_number: form.additional_number || null,
    address: form.address || null, latitude: form.latitude || null,
    longitude: form.longitude || null,
    complex_name: form.complex_name || null,
    complex_name_en: form.complex_name_en || null,
    site_number: form.site_number || null,
    working_hours: (form.working_hours ?? {}) as unknown,
  };
}

export interface UseBusinessBranchFormState {
  branchForm: AdminBranchFormState | null;
  setBranchForm: React.Dispatch<React.SetStateAction<AdminBranchFormState | null>>;
  editingBranchId: string | null;
  setEditingBranchId: React.Dispatch<React.SetStateAction<string | null>>;
  emptyBranch: () => AdminBranchFormState;
}

export function useBusinessBranchFormState(): UseBusinessBranchFormState {
  const [branchForm, setBranchForm] = useState<AdminBranchFormState | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  return {
    branchForm,
    setBranchForm,
    editingBranchId,
    setEditingBranchId,
    emptyBranch: emptyBranchForm,
  };
}