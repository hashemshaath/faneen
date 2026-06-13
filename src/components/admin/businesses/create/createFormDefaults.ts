import type { AdminCreateBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type { SaRegionId } from '@/data/sa-regions';

/**
 * Phase 5F — factory for the inline "Create new business" form.
 * Extracted from AdminBusinesses.tsx with zero behavioral changes:
 * every field/default mirrors the legacy `emptyCreateForm()` literal
 * 1:1 so the create mutation, validation, and submit flow stay intact.
 */
export function emptyCreateBusinessForm(): AdminCreateBusinessFormState {
  return {
    owner_mode: 'placeholder',
    owner_email: '',
    owner_password: '',
    owner_full_name: '',
    owner_phone: '',
    owner_position: '',
    owner_query: '',
    resolved_user_id: '',
    resolved_owner_label: '',
    resolving_owner: false,
    owner_error: '',
    name_ar: '',
    name_en: '',
    username: '',
    username_ok: false,
    phone_cc: '+966',
    phone_national: '',
    email: '',
    city_id: '',
    region_id: '' as SaRegionId | '',
    national_id: '',
    unified_number: '',
    vat_number: '',
    district: '',
    district_en: '',
    street_name: '',
    street_name_en: '',
    building_number: '',
    additional_number: '',
    address: '',
    address_en: '',
  };
}