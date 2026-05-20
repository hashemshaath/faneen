CREATE TABLE IF NOT EXISTS public.location_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_ar text,
  region_en text,
  city_ar text NOT NULL,
  city_en text NOT NULL,
  district_ar text,
  district_en text,
  slug text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS location_catalog_unique
  ON public.location_catalog (city_en, COALESCE(district_en, ''));
CREATE INDEX IF NOT EXISTS idx_location_catalog_active ON public.location_catalog (is_active);
CREATE INDEX IF NOT EXISTS idx_location_catalog_city_ar ON public.location_catalog (city_ar);

ALTER TABLE public.location_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_catalog_public_read"
  ON public.location_catalog FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "location_catalog_admin_insert"
  ON public.location_catalog FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "location_catalog_admin_update"
  ON public.location_catalog FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "location_catalog_admin_delete"
  ON public.location_catalog FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_location_catalog_updated_at
BEFORE UPDATE ON public.location_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed major Saudi cities
INSERT INTO public.location_catalog (city_ar, city_en, slug, sort_order) VALUES
  ('الرياض', 'Riyadh', 'riyadh', 1),
  ('جدة', 'Jeddah', 'jeddah', 2),
  ('مكة المكرمة', 'Makkah', 'makkah', 3),
  ('المدينة المنورة', 'Madinah', 'madinah', 4),
  ('الدمام', 'Dammam', 'dammam', 5),
  ('الخبر', 'Khobar', 'khobar', 6),
  ('الطائف', 'Taif', 'taif', 7),
  ('بريدة', 'Buraidah', 'buraidah', 8),
  ('تبوك', 'Tabuk', 'tabuk', 9),
  ('أبها', 'Abha', 'abha', 10),
  ('خميس مشيط', 'Khamis Mushait', 'khamis-mushait', 11),
  ('حائل', 'Hail', 'hail', 12),
  ('جازان', 'Jazan', 'jazan', 13),
  ('نجران', 'Najran', 'najran', 14)
ON CONFLICT DO NOTHING;