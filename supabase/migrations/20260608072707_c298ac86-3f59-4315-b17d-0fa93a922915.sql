-- image_assets: restrict owner_user_id to service_role / admins only
REVOKE SELECT ON public.image_assets FROM anon, authenticated;
GRANT SELECT (
  id, bucket, original_path, variants,
  original_width, original_height, original_size, optimized_total_size,
  format, alt, created_at, updated_at
) ON public.image_assets TO anon, authenticated;

-- provider_landing_settings: defense-in-depth column revoke for indexnow_key
REVOKE SELECT (indexnow_key) ON public.provider_landing_settings FROM anon, authenticated;