ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS short_address text,
  ADD COLUMN IF NOT EXISTS floor_number text,
  ADD COLUMN IF NOT EXISTS unit_number text,
  ADD COLUMN IF NOT EXISTS unit_type text;

COMMENT ON COLUMN public.businesses.short_address IS 'Saudi short national address code, e.g. RRRD2402';
COMMENT ON COLUMN public.businesses.floor_number  IS 'Floor number within the building';
COMMENT ON COLUMN public.businesses.unit_number   IS 'Unit / suite number';
COMMENT ON COLUMN public.businesses.unit_type     IS 'Unit type: office, showroom, apartment, villa, warehouse, other';