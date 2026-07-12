ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS region_id   uuid REFERENCES public.saudi_regions(id),
  ADD COLUMN IF NOT EXISTS city_id     uuid REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id);

CREATE INDEX IF NOT EXISTS idx_qr_region   ON public.quote_requests(region_id);
CREATE INDEX IF NOT EXISTS idx_qr_city     ON public.quote_requests(city_id);
CREATE INDEX IF NOT EXISTS idx_qr_district ON public.quote_requests(district_id);