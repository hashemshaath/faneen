-- Clean up 1 orphan row referencing a deleted business (blocks Q2.1)
DELETE FROM public.business_service_areas
 WHERE business_id NOT IN (SELECT id FROM public.businesses);

-- ============================================================
-- Q2.1 Structured coverage columns
-- ============================================================
ALTER TABLE public.business_service_areas
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.business_branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.saudi_regions(id),
  ADD COLUMN IF NOT EXISTS district_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_bsa_city     ON public.business_service_areas(city_id);
CREATE INDEX IF NOT EXISTS idx_bsa_region   ON public.business_service_areas(region_id);
CREATE INDEX IF NOT EXISTS idx_bsa_business ON public.business_service_areas(business_id);
CREATE INDEX IF NOT EXISTS idx_bsa_branch   ON public.business_service_areas(branch_id);
CREATE INDEX IF NOT EXISTS idx_bsa_district_gin
  ON public.business_service_areas USING gin(district_ids);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bsa_unique_coverage
  ON public.business_service_areas(
    business_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    city_id
  )
  WHERE city_id IS NOT NULL;

-- ============================================================
-- Q2.2 Backfill remaining row(s) from Arabic text
-- ============================================================
UPDATE public.business_service_areas b
   SET city_id   = c.id,
       region_id = c.region_id
  FROM public.cities c
 WHERE b.city_id IS NULL
   AND b.city IS NOT NULL
   AND (btrim(b.city) = btrim(c.name_ar)
        OR lower(btrim(b.city)) = lower(btrim(coalesce(c.name_en, ''))));

UPDATE public.business_service_areas b
   SET district_ids = ARRAY[d.id]
  FROM public.districts d
 WHERE b.district IS NOT NULL
   AND b.city_id IS NOT NULL
   AND d.city_id = b.city_id
   AND (array_length(b.district_ids, 1) IS NULL OR array_length(b.district_ids, 1) = 0)
   AND btrim(d.district_ar) = btrim(b.district);