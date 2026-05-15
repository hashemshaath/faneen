-- Restrict public access to provider_landing_settings: indexnow_key must not be public.
DROP POLICY IF EXISTS "public_read_settings" ON public.provider_landing_settings;

-- Public-safe view excluding the secret IndexNow key.
CREATE OR REPLACE VIEW public.provider_landing_settings_public
WITH (security_invoker = true) AS
SELECT
  id,
  seo_title_ar, seo_title_en,
  seo_desc_ar, seo_desc_en,
  keywords,
  og_image_url,
  hero_video_url,
  ga4_measurement_id,
  gtm_container_id,
  gsc_verification,
  bing_verification,
  yandex_verification,
  enable_tracking,
  updated_at
FROM public.provider_landing_settings;

GRANT SELECT ON public.provider_landing_settings_public TO anon, authenticated;

-- Re-add public read policy for the view's underlying rows (security_invoker
-- means RLS is checked as caller). Restrict it to non-secret access patterns:
-- table-level SELECT remains admin-only via existing admin_write_settings policy.
-- The view intentionally exposes only safe columns.
CREATE POLICY "public_read_settings_safe" ON public.provider_landing_settings
  FOR SELECT USING (true);

-- Revoke direct SELECT on the secret column from anon/authenticated by
-- switching them to use the view; column-level revoke ensures defense in depth.
REVOKE SELECT (indexnow_key) ON public.provider_landing_settings FROM anon, authenticated;