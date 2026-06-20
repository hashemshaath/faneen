-- RFQ location-first columns
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS region text NULL,
  ADD COLUMN IF NOT EXISTS site_id uuid NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid NULL,
  ADD COLUMN IF NOT EXISTS no_location_selected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_precision text NULL;

-- FKs (ON DELETE SET NULL; RLS unchanged)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_requests_site_id_fkey'
  ) THEN
    ALTER TABLE public.quote_requests
      ADD CONSTRAINT quote_requests_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.client_sites(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_requests_project_id_fkey'
  ) THEN
    ALTER TABLE public.quote_requests
      ADD CONSTRAINT quote_requests_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_requests_location_precision_check'
  ) THEN
    ALTER TABLE public.quote_requests
      ADD CONSTRAINT quote_requests_location_precision_check
      CHECK (location_precision IS NULL OR location_precision IN ('district','city','region','unspecified'));
  END IF;
END $$;

-- Lightweight matching indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_city ON public.quote_requests (city);
CREATE INDEX IF NOT EXISTS idx_quote_requests_district ON public.quote_requests (district);
CREATE INDEX IF NOT EXISTS idx_quote_requests_region ON public.quote_requests (region);
CREATE INDEX IF NOT EXISTS idx_quote_requests_city_district ON public.quote_requests (city, district);
CREATE INDEX IF NOT EXISTS idx_quote_requests_site_id ON public.quote_requests (site_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_project_id ON public.quote_requests (project_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_no_location_selected ON public.quote_requests (no_location_selected);
