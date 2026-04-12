
-- 1. Create a secure view for public business access (hides sensitive fields)
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT
  id, business_number, name_ar, name_en, username, ref_id,
  category_id, city_id, country_id,
  description_ar, description_en, short_description_ar, short_description_en,
  logo_url, cover_url, address, district, region, street_name,
  latitude, longitude, website,
  rating_avg, rating_count, membership_tier,
  is_active, is_verified, created_at, updated_at
FROM public.businesses
WHERE is_active = true;

-- 2. Create a secure view for public branch access (hides sensitive fields)
CREATE OR REPLACE VIEW public.business_branches_public AS
SELECT
  id, business_id, name_ar, name_en,
  address, district, region, street_name,
  latitude, longitude, website,
  is_active, is_main, sort_order, created_at
FROM public.business_branches
WHERE is_active = true;

-- 3. Fix newsletter_subscribers "Anyone can unsubscribe" policy
-- Drop the overly permissive policy and replace with email-scoped one
DROP POLICY IF EXISTS "Anyone can unsubscribe" ON public.newsletter_subscribers;

CREATE POLICY "Subscriber can unsubscribe themselves"
  ON public.newsletter_subscribers
  FOR UPDATE
  TO public
  USING (lower(email) = lower(current_setting('request.headers', true)::json->>'x-subscriber-email'))
  WITH CHECK (is_active = false);

-- 4. Add a safer unsubscribe: allow update only if matching by email in the filter
-- Alternative approach: allow unsubscribe via RPC function instead
CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.newsletter_subscribers
  SET is_active = false, unsubscribed_at = now()
  WHERE lower(email) = lower(p_email) AND is_active = true;
  RETURN FOUND;
END;
$$;
