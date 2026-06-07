-- Fix: Prevent public exposure of image_assets.owner_user_id
-- The image_assets_public_read policy allows anyone to SELECT rows, which
-- leaked the owner's auth.users UUID. Revoke column-level SELECT on
-- owner_user_id from anon (and authenticated, since clients never read it —
-- all usages are INSERT only). Service role keeps full access for admin/ops.

REVOKE SELECT (owner_user_id) ON public.image_assets FROM anon;
REVOKE SELECT (owner_user_id) ON public.image_assets FROM authenticated;

-- Re-grant SELECT on the remaining columns explicitly so anon/authenticated
-- can still read everything they need for public image display.
GRANT SELECT (
  id, bucket, original_path, variants,
  original_width, original_height, original_size,
  optimized_total_size, format, alt, created_at, updated_at
) ON public.image_assets TO anon;

GRANT SELECT (
  id, bucket, original_path, variants,
  original_width, original_height, original_size,
  optimized_total_size, format, alt, created_at, updated_at
) ON public.image_assets TO authenticated;
