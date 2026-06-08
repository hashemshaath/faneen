-- Master construction-equipment catalog (templates providers can adopt to publish their own rental_items)
CREATE TABLE public.rental_equipment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.rental_categories(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  -- Identification
  brand text,
  model text,
  version text,
  manufacturer_country text,
  release_year integer,
  -- Condition options the catalog supports (new, like_new, good, fair, refurbished)
  condition_options text[] NOT NULL DEFAULT ARRAY['new','like_new','good']::text[],
  -- Technical specs
  power_source text,                 -- electric | diesel | petrol | manual | hybrid | battery | hydraulic | pneumatic
  voltage_v numeric,                 -- إذا كهربائي
  amperage_a numeric,
  power_watts numeric,
  power_hp numeric,
  fuel_type text,
  fuel_capacity_l numeric,
  weight_kg numeric,
  dimensions_cm text,                -- L x W x H
  capacity text,                     -- وصف عام للسعة (مثلاً 2 طن، 5 كيلوواط)
  noise_db numeric,
  -- Pricing estimates (SAR by default; providers override in their own rental_items)
  estimated_daily_price numeric,
  estimated_weekly_price numeric,
  estimated_monthly_price numeric,
  currency text NOT NULL DEFAULT 'SAR',
  estimated_deposit numeric,
  -- Operational
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,           -- [{ar,en}]
  safety_instructions jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{ar,en}]
  certifications_required text[] NOT NULL DEFAULT ARRAY[]::text[],
  operator_required boolean NOT NULL DEFAULT false,
  license_required boolean NOT NULL DEFAULT false,
  -- Media + SEO
  image_url text,
  seo_keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  seo_description_ar text,
  seo_description_en text,
  -- Lifecycle
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rental_equipment_catalog TO anon, authenticated;
GRANT ALL    ON public.rental_equipment_catalog TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.rental_equipment_catalog TO authenticated;

ALTER TABLE public.rental_equipment_catalog ENABLE ROW LEVEL SECURITY;

-- Public can read only active catalog entries
CREATE POLICY "rec_select_active_public"
  ON public.rental_equipment_catalog FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admins can read everything
CREATE POLICY "rec_select_admin_all"
  ON public.rental_equipment_catalog FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins manage
CREATE POLICY "rec_insert_admin"
  ON public.rental_equipment_catalog FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "rec_update_admin"
  ON public.rental_equipment_catalog FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "rec_delete_admin"
  ON public.rental_equipment_catalog FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Indexes
CREATE INDEX rec_category_idx       ON public.rental_equipment_catalog(category_id);
CREATE INDEX rec_active_sort_idx    ON public.rental_equipment_catalog(is_active, sort_order);
CREATE INDEX rec_brand_idx          ON public.rental_equipment_catalog(brand);
CREATE INDEX rec_slug_idx           ON public.rental_equipment_catalog(slug);

-- updated_at trigger
CREATE TRIGGER trg_rec_updated_at
  BEFORE UPDATE ON public.rental_equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
