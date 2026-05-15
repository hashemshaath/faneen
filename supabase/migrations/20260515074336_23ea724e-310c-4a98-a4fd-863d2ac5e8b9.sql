-- 1) last_active_at on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_last_active_at
  ON public.businesses(last_active_at DESC NULLS LAST);

-- 2) business_service_areas
CREATE TABLE IF NOT EXISTS public.business_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  city text NOT NULL,
  district text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_service_areas_unique
    UNIQUE NULLS NOT DISTINCT (business_id, city, district)
);

CREATE INDEX IF NOT EXISTS idx_bsa_business_id ON public.business_service_areas(business_id);
CREATE INDEX IF NOT EXISTS idx_bsa_city ON public.business_service_areas(city);

ALTER TABLE public.business_service_areas ENABLE ROW LEVEL SECURITY;

-- Public read (used for matching/discovery; non-sensitive)
DROP POLICY IF EXISTS "service_areas_public_read" ON public.business_service_areas;
CREATE POLICY "service_areas_public_read"
  ON public.business_service_areas
  FOR SELECT
  USING (true);

-- Owner write
DROP POLICY IF EXISTS "service_areas_owner_insert" ON public.business_service_areas;
CREATE POLICY "service_areas_owner_insert"
  ON public.business_service_areas
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
    OR public.has_admin_access(auth.uid())
  );

DROP POLICY IF EXISTS "service_areas_owner_update" ON public.business_service_areas;
CREATE POLICY "service_areas_owner_update"
  ON public.business_service_areas
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
    OR public.has_admin_access(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
    OR public.has_admin_access(auth.uid())
  );

DROP POLICY IF EXISTS "service_areas_owner_delete" ON public.business_service_areas;
CREATE POLICY "service_areas_owner_delete"
  ON public.business_service_areas
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
    OR public.has_admin_access(auth.uid())
  );

-- Updated_at trigger (reuse existing fn if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_bsa_updated_at ON public.business_service_areas';
    EXECUTE 'CREATE TRIGGER trg_bsa_updated_at BEFORE UPDATE ON public.business_service_areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END$$;

-- Backfill primary service area from business.city (best-effort)
INSERT INTO public.business_service_areas (business_id, city, district, is_primary)
SELECT b.id,
       COALESCE(c.name_ar, c.name_en) AS city,
       NULLIF(b.district, ''),
       true
FROM public.businesses b
LEFT JOIN public.cities c ON c.id = b.city_id
WHERE c.id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) RPC: touch_business_last_active (throttled by client; SECURITY DEFINER ensures owner-only)
CREATE OR REPLACE FUNCTION public.touch_business_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.businesses
     SET last_active_at = now()
   WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_business_last_active() TO authenticated;
