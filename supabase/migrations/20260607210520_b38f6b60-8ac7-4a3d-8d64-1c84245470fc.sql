
-- 1) image_assets table
CREATE TABLE IF NOT EXISTS public.image_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_path text NOT NULL,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  original_width integer,
  original_height integer,
  original_size integer,
  optimized_total_size integer,
  format text,
  alt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.image_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_assets TO authenticated;
GRANT ALL ON public.image_assets TO service_role;

ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;

-- Public read (URLs already live in public buckets; no PII)
CREATE POLICY "image_assets_public_read"
  ON public.image_assets FOR SELECT
  USING (true);

-- Owner can insert their own assets
CREATE POLICY "image_assets_owner_insert"
  ON public.image_assets FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Owner can update their own assets
CREATE POLICY "image_assets_owner_update"
  ON public.image_assets FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Owner can delete their own assets
CREATE POLICY "image_assets_owner_delete"
  ON public.image_assets FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- Admin full control
CREATE POLICY "image_assets_admin_all"
  ON public.image_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_image_assets_owner ON public.image_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_bucket ON public.image_assets(bucket);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_image_assets_updated_at ON public.image_assets;
CREATE TRIGGER trg_image_assets_updated_at
  BEFORE UPDATE ON public.image_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) link from showcase_submissions
ALTER TABLE public.showcase_submissions
  ADD COLUMN IF NOT EXISTS image_asset_id uuid REFERENCES public.image_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_showcase_submissions_image_asset
  ON public.showcase_submissions(image_asset_id);
