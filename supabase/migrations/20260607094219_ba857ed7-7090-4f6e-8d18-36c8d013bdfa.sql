-- Phase 2.7: New join table linking business_services to taxonomy_categories.
-- The legacy column business_services.category_id is preserved untouched for
-- backward reads; new UIs will write to this table instead.
CREATE TABLE IF NOT EXISTS public.business_service_taxonomy_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.business_services(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  -- Optional role on the link (e.g. 'primary' / 'secondary' / 'material').
  role TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_service_taxonomy_categories_unique
    UNIQUE (service_id, category_id, role)
);

CREATE INDEX IF NOT EXISTS idx_bstc_service_id
  ON public.business_service_taxonomy_categories (service_id);
CREATE INDEX IF NOT EXISTS idx_bstc_category_id
  ON public.business_service_taxonomy_categories (category_id);

GRANT SELECT ON public.business_service_taxonomy_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_service_taxonomy_categories TO authenticated;
GRANT ALL ON public.business_service_taxonomy_categories TO service_role;

ALTER TABLE public.business_service_taxonomy_categories ENABLE ROW LEVEL SECURITY;

-- Public can read links for active, published, non-demo, non-archived services.
CREATE POLICY "Public can read links for visible services"
  ON public.business_service_taxonomy_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_services bs
      JOIN public.businesses b ON b.id = bs.business_id
      WHERE bs.id = business_service_taxonomy_categories.service_id
        AND bs.is_active = true
        AND b.is_active = true
        AND b.approval_status = 'published'
        AND b.is_demo = false
    )
  );

-- Business owners (and staff) can manage links for services they own.
CREATE POLICY "Owners can manage links for own services"
  ON public.business_service_taxonomy_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_services bs
      JOIN public.businesses b ON b.id = bs.business_id
      WHERE bs.id = business_service_taxonomy_categories.service_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_services bs
      JOIN public.businesses b ON b.id = bs.business_id
      WHERE bs.id = business_service_taxonomy_categories.service_id
        AND b.user_id = auth.uid()
    )
  );

-- Admin full access via existing has_role helper.
CREATE POLICY "Admins manage all service-taxonomy links"
  ON public.business_service_taxonomy_categories
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bstc_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bstc_set_updated_at
  BEFORE UPDATE ON public.business_service_taxonomy_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.bstc_set_updated_at();
