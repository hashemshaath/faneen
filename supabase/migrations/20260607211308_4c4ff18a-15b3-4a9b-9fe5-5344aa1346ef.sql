
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_image_asset_id uuid
  REFERENCES public.image_assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_cover_image_asset
  ON public.projects(cover_image_asset_id);

ALTER TABLE public.project_images
  ADD COLUMN IF NOT EXISTS image_asset_id uuid
  REFERENCES public.image_assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_project_images_asset
  ON public.project_images(image_asset_id);
