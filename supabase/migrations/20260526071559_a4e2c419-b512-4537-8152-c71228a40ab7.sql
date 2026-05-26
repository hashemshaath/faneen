CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE (
  username text,
  full_name text,
  full_name_ar text,
  full_name_en text,
  avatar_url text,
  membership_tier text,
  is_verified boolean,
  account_type text,
  region_name text,
  city_name_ar text,
  city_name_en text,
  country_name_ar text,
  country_name_en text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.username::text,
    p.full_name,
    p.full_name_ar,
    p.full_name_en,
    p.avatar_url,
    p.membership_tier::text,
    p.is_verified,
    p.account_type::text,
    p.region_name,
    c.name_ar AS city_name_ar,
    c.name_en AS city_name_en,
    co.name_ar AS country_name_ar,
    co.name_en AS country_name_en,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.cities c ON c.id = p.city_id
  LEFT JOIN public.countries co ON co.id = p.country_id
  WHERE p.username IS NOT NULL
    AND lower(p.username::text) = lower(_username)
    AND p.is_banned = false
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
