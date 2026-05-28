/**
 * Service wrapper for the `admin-create-business-with-owner` edge function.
 * Creates a Business and binds an owner (existing user, new account, or invitation)
 * in a single transactional call. Admin / super-admin only.
 */
import { supabase } from '@/integrations/supabase/client';

export type OwnerMode = 'existing' | 'new' | 'invite';

export interface AdminCreateBusinessOwner {
  mode: OwnerMode;
  user_id?: string | null;
  ref_id?: string | null;
  email?: string;
  password?: string;
  full_name?: string;
  full_name_ar?: string;
  full_name_en?: string;
  phone?: string;
  position?: string;
  auto_confirm?: boolean;
}

export interface AdminCreateBusinessPayload {
  username: string;
  name_ar: string;
  name_en?: string | null;
  phone?: string | null;
  email?: string | null;
  category_id?: string | null;
  city_id?: string | null;
  region?: string | null;
  region_en?: string | null;
  national_id?: string | null;
  unified_number?: string | null;
  vat_number?: string | null;
  district?: string | null;
  district_en?: string | null;
  street_name?: string | null;
  street_name_en?: string | null;
  building_number?: string | null;
  additional_number?: string | null;
  address?: string | null;
  address_en?: string | null;
  membership_tier?: string;
}

export interface AdminCreateBusinessResult {
  success: boolean;
  error?: string;
  business?: {
    id: string;
    ref_id: string | null;
    username: string | null;
    name_ar: string | null;
    name_en: string | null;
  };
  owner?: {
    user_id: string;
    email: string | null;
    created_now: boolean;
    recovery_link: string | null;
  };
}

export async function adminCreateBusinessWithOwner(params: {
  owner: AdminCreateBusinessOwner;
  business: AdminCreateBusinessPayload;
  redirect_to?: string;
}): Promise<AdminCreateBusinessResult> {
  const { data, error } = await supabase.functions.invoke(
    'admin-create-business-with-owner',
    { body: params },
  );
  if (error) {
    return { success: false, error: error.message };
  }
  const raw = (data ?? {}) as AdminCreateBusinessResult & { error?: string };
  if (!raw.success) {
    return { success: false, error: raw.error ?? 'unknown_error' };
  }
  return raw;
}