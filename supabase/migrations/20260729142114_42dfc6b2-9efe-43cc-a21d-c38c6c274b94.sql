-- Drop old signature (return type changed — remove category_id column)
DROP FUNCTION IF EXISTS public.get_public_business_data(uuid);

CREATE OR REPLACE FUNCTION public.get_public_business_data(_business_id uuid)
RETURNS TABLE(id uuid, user_id uuid, name_ar text, name_en text, username character varying,
  description_ar text, description_en text, short_description_ar text, short_description_en text,
  city_id uuid, country_id uuid, logo_url text, cover_url text,
  phone character varying, mobile text, email character varying, website text, address text,
  region text, district text, street_name text, latitude numeric, longitude numeric,
  is_verified boolean, is_active boolean, rating_avg numeric, rating_count integer,
  membership_tier membership_tier, business_number integer, ref_id text,
  created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT id, user_id, name_ar, name_en,
    username, description_ar, description_en,
    short_description_ar, short_description_en,
    city_id, country_id,
    logo_url, cover_url, phone, mobile,
    email, website, address,
    region, district, street_name,
    latitude, longitude,
    is_verified, is_active,
    rating_avg, rating_count,
    membership_tier, business_number, ref_id,
    created_at, updated_at
  FROM public.businesses
  WHERE id = _business_id
    AND is_active = true
    AND approval_status IN ('approved','published');
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_business_data(uuid) TO anon, authenticated;