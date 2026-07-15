DROP POLICY IF EXISTS image_assets_public_read ON public.image_assets;

CREATE POLICY image_assets_public_read ON public.image_assets
FOR SELECT
USING (
  bucket IN (
    'business-assets','portfolio-images','project-images',
    'blog-images','brand-assets','showcase'
  )
);

CREATE POLICY image_assets_owner_read ON public.image_assets
FOR SELECT
USING (owner_user_id = auth.uid());