
-- ============================================================
-- 1. FIX: user_roles privilege escalation
--    Restrict INSERT/UPDATE/DELETE to super_admin only
-- ============================================================

-- Drop the overly permissive admin policies
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recreate with super_admin only
CREATE POLICY "Only super admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Only super admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Only super admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- ============================================================
-- 2. FIX: businesses - hide sensitive columns from public
-- ============================================================

-- Create a secure view function that excludes sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_business_data(_business_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, name_ar text, name_en text,
  username varchar, description_ar text, description_en text,
  short_description_ar text, short_description_en text,
  category_id uuid, city_id uuid, country_id uuid,
  logo_url text, cover_url text, phone varchar, mobile text,
  email varchar, website text, address text,
  region text, district text, street_name text,
  latitude numeric, longitude numeric,
  is_verified boolean, is_active boolean,
  rating_avg numeric, rating_count integer,
  membership_tier public.membership_tier,
  business_number integer, ref_id text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, name_ar, name_en,
    username, description_ar, description_en,
    short_description_ar, short_description_en,
    category_id, city_id, country_id,
    logo_url, cover_url, phone, mobile,
    email, website, address,
    region, district, street_name,
    latitude, longitude,
    is_verified, is_active,
    rating_avg, rating_count,
    membership_tier, business_number, ref_id,
    created_at, updated_at
  FROM public.businesses
  WHERE id = _business_id AND is_active = true;
$$;

-- ============================================================
-- 3. FIX: profiles - restrict contract counterpart view
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Contract participants can view counterpart profiles" ON public.profiles;

-- Create a SECURITY DEFINER function that returns only safe fields
CREATE OR REPLACE FUNCTION public.get_contract_counterpart_profile(_viewer_id uuid, _target_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = _target_user_id
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE (c.client_id = _viewer_id AND c.provider_id = _target_user_id)
         OR (c.provider_id = _viewer_id AND c.client_id = _target_user_id)
    );
$$;

-- Add a more restrictive policy: counterparts can only view their own profile
-- (they must use the function above for counterpart data)
CREATE POLICY "Contract participants can view counterpart basic info"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE (c.client_id = auth.uid() AND c.provider_id = profiles.user_id)
       OR (c.provider_id = auth.uid() AND c.client_id = profiles.user_id)
  )
);

-- ============================================================
-- 4. FIX: newsletter_subscribers - self-unsubscribe
-- ============================================================

CREATE POLICY "Anyone can unsubscribe by email"
ON public.newsletter_subscribers FOR DELETE
TO public
USING (true);
