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