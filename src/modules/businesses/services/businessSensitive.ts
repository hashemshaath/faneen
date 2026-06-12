/**
 * Business sensitive fields — owner + admin only access.
 *
 * Background: the six columns below are guarded by column-level GRANTs
 * on `public.businesses` (REVOKE SELECT/UPDATE from authenticated) so
 * staff with the 'manager' role can no longer read CR scan data,
 * national_id, approval_notes, or owner_name through PostgREST.
 *
 * All owner/admin code paths that need these fields must go through
 * the two SECURITY DEFINER RPCs below.
 */
import { supabase } from '@/integrations/supabase/client';

export interface BusinessSensitiveFields {
  cr_scan_raw: string | null;
  cr_scan_data: Record<string, unknown> | null;
  cr_document_url: string | null;
  national_id: string | null;
  approval_notes: string | null;
  cr_owner_name: string | null;
}

export async function getBusinessSensitiveFields(
  businessId: string,
): Promise<{ data: BusinessSensitiveFields | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_business_sensitive_fields', {
    p_business_id: businessId,
  });
  if (error) return { data: null, error: new Error(error.message) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      data: {
        cr_scan_raw: null,
        cr_scan_data: null,
        cr_document_url: null,
        national_id: null,
        approval_notes: null,
        cr_owner_name: null,
      },
      error: null,
    };
  }
  return {
    data: {
      cr_scan_raw: (row as { cr_scan_raw: string | null }).cr_scan_raw ?? null,
      cr_scan_data: ((row as { cr_scan_data: unknown }).cr_scan_data ?? null) as
        | Record<string, unknown>
        | null,
      cr_document_url: (row as { cr_document_url: string | null }).cr_document_url ?? null,
      national_id: (row as { national_id: string | null }).national_id ?? null,
      approval_notes: (row as { approval_notes: string | null }).approval_notes ?? null,
      cr_owner_name: (row as { cr_owner_name: string | null }).cr_owner_name ?? null,
    },
    error: null,
  };
}

export interface UpdateBusinessSensitiveFieldsInput {
  cr_scan_raw?: string | null;
  cr_scan_data?: Record<string, unknown> | null;
  cr_document_url?: string | null;
  national_id?: string | null;
  approval_notes?: string | null;
  cr_owner_name?: string | null;
  /** Set true to explicitly clear `cr_scan_data` (NULL vs leave-unchanged). */
  clear_scan_data?: boolean;
}

export async function updateBusinessSensitiveFields(
  businessId: string,
  input: UpdateBusinessSensitiveFieldsInput,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('update_business_sensitive_fields', {
    p_business_id: businessId,
    p_cr_scan_raw: input.cr_scan_raw ?? null,
    p_cr_scan_data: (input.cr_scan_data ?? null) as never,
    p_cr_document_url: input.cr_document_url ?? null,
    p_national_id: input.national_id ?? null,
    p_approval_notes: input.approval_notes ?? null,
    p_cr_owner_name: input.cr_owner_name ?? null,
    p_clear_scan_data: input.clear_scan_data ?? false,
  });
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

/** Sensitive column names — never include in a `.select()` against `public.businesses`. */
export const BUSINESS_SENSITIVE_COLUMNS = [
  'cr_scan_raw',
  'cr_scan_data',
  'cr_document_url',
  'national_id',
  'approval_notes',
  'cr_owner_name',
] as const;

/**
 * PostgREST-safe select string covering every column on
 * `public.businesses` EXCEPT the 6 sensitive ones. Use this in place of
 * `select: '*'` to avoid permission errors on the authenticated role.
 * Sensitive fields must be fetched via `getBusinessSensitiveFields`,
 * `getBusinessFullById`, or `getOwnerBusinessFull`.
 */
export const BUSINESS_SAFE_COLUMNS_SELECT =
  'id,user_id,username,name_ar,name_en,description_ar,description_en,logo_url,cover_url,phone,email,website,country_id,city_id,address,latitude,longitude,membership_tier,is_verified,is_active,rating_avg,rating_count,created_at,updated_at,business_number,ref_id,additional_number,region,district,street_name,building_number,short_description_ar,short_description_en,unified_number,contact_person,mobile,customer_service_phone,approval_status,submitted_at,reviewed_at,reviewed_by,username_status,onboarding_completion,is_demo,vat_number,region_en,district_en,street_name_en,address_en,account_manager_name,account_manager_phone,account_manager_email,account_manager_position,last_active_at,cr_document_path,cr_document_mime,cr_document_size,cr_document_uploaded_at,cr_document_uploaded_by,cr_scan_at,cr_legal_entity,cr_issue_date,cr_expiry_date,legacy_ref_id,country_code,default_currency,default_locale,timezone,entity_type,capabilities,phone_country_code,phone_national,short_address,floor_number,unit_number,unit_type,placeholder_owner,seo_title_ar,seo_title_en,seo_description_ar,seo_description_en,seo_keywords,og_image,logo_image_asset_id,cover_image_asset_id,logo_image_variants,cover_image_variants';

/**
 * SECURITY DEFINER RPC returning the most recently created business
 * owned by `userId` as a JSON object (full row, incl. sensitive cols).
 * Authorized only when caller is `userId` or an admin.
 */
export async function getOwnerBusinessFull<T = Record<string, unknown>>(
  userId: string,
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_owner_business_full', { p_user_id: userId });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as T | null) ?? null, error: null };
}

/**
 * SECURITY DEFINER RPC returning a single business by id as a JSON object
 * (full row, incl. sensitive cols). Authorized only when caller is the
 * business owner or an admin.
 */
export async function getBusinessFullById<T = Record<string, unknown>>(
  businessId: string,
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_business_full_by_id', {
    p_business_id: businessId,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as T | null) ?? null, error: null };
}