
CREATE TABLE public.images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider_id uuid,
  url_thumbnail text NOT NULL,
  url_medium text NOT NULL,
  url_large text NOT NULL,
  original_name text,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.images TO authenticated;
GRANT ALL ON public.images TO service_role;

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to images"
  ON public.images FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert their images"
  ON public.images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their images"
  ON public.images FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their images"
  ON public.images FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX idx_images_provider_id ON public.images(provider_id);
CREATE INDEX idx_images_owner_id ON public.images(owner_id);
