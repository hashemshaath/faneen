import { supabase } from '@/integrations/supabase/client';

/**
 * R4B — Canonical wrapper for the public Verify Business page.
 *
 * Source callsite: src/pages/VerifyBusiness.tsx
 *
 * Verbatim semantics:
 *  - Table: `businesses_public`
 *  - Select: id, username, name_ar, name_en, short_description_ar, short_description_en,
 *            logo_url, is_verified, is_active, ref_id, business_number, membership_tier,
 *            city_id, region, rating_avg, rating_count, created_at
 *  - Filter: username = <handle>
 *  - Terminal: maybeSingle
 *  - Returns raw `{ data, error }` — caller maps error/null to 'not_found'.
 *  - Username normalization (trim, strip leading @, lowercase) is the caller's
 *    responsibility, preserved verbatim from the original page logic.
 */
const SELECT =
  'id, username, name_ar, name_en, short_description_ar, short_description_en, logo_url, is_verified, is_active, ref_id, business_number, membership_tier, city_id, region, rating_avg, rating_count, created_at';

export async function getPublicBusinessForVerify<T = unknown>(
  username: string,
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('businesses_public')
    .select(SELECT)
    .eq('username', username)
    .maybeSingle();
  return { data: (data as unknown as T | null), error };
}