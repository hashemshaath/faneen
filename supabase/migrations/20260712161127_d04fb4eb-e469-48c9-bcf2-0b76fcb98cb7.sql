-- ============================================================
-- Q1.1 saudi_regions table
-- ============================================================
CREATE TABLE public.saudi_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.saudi_regions TO anon, authenticated;
GRANT ALL ON public.saudi_regions TO service_role;

ALTER TABLE public.saudi_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saudi_regions public read active"
  ON public.saudi_regions
  FOR SELECT
  USING (is_active);

CREATE POLICY "saudi_regions admin manage"
  ON public.saudi_regions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_saudi_regions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saudi_regions_updated_at
  BEFORE UPDATE ON public.saudi_regions
  FOR EACH ROW EXECUTE FUNCTION public.tg_saudi_regions_updated_at();

-- ============================================================
-- Q1.2 Seed 13 official regions
-- ============================================================
INSERT INTO public.saudi_regions (code, name_ar, name_en, sort_order) VALUES
  ('riyadh',           'منطقة الرياض',            'Riyadh',            1),
  ('makkah',           'منطقة مكة المكرمة',       'Makkah',            2),
  ('madinah',          'منطقة المدينة المنورة',   'Madinah',           3),
  ('eastern',          'المنطقة الشرقية',         'Eastern Province',  4),
  ('qassim',           'منطقة القصيم',            'Qassim',            5),
  ('asir',             'منطقة عسير',              'Asir',              6),
  ('tabuk',            'منطقة تبوك',              'Tabuk',             7),
  ('hail',             'منطقة حائل',              'Hail',              8),
  ('northern_borders', 'منطقة الحدود الشمالية',   'Northern Borders',  9),
  ('jazan',            'منطقة جازان',             'Jazan',            10),
  ('najran',           'منطقة نجران',             'Najran',           11),
  ('bahah',            'منطقة الباحة',            'Al Bahah',         12),
  ('jouf',             'منطقة الجوف',             'Al Jouf',          13);

-- ============================================================
-- Q1.3 Link cities & districts (nullable during rollout)
-- ============================================================
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.saudi_regions(id);

CREATE INDEX IF NOT EXISTS idx_cities_region
  ON public.cities(region_id) WHERE is_active;

ALTER TABLE public.districts
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.saudi_regions(id);

CREATE INDEX IF NOT EXISTS idx_districts_city
  ON public.districts(city_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_districts_region
  ON public.districts(region_id) WHERE is_active;

-- ============================================================
-- Q1.4 Backfill from existing Arabic text
-- ============================================================

-- districts.region_id: match on region_ar (already contains 'منطقة X' verbatim)
UPDATE public.districts d
   SET region_id = r.id
  FROM public.saudi_regions r
 WHERE d.region_id IS NULL
   AND (d.region_ar = r.name_ar OR d.region = r.name_en);

-- districts.city_id: match on city_ar/city_en against cities table
UPDATE public.districts d
   SET city_id = c.id
  FROM public.cities c
 WHERE d.city_id IS NULL
   AND (
     btrim(d.city_ar) = btrim(c.name_ar)
     OR (d.city_en IS NOT NULL AND lower(btrim(d.city_en)) = lower(btrim(c.name_en)))
     OR (d.city IS NOT NULL     AND lower(btrim(d.city))    = lower(btrim(c.name_en)))
   );

-- cities.region_id: propagate from the modal region of that city's districts
WITH city_region AS (
  SELECT city_id, region_id, count(*) AS n,
         row_number() OVER (PARTITION BY city_id ORDER BY count(*) DESC) AS rk
    FROM public.districts
   WHERE city_id IS NOT NULL AND region_id IS NOT NULL
   GROUP BY city_id, region_id
)
UPDATE public.cities c
   SET region_id = cr.region_id
  FROM city_region cr
 WHERE cr.rk = 1
   AND cr.city_id = c.id
   AND c.region_id IS NULL;