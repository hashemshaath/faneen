-- ============================================================
-- Partner Showcase: settings (singleton) + items
-- ============================================================

-- 1) SETTINGS TABLE (singleton — id fixed)
CREATE TABLE IF NOT EXISTS public.partner_showcase_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  title_ar text NOT NULL DEFAULT 'مواقع ذات صلة',
  title_en text NOT NULL DEFAULT 'Related Partners',
  description_ar text NOT NULL DEFAULT 'جهات وشركاء يدعمون المنظومة الصناعية والاستثمارية في المملكة.',
  description_en text NOT NULL DEFAULT 'Entities and partners supporting the industrial and investment ecosystem in the Kingdom.',
  display_mode text NOT NULL DEFAULT 'marquee' CHECK (display_mode IN ('marquee','grid','static')),
  speed integer NOT NULL DEFAULT 40 CHECK (speed >= 10 AND speed <= 200),
  direction text NOT NULL DEFAULT 'rtl' CHECK (direction IN ('ltr','rtl')),
  pause_on_hover boolean NOT NULL DEFAULT true,
  show_arrows boolean NOT NULL DEFAULT false,
  logo_size text NOT NULL DEFAULT 'md' CHECK (logo_size IN ('sm','md','lg')),
  gap_size text NOT NULL DEFAULT 'md' CHECK (gap_size IN ('sm','md','lg')),
  grayscale boolean NOT NULL DEFAULT true,
  open_in_new_tab boolean NOT NULL DEFAULT true,
  style_variant text NOT NULL DEFAULT 'default' CHECK (style_variant IN ('default','muted','bordered','glass')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_showcase_settings TO anon, authenticated;
GRANT UPDATE ON public.partner_showcase_settings TO authenticated;
GRANT ALL    ON public.partner_showcase_settings TO service_role;

ALTER TABLE public.partner_showcase_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_showcase_settings_public_read"
  ON public.partner_showcase_settings
  FOR SELECT
  USING (true);

CREATE POLICY "partner_showcase_settings_admin_update"
  ON public.partner_showcase_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "partner_showcase_settings_admin_insert"
  ON public.partner_showcase_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed one row so frontend always finds settings
INSERT INTO public.partner_showcase_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.partner_showcase_settings);


-- 2) ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.partner_showcase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'external' CHECK (source_type IN ('business','external')),
  business_id uuid NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  logo_url text NOT NULL,
  logo_image_asset_id uuid NULL,
  target_url text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate business linkage (one row per business max)
CREATE UNIQUE INDEX IF NOT EXISTS partner_showcase_items_business_unique
  ON public.partner_showcase_items(business_id)
  WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_showcase_items_active_order_idx
  ON public.partner_showcase_items(is_active, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_showcase_items TO authenticated;
GRANT SELECT ON public.partner_showcase_items TO anon;
GRANT ALL    ON public.partner_showcase_items TO service_role;

ALTER TABLE public.partner_showcase_items ENABLE ROW LEVEL SECURITY;

-- Public reads ACTIVE items only
CREATE POLICY "partner_showcase_items_public_read_active"
  ON public.partner_showcase_items
  FOR SELECT
  USING (is_active = true);

-- Admins can read all (including inactive) for management UI
CREATE POLICY "partner_showcase_items_admin_read_all"
  ON public.partner_showcase_items
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "partner_showcase_items_admin_write"
  ON public.partner_showcase_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "partner_showcase_items_admin_update"
  ON public.partner_showcase_items
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "partner_showcase_items_admin_delete"
  ON public.partner_showcase_items
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));


-- 3) updated_at triggers (reuse common function)
CREATE OR REPLACE FUNCTION public.partner_showcase_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_showcase_settings_touch ON public.partner_showcase_settings;
CREATE TRIGGER trg_partner_showcase_settings_touch
  BEFORE UPDATE ON public.partner_showcase_settings
  FOR EACH ROW EXECUTE FUNCTION public.partner_showcase_touch_updated_at();

DROP TRIGGER IF EXISTS trg_partner_showcase_items_touch ON public.partner_showcase_items;
CREATE TRIGGER trg_partner_showcase_items_touch
  BEFORE UPDATE ON public.partner_showcase_items
  FOR EACH ROW EXECUTE FUNCTION public.partner_showcase_touch_updated_at();